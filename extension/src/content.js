// 입력 감지·교체·복원·미리보기. manifest에서 words.js, hangul.js, preview.js 다음에 로드된다.
(() => {
  'use strict';

  const { convert, preview, extractToken } = Eng2Kor;
  const bubble = Eng2KorPreview;

  const DEFAULTS = { enabled: true, disabledSites: [], preview: true };
  const TRIGGERS = new Set([' ', 'Enter', '.', ',', '!', '?', ';', ':', ')', ']', '}', "'", '"', '~']);
  const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
  // 혼자서는 글자도 커서도 바꾸지 않는 키. 괄호·물음표를 칠 때마다 누르는 Shift도 여기에 든다.
  const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock']);
  const TYPING_GRACE = 300; // 늦게 그리는 편집기의 selectionchange도 타이핑으로 본다.
  const SETTLE_TRIES = 6; // 합성 beforeinput을 받은 편집기가 다시 그렸는지 볼 횟수 (지금 한 번 + 마이크로태스크마다 한 번)
  const TEXT_TYPES = new Set(['text', 'search']);
  const CODE_EDITORS = '.cm-editor, .CodeMirror, .monaco-editor, .ace_editor';
  // 구글 문서는 DOM에서 글자를 읽을 수 없어 키 입력 추적 방식을 만들기 전까지 막는다.
  const UNSUPPORTED_HOSTS = new Set(['docs.google.com']);
  // manifest의 monaco.js 대상과 같아야 한다.
  const MONACO_HOSTS = new Set(['colab.research.google.com']);
  const monacoHost = MONACO_HOSTS.has(location.hostname);

  const settings = { ...DEFAULTS, loaded: false };
  // 되돌린 단어 { root, token, at: 단어 끝 위치 }는 그 자리에서 다시 바꾸지 않는다.
  let kept = null;
  const chain = new WeakMap(); // 편집 루트 → 직전 단어를 이 확장이 변환했는가
  const wasPassword = new WeakSet(); // 한 번이라도 type=password였던 요소
  let composing = false;
  let record = null; // 마지막 변환 (복원용)
  let pendingBlock = null; // block 복원 사후 검사 대기
  let previewFrame = 0; // 예약된 requestAnimationFrame
  let previewRoot = null; // 말풍선을 띄운 편집 루트. null이면 숨긴 상태
  let previewSerial = 0; // 편집 루트가 바뀔 때마다 늘린다 (말풍선 위/아래 유지 키)
  let typedAt = -Infinity; // 마지막 타이핑 시각

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
    chrome.storage.sync.get(DEFAULTS, (values) => {
      Object.assign(settings, values, { loaded: true });
      schedulePreview(false);
    });
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

  // ── 비밀번호와 제외 대상 ──
  new MutationObserver((mutations) => {
    for (const m of mutations) if (m.oldValue?.toLowerCase() === 'password') wasPassword.add(m.target);
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['type'], attributeOldValue: true });

  function isPasswordLike(el, style) {
    if (el.localName === 'input' && el.type === 'password') return true;
    if (wasPassword.has(el)) return true;
    if (/current-password|new-password|one-time-code/i.test(el.getAttribute('autocomplete') ?? '')) return true;
    if (/pass|pwd/i.test(`${el.getAttribute('name') ?? ''} ${el.id}`)) return true;
    const security = (style ?? getComputedStyle(el)).webkitTextSecurity;
    return !!security && security !== 'none';
  }

  function isExcluded(el) {
    if (isMonaco(el)) return false;
    if (el.localName === 'input' && !TEXT_TYPES.has(el.type)) return true;
    if (el.readOnly || el.disabled) return true;
    return el.closest(CODE_EDITORS) !== null;
  }

  // ── 편집 대상 ──
  const isField = (el) => el.localName === 'input' || el.localName === 'textarea';
  const isMonaco = (el) => monacoHost && el.classList.contains('monaco-editor');
  const norm = (text) => text.replace(/\u00a0/g, ' ');

  function rootFrom(node) {
    let el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!el) return null;
    const editor = monacoHost ? el.closest('.monaco-editor') : null;
    if (editor) return editor;
    if (isField(el)) return el;
    if (!el.isContentEditable) return null;
    while (el.parentElement?.isContentEditable) el = el.parentElement;
    return el;
  }

  function readField(el) {
    const caret = el.selectionEnd;
    if (caret == null || el.selectionStart !== caret) return null;
    const value = el.value;
    return { before: value.slice(0, caret), next: value.charAt(caret), prevOutside: '' };
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

  function reflects(root, text) {
    const after = readEditable(root);
    return !!after && norm(after.before).endsWith(text);
  }

  // Slate 등은 beforeinput으로 모델을 갱신한다. 취소되지 않았을 때만 execCommand를 쓴다.
  // 취소는 편집기가 이벤트를 가져갔다는 뜻일 뿐이므로 커서 앞 글자로 반영을 확인하고, 결과는 done으로 알린다.
  // 반영되지 않았으면 단어를 고른 선택을 커서로 되돌린다. 남겨 두면 뒤따르는 트리거 글자가 단어를 덮어쓴다.
  function replaceInEditable(root, point, len, text, done) {
    const sel = selectionOf(root);
    const { node, offset } = point;
    const original = node.data;
    const settle = () => {
      if (reflects(root, text)) return done('ok');
      if (sel.rangeCount && !sel.isCollapsed) sel.collapseToEnd();
      done(node.isConnected && node.data === original ? 'unchanged' : 'unexpected');
    };
    const range = document.createRange();
    range.setStart(node, offset - len);
    range.setEnd(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);
    const handled = !node.parentElement.dispatchEvent(new InputEvent('beforeinput', {
      inputType: 'insertText', data: text, bubbles: true, cancelable: true, composed: true,
      targetRanges: [new StaticRange({ startContainer: node, startOffset: offset - len, endContainer: node, endOffset: offset })],
    }));
    if (handled) {
      // 모델만 바꾸고 마이크로태스크에서 그리는 편집기를 기다린다. React 위 Slate는 onChange와 렌더링이 각각 한 번씩 미뤄진다.
      // 마이크로태스크는 이 리스너가 끝나자마자 모두 돌고, 트리거 글자는 그 뒤에 들어간다.
      let tries = SETTLE_TRIES;
      const wait = () => {
        if (--tries === 0) settle();
        else if (reflects(root, text)) done('ok');
        else queueMicrotask(wait);
      };
      wait();
      return;
    }
    // 합성 beforeinput을 무시하는 Slate(slate-react 0.128~0.132)는 DOM을 직접 고치면 모델과 어긋난다
    if (root.hasAttribute('data-slate-editor')) {
      sel.collapse(node, offset);
      done('unchanged');
      return;
    }
    document.execCommand('insertText', false, text);
    settle();
  }

  // Monaco MAIN world와 동기 이벤트로 통신한다. detail은 JSON 문자열이다.
  let monacoReply = null;
  if (monacoHost) document.addEventListener('eng2kor:monaco-reply', (e) => { monacoReply = e.detail; });

  function callMonaco(request) {
    monacoReply = null;
    document.dispatchEvent(new CustomEvent('eng2kor:monaco', { detail: JSON.stringify(request) }));
    try {
      return typeof monacoReply === 'string' ? JSON.parse(monacoReply) : null;
    } catch {
      return null;
    }
  }

  // 텍스트 셀은 전체, 코드 셀은 주석(1)·문자열(2) 안에서만 읽는다. 자동완성 목록이 떠 있으면 건드리지 않는다.
  function readMonaco() {
    if (document.querySelector('.suggest-widget.visible')) return null;
    const res = callMonaco({ op: 'read' });
    if (!res || (res.language !== 'markdown' && res.tokenType !== 1 && res.tokenType !== 2)) return null;
    return { before: res.before, next: res.next, prevOutside: '' };
  }

  function readPoint(root) {
    if (isMonaco(root)) return readMonaco();
    if (isField(root)) return readField(root);
    const point = readEditable(root);
    if (!point) return null;
    if (point.offset === point.node.data.length) point.next = adjacentChar(root, point.node, true);
    if (/^[\d.,]*[A-Za-z]+$/.test(point.before)) point.prevOutside = adjacentChar(root, point.node, false);
    return point;
  }

  // 결과('ok' | 'unchanged' | 'unexpected')는 done으로 알린다. contenteditable은 마이크로태스크에서 알릴 수 있다.
  function replaceBeforeCaret(root, point, len, text, done) {
    if (isMonaco(root)) done(callMonaco({ op: 'edit', len, text, expected: point.before.slice(-len) }) ?? 'unchanged');
    else if (isField(root)) done(replaceInField(root, len, text));
    else replaceInEditable(root, point, len, text, done);
  }

  // ── 변환 ──
  const atKept = (root, hit, point) =>
    kept?.root === root && kept.token === hit.token && kept.at === point.before.length;

  function convertAtCaret(e, root) {
    const point = readPoint(root);
    if (!point) return;
    const hit = extractToken(point.before, point.next, point.prevOutside);
    if (hit && atKept(root, hit, point)) {
      chain.set(root, false);
      return;
    }
    kept = null;
    if (!hit) {
      if (/[A-Za-z]$/.test(point.before)) chain.set(root, false);
      return;
    }
    const hangul = convert(hit.token, { chain: chain.get(root) === true, number: hit.number });
    if (!hangul) {
      chain.set(root, false);
      return;
    }
    // input의 Enter는 전송·실행으로, Monaco의 Enter는 자동 들여쓰기·셀 실행이 섞이므로 복원 기록을 남기지 않는다
    const kind = e.key === ' ' ? 'space'
      : e.key !== 'Enter' ? 'char'
      : root.localName === 'textarea' ? 'newline'
      : isField(root) || isMonaco(root) ? null : 'block';
    const trigger = kind === 'newline' ? '\n' : kind === 'block' ? '' : e.key;
    replaceBeforeCaret(root, point, hit.token.length, hangul, (outcome) => {
      chain.set(root, outcome === 'ok');
      if (outcome === 'ok' && kind) record = { root, original: hit.token, converted: hangul, kind, tail: hangul + trigger };
    });
  }

  // ── 미리보기 ──
  function activeRoot() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el ? rootFrom(el) : null;
  }

  function previewAt(root) {
    if (!settings.preview || !siteActive() || composing) return null;
    if (isExcluded(root)) return null;
    const style = getComputedStyle(root);
    if (isPasswordLike(root, style)) return null;
    const point = readPoint(root);
    const hit = point && extractToken(point.before, point.next, point.prevOutside);
    if (!hit || atKept(root, hit, point)) return null;
    const result = preview(hit.token, { chain: chain.get(root) === true, number: hit.number });
    if (!result) return null;
    const end = point.before.length;
    const anchors = isMonaco(root) ? callMonaco({ op: 'rect', len: hit.token.length })
      : isField(root) ? bubble.fieldAnchors(root, hit.start, end, style)
      : bubble.rangeAnchors(point.node, hit.start, end);
    const anchor = bubble.pickAnchor(root, anchors, style);
    return anchor && { anchor, result, start: hit.start };
  }

  function updatePreview() {
    const root = activeRoot();
    const shown = root && previewAt(root);
    if (!shown) {
      hidePreview();
      return;
    }
    if (root !== previewRoot) {
      bubble.hide(); // 다시 띄워 top layer 맨 위로 올린다
      previewSerial += 1;
    }
    previewRoot = root;
    bubble.show(shown.anchor, shown.result, `${previewSerial}:${shown.start}`);
  }

  // typing이면 숨겨져 있어도 다시 판정하고, 아니면 보이는 중일 때만 위치를 다시 맞춘다. 한 프레임에 한 번
  function schedulePreview(typing) {
    if ((!typing && !previewRoot) || previewFrame) return;
    previewFrame = requestAnimationFrame(() => {
      previewFrame = 0;
      updatePreview();
    });
  }

  function hidePreview() {
    cancelAnimationFrame(previewFrame);
    previewFrame = 0;
    previewRoot = null;
    bubble.hide();
  }

  function markTyping() {
    typedAt = performance.now();
    schedulePreview(true);
  }

  // 수식 키만 누르면 그대로 두고, 트리거·이동 키·조합 키는 숨기고, 나머지 키(글자, Backspace, Delete 등)는 다시 판정한다
  function previewOnKeyDown(e) {
    if (!e.isTrusted || MODIFIER_KEYS.has(e.key)) return;
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    if (!plain || NAV_KEYS.has(e.key) || TRIGGERS.has(e.key) || e.isComposing || e.keyCode === 229) {
      hidePreview();
      return;
    }
    markTyping();
  }

  // ── 복원 ──
  // char, newline: 커서 앞이 "변환 결과 + 트리거"면 한 번에 원문으로 되돌린다
  // space: 첫 Backspace는 편집기에 맡겨 공백만 지우고, 바로 이어 한 번 더 누르면 되돌린다
  function revert(e, last) {
    const { root } = last;
    if (isPasswordLike(root)) return;
    if (last.kind === 'block') {
      armBlockRevert(last);
      return;
    }
    const point = isMonaco(root) ? readMonaco() : isField(root) ? readField(root) : readEditable(root);
    if (!point || !norm(point.before).endsWith(last.tail)) return;
    if (last.kind === 'space') {
      record = { ...last, kind: 'char', tail: last.converted };
      return;
    }
    e.preventDefault();
    if (isMonaco(root)) e.stopPropagation(); // Monaco는 기본 동작이 막혀도 자체 처리로 지울 수 있다
    const start = point.before.length - last.tail.length;
    replaceBeforeCaret(root, point, last.tail.length, last.original, (outcome) => finishRevert(last, outcome, start));
  }

  // start: 되돌린 원문이 시작하는 위치 (커서 앞 텍스트 기준). 편집기가 화면을 늦게 다시 그려도 계산으로 정한다.
  function finishRevert(last, outcome, start) {
    if (outcome !== 'ok') return;
    kept = { root: last.root, token: last.original, at: start + last.original.length };
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
      const start = post.before.length - last.converted.length;
      replaceInEditable(root, post, last.converted.length, last.original, (outcome) => finishRevert(last, outcome, start));
    };
    pendingBlock = state;
    state.timer = setTimeout(check, 100);
    root.addEventListener('input', () => setTimeout(check, 0), { capture: true, once: true });
  }

  // ── 이벤트 ──
  function onKeyDown(e) {
    if (!e.isTrusted || MODIFIER_KEYS.has(e.key)) return;
    if (pendingBlock) {
      clearTimeout(pendingBlock.timer);
      pendingBlock = null;
    }
    const last = record;
    record = null;
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    const navigation = !plain || NAV_KEYS.has(e.key);
    const backspace = last && e.key === 'Backspace' && plain && !e.repeat && !e.isComposing;
    const trigger = TRIGGERS.has(e.key) && !e.repeat && !e.isComposing && e.keyCode !== 229 && !composing;
    if (!navigation && !backspace && !trigger) return;
    const root = rootFrom(e.composedPath()[0]);
    if (!root) return;
    if (backspace && last.root === root) {
      revert(e, last);
      return;
    }
    if (navigation) {
      chain.set(root, false);
      kept = null;
      return;
    }
    if (!trigger || !siteActive() || isExcluded(root) || isPasswordLike(root)) return;
    if (e.key === 'Enter' && root.getAttribute('aria-activedescendant')) return;
    convertAtCaret(e, root);
  }

  function resetFrom(e) {
    record = null;
    kept = null;
    const root = rootFrom(e.composedPath()[0]);
    if (root) chain.set(root, false);
  }

  addEventListener('keydown', onKeyDown, true);
  addEventListener('keydown', previewOnKeyDown, true);
  // Slate가 beforeinput을 취소하면 input이 오지 않으므로 둘 다 감시한다.
  for (const type of ['beforeinput', 'input']) addEventListener(type, (e) => {
    if (!e.isTrusted) return; // 확장이 보내는 합성 beforeinput은 여기서 걸러진다
    if (type === 'beforeinput' && kept && e.inputType === 'insertText' && /[A-Za-z]/.test(e.data ?? '')) kept = null;
    markTyping();
  }, true);
  document.addEventListener('selectionchange', () => schedulePreview(performance.now() - typedAt < TYPING_GRACE));
  for (const type of ['scroll', 'resize', 'wheel']) addEventListener(type, () => schedulePreview(false), { capture: true, passive: true });
  visualViewport?.addEventListener('resize', () => schedulePreview(false));
  visualViewport?.addEventListener('scroll', () => schedulePreview(false));
  addEventListener('mousedown', resetFrom, true);
  addEventListener('pointerdown', hidePreview, true);
  addEventListener('focusin', resetFrom, true);
  addEventListener('focusout', hidePreview, true);
  addEventListener('paste', resetFrom, true);
  addEventListener('compositionstart', (e) => {
    composing = true;
    hidePreview();
    resetFrom(e);
  }, true);
  addEventListener('compositionend', () => {
    composing = false;
  }, true);
})();
