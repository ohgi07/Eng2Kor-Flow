// Eng2Kor Flow — 입력 감지·교체·복원 (콘텐츠 스크립트). manifest에서 words.js, hangul.js 다음에 로드된다.
(() => {
  'use strict';

  const { convert, extractToken } = Eng2Kor;

  const DEFAULTS = { enabled: true, disabledSites: [] };
  const TRIGGERS = new Set([' ', 'Enter', '.', ',', '!', '?', ';', ':', ')', ']', '}', "'", '"', '~']);
  const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
  const TEXT_TYPES = new Set(['text', 'search']);
  const CODE_EDITORS = '.cm-editor, .CodeMirror, .monaco-editor, .ace_editor';
  // 긴급 차단 목록. 구글 문서는 키 입력 추적 모드 스파이크를 통과하기 전까지 막는다.
  const UNSUPPORTED_HOSTS = new Set(['docs.google.com']);

  const settings = { ...DEFAULTS, loaded: false };
  const skip = new Set(); // 이 페이지에서 되돌린 토큰 (저장하지 않음)
  const chain = new WeakMap(); // 편집 루트 → 직전 단어를 이 확장이 변환했는가
  const wasPassword = new WeakSet(); // 한 번이라도 type=password였던 요소
  let composing = false;
  let record = null; // 마지막 변환 (복원용, 스펙 4.6)
  let pendingBlock = null; // block 복원 사후 검사 대기

  // ── 사이트와 설정 ──
  const isTop = window.top === window;
  const topHost = (() => {
    if (isTop) return location.hostname;
    const origins = location.ancestorOrigins;
    if (!origins?.length) return '';
    try {
      return new URL(origins[origins.length - 1]).hostname;
    } catch {
      return '';
    }
  })();

  const loadSettings = () =>
    chrome.storage.sync.get(DEFAULTS, (values) => Object.assign(settings, values, { loaded: true }));
  loadSettings();
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'sync') loadSettings();
  });

  if (isTop) {
    chrome.runtime.onMessage.addListener((message, _sender, reply) => {
      if (message?.type === 'eng2kor:host') reply({ host: topHost, supported: !!topHost && !UNSUPPORTED_HOSTS.has(topHost) });
    });
  }

  const siteActive = () =>
    settings.loaded && settings.enabled && !!topHost &&
    !settings.disabledSites.includes(topHost) && !UNSUPPORTED_HOSTS.has(topHost);

  // ── 비밀번호와 제외 대상 (스펙 4.4, 4.5) ──
  new MutationObserver((mutations) => {
    for (const m of mutations) if (m.oldValue?.toLowerCase() === 'password') wasPassword.add(m.target);
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['type'], attributeOldValue: true });

  function isPasswordLike(el) {
    if (el.localName === 'input' && el.type === 'password') return true;
    if (wasPassword.has(el)) return true;
    if (/current-password|new-password|one-time-code/i.test(el.getAttribute('autocomplete') ?? '')) return true;
    const security = getComputedStyle(el).webkitTextSecurity;
    if (security && security !== 'none') return true;
    return /pass|pwd/i.test(`${el.getAttribute('name') ?? ''} ${el.id}`);
  }

  function isExcluded(el) {
    if (el.localName === 'input' && !TEXT_TYPES.has(el.type)) return true;
    if (el.readOnly || el.disabled) return true;
    return el.closest(CODE_EDITORS) !== null;
  }

  // ── 편집 대상 (스펙 4.3) ──
  const isField = (el) => el.localName === 'input' || el.localName === 'textarea';
  const norm = (text) => text.replace(/\u00a0/g, ' ');

  function rootFrom(node) {
    let el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!el) return null;
    if (isField(el)) return el;
    if (!el.isContentEditable) return null;
    while (el.parentElement?.isContentEditable) el = el.parentElement;
    return el;
  }

  // input/textarea: 커서 앞뒤 읽기
  function readField(el) {
    if (el.selectionStart == null || el.selectionStart !== el.selectionEnd) return null;
    const caret = el.selectionEnd;
    return { before: el.value.slice(0, caret), next: el.value.charAt(caret), prevOutside: '' };
  }

  // input/textarea: 커서 바로 앞 len글자를 text로 바꾼다. 실패하면 커서를 원래대로 돌린다.
  function replaceInField(el, len, text) {
    const caret = el.selectionEnd;
    const start = caret - len;
    const original = el.value;
    const expected = original.slice(0, start) + text + original.slice(caret);
    el.setSelectionRange(start, caret);
    document.execCommand('insertText', false, text);
    if (el.value === expected) return 'ok';
    if (el.value !== original) return 'unexpected';
    el.setRangeText(text, start, caret, 'end');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    if (el.value === expected) return 'ok';
    if (el.value !== original) return 'unexpected';
    el.setSelectionRange(caret, caret);
    return 'unchanged';
  }

  function selectionOf(root) {
    const scope = root.getRootNode();
    return typeof scope.getSelection === 'function' ? scope.getSelection() : document.getSelection();
  }

  // contenteditable: 커서가 있는 텍스트 노드 안에서만 읽는다
  function readEditable(root) {
    const sel = selectionOf(root);
    if (!sel?.rangeCount || !sel.isCollapsed) return null;
    const node = sel.focusNode;
    if (node?.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
    const offset = sel.focusOffset;
    return { node, offset, before: node.data.slice(0, offset), next: node.data.charAt(offset), prevOutside: '' };
  }

  function blockOf(node, root) {
    for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
      const display = getComputedStyle(el).display;
      if (!display.startsWith('inline') && display !== 'contents') return el;
    }
    return root;
  }

  // 편집 영역 안에서 node 앞(forward면 뒤)의 가장 가까운 글자. 문단·줄바꿈 경계는 공백으로 본다.
  function adjacentChar(root, node, forward) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    walker.currentNode = node;
    const block = blockOf(node, root);
    const step = () => (forward ? walker.nextNode() : walker.previousNode());
    for (let n = step(); n; n = step()) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.localName === 'br' || n.localName === 'img') return ' ';
        continue;
      }
      if (blockOf(n, root) !== block) return ' ';
      if (n.data) return forward ? n.data[0] : n.data[n.data.length - 1];
    }
    return '';
  }

  // contenteditable: 커서 바로 앞 len글자를 text로 바꾼다. 실패하면 커서를 원래대로 돌린다.
  function replaceInEditable(root, point, len, text) {
    const sel = selectionOf(root);
    const { node, offset } = point;
    const original = node.data;
    const range = document.createRange();
    range.setStart(node, offset - len);
    range.setEnd(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, text);
    if (node.isConnected && node.data === original) {
      sel.collapse(node, offset);
      return 'unchanged';
    }
    const after = readEditable(root);
    return after && norm(after.before).endsWith(text) ? 'ok' : 'unexpected';
  }

  function readPoint(root) {
    if (isField(root)) return readField(root);
    const point = readEditable(root);
    if (!point) return null;
    if (point.offset === point.node.data.length) point.next = adjacentChar(root, point.node, true);
    if (/^[A-Za-z]+$/.test(point.before)) point.prevOutside = adjacentChar(root, point.node, false);
    return point;
  }

  function replaceBeforeCaret(root, point, len, text) {
    return isField(root) ? replaceInField(root, len, text) : replaceInEditable(root, point, len, text);
  }

  // ── 변환 ──
  function convertAtCaret(e, root) {
    const point = readPoint(root);
    if (!point) return;
    const hit = extractToken(point.before, point.next, point.prevOutside);
    if (!hit) {
      if (/[A-Za-z]$/.test(point.before)) chain.set(root, false);
      return;
    }
    const hangul = convert(hit.token, { chain: chain.get(root) === true, skip });
    const outcome = hangul ? replaceBeforeCaret(root, point, hit.token.length, hangul) : null;
    chain.set(root, outcome === 'ok');
    if (outcome !== 'ok') return;
    // input의 Enter는 전송·실행으로 보고 복원 기록을 남기지 않는다
    const kind = e.key !== 'Enter' ? 'char' : root.localName === 'textarea' ? 'newline' : isField(root) ? null : 'block';
    if (!kind) return;
    const trigger = kind === 'char' ? e.key : kind === 'newline' ? '\n' : '';
    record = { root, original: hit.token, converted: hangul, kind, tail: hangul + trigger };
  }

  // ── 복원 (스펙 4.6) ──
  const readCaret = (root) => (isField(root) ? readField(root) : readEditable(root));

  // char, newline: 커서 앞이 "변환 결과 + 트리거"면 한 번에 원문으로 되돌린다
  function revert(e, last) {
    if (isPasswordLike(last.root)) return;
    if (last.kind === 'block') {
      armBlockRevert(last);
      return;
    }
    const point = readCaret(last.root);
    if (!point || !norm(point.before).endsWith(last.tail)) return;
    e.preventDefault();
    finishRevert(last, replaceBeforeCaret(last.root, point, last.tail.length, last.original));
  }

  function finishRevert(last, outcome) {
    if (outcome !== 'ok') return;
    skip.add(last.original);
    chain.set(last.root, false);
  }

  // block: 편집기가 문단 경계를 지운 뒤, 커서가 변환 결과 바로 뒤로 왔을 때만 되돌린다
  function armBlockRevert(last) {
    const { root } = last;
    const pre = readEditable(root);
    if (pre && norm(pre.before).endsWith(last.converted)) return; // 이미 변환 결과 뒤(전송 후 남은 경우 등)
    const state = {};
    const check = () => {
      if (pendingBlock !== state) return;
      pendingBlock = null;
      clearTimeout(state.timer);
      if (isPasswordLike(root)) return;
      const post = readEditable(root);
      if (!post || !norm(post.before).endsWith(last.converted)) return;
      finishRevert(last, replaceInEditable(root, post, last.converted.length, last.original));
    };
    pendingBlock = state;
    state.timer = setTimeout(check, 100);
    root.addEventListener('input', () => setTimeout(check, 0), { capture: true, once: true });
  }

  // ── 이벤트 ──
  function onKeyDown(e) {
    if (!e.isTrusted) return;
    if (pendingBlock) {
      clearTimeout(pendingBlock.timer);
      pendingBlock = null;
    }
    const last = record;
    record = null;
    const root = rootFrom(e.composedPath()[0]);
    if (!root) return;
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    if (last?.root === root && e.key === 'Backspace' && plain && !e.repeat && !e.isComposing) {
      revert(e, last);
      return;
    }
    if (!plain || NAV_KEYS.has(e.key)) {
      chain.set(root, false);
      return;
    }
    if (!TRIGGERS.has(e.key) || e.repeat || e.isComposing || e.keyCode === 229 || composing) return;
    if (!siteActive() || isPasswordLike(root) || isExcluded(root)) return;
    if (e.key === 'Enter' && root.getAttribute('aria-activedescendant')) return;
    convertAtCaret(e, root);
  }

  function resetFrom(e) {
    record = null;
    const root = rootFrom(e.composedPath()[0]);
    if (root) chain.set(root, false);
  }

  addEventListener('keydown', onKeyDown, true);
  addEventListener('mousedown', resetFrom, true);
  addEventListener('focusin', resetFrom, true);
  addEventListener('paste', resetFrom, true);
  addEventListener('compositionstart', (e) => {
    composing = true;
    resetFrom(e);
  }, true);
  addEventListener('compositionend', () => {
    composing = false;
  }, true);
})();
