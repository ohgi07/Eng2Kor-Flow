// 변환 미리보기 말풍선. 판정은 하지 않는다. 기준점 { x, top, bottom }은 뷰포트 좌표(CSS px)다.
const Eng2KorPreview = (() => {
  'use strict';

  const GAP = 4; // 기준점과 말풍선 사이
  const EDGE = 4; // 뷰포트 가장자리 여백
  const MAX_TEXTAREA = 20000; // 이보다 긴 textarea는 위치를 재지 않는다
  const MAX_ATTACH = 3; // 사이트가 상자를 지우면 다시 붙이는 횟수
  const MIRROR_PROPS = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'fontKerning',
    'fontFeatureSettings', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform',
    'tabSize', 'whiteSpace', 'overflowWrap', 'wordBreak', 'direction', 'textAlign',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  ];
  const STYLE = `
    .bubble {
      position: fixed; inset: auto; margin: 0; box-sizing: border-box; overflow: visible;
      width: max-content; max-width: none; height: auto;
      padding: 2px 8px; border: 1px solid rgba(0, 0, 0, .15); border-radius: 6px;
      background: #fff; color: #1d1d1f; box-shadow: 0 2px 8px rgba(0, 0, 0, .15);
      font: 13px/1.4 system-ui, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      white-space: pre; pointer-events: none;
    }
    .bubble::backdrop { display: none; }
    .pending { opacity: .45; text-decoration: underline dotted; }
    @media (prefers-color-scheme: dark) {
      .bubble { background: #2c2c2e; color: #f5f5f7; border-color: rgba(255, 255, 255, .18); }
    }
    @media (forced-colors: active) {
      .bubble { background: Canvas; color: CanvasText; border-color: CanvasText; }
    }
    .mirror {
      position: absolute; top: 0; left: -99999px; visibility: hidden;
      box-sizing: content-box; border: 0; margin: 0; height: auto; overflow: hidden;
    }
  `;

  let host = null;
  let bubble = null;
  let textEl = null;
  let pendingEl = null;
  let mirror = null;
  let mirrorFor = null; // 복사본이 지금 흉내 내는 textarea
  let mirrorKey = ''; // 그때의 폭·스타일
  let attached = 0;
  let canvas = null;
  let side = { key: null, below: true }; // 한 단어를 치는 동안 위/아래를 유지한다

  function ensure() {
    if (host?.isConnected) return true;
    if (attached >= MAX_ATTACH || !document.documentElement) return false;
    attached += 1;
    if (!host) {
      host = document.createElement('eng2kor-preview');
      host.setAttribute('style', 'all: initial !important; display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important;');
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = STYLE;
      bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.setAttribute('popover', 'manual');
      bubble.setAttribute('aria-hidden', 'true');
      textEl = document.createElement('span');
      pendingEl = document.createElement('span');
      pendingEl.className = 'pending';
      bubble.append(textEl, pendingEl);
      mirror = document.createElement('div');
      mirror.className = 'mirror';
      shadow.append(style, bubble, mirror);
    }
    document.documentElement.append(host);
    return true;
  }

  function viewport() {
    const root = document.compatMode === 'CSS1Compat' ? document.documentElement : null;
    return { width: root?.clientWidth || innerWidth, height: root?.clientHeight || innerHeight };
  }

  function show(anchor, { text, pending }, key) {
    if (!ensure()) return;
    if (textEl.textContent !== text) textEl.textContent = text;
    if (pendingEl.textContent !== pending) pendingEl.textContent = pending;
    if (!bubble.matches(':popover-open')) bubble.showPopover();
    const { width, height } = bubble.getBoundingClientRect();
    const view = viewport();
    const below = anchor.bottom + GAP + height <= view.height - EDGE;
    const above = anchor.top - GAP - height >= EDGE;
    if (side.key !== key) side = { key, below: below || !above };
    else if (side.below ? !below && above : !above && below) side.below = !side.below;
    const top = side.below ? anchor.bottom + GAP : anchor.top - GAP - height;
    const left = Math.max(EDGE, Math.min(anchor.x, view.width - width - EDGE));
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top)}px`;
  }

  function hide() {
    if (bubble?.matches(':popover-open')) bubble.hidePopover();
  }

  // el과, 넘침을 자르는 조상들과, 뷰포트를 모두 겹친 영역. fixed 요소 위로는 조상이 자르지 않는다.
  // body의 overflow는 뷰포트에 적용되므로(유튜브) body와 html은 보지 않고, inline·contents 요소는 자르지 않는다.
  function visibleBox(el, rootStyle) {
    const view = viewport();
    const box = { left: 0, top: 0, right: view.width, bottom: view.height };
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const style = node === el && rootStyle ? rootStyle : getComputedStyle(node);
      const clips = node === el
        ? style.display !== 'contents'
        : (style.overflowX !== 'visible' || style.overflowY !== 'visible') && style.display !== 'inline' && style.display !== 'contents';
      if (clips) {
        const r = node.getBoundingClientRect();
        box.left = Math.max(box.left, r.left);
        box.top = Math.max(box.top, r.top);
        box.right = Math.min(box.right, r.right);
        box.bottom = Math.min(box.bottom, r.bottom);
      }
      if (style.position === 'fixed') break;
    }
    return box;
  }

  // 첫 글자가 보이고 커서와 같은 줄이면 첫 글자, 아니면 커서. 커서가 안 보이면 null
  function pickAnchor(el, anchors, style) {
    if (!anchors) return null;
    const box = visibleBox(el, style);
    const seen = (p) => !!p && p.x >= box.left - 1 && p.x <= box.right + 1 && p.top >= box.top - 1 && p.bottom <= box.bottom + 1;
    const { start, caret } = anchors;
    if (!seen(caret)) return null;
    return seen(start) && Math.abs(start.top - caret.top) < (caret.bottom - caret.top) / 2 ? start : caret;
  }

  // input: 캔버스로 앞 글자 폭을 잰다. 가운데·오른쪽 정렬이나 rtl이면 입력칸 왼쪽 아래 모서리
  function inputAnchors(el, start, end, style, rect) {
    if (style.direction === 'rtl' || !/^(start|left|justify|-webkit-left)$/.test(style.textAlign)) {
      const corner = { x: rect.left, top: rect.top, bottom: rect.bottom };
      return { start: corner, caret: corner };
    }
    canvas ??= document.createElement('canvas').getContext('2d');
    canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = parseFloat(style.letterSpacing) || 0;
    const origin = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) +
      (parseFloat(style.textIndent) || 0) - el.scrollLeft;
    const at = (index) => {
      const text = el.value.slice(0, index);
      return { x: origin + canvas.measureText(text).width + spacing * text.length, top: rect.top, bottom: rect.bottom };
    };
    return { start: at(start), caret: at(end) };
  }

  // textarea: 같은 글꼴·폭의 보이지 않는 복사본 하나를 재사용해 단어와 커서 자리를 잰다
  function textareaAnchors(el, start, end, style, rect) {
    if (el.value.length > MAX_TEXTAREA || !ensure()) return null;
    const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const key = `${width}|${MIRROR_PROPS.map((prop) => style[prop]).join('|')}`;
    if (mirrorFor !== el || mirrorKey !== key) {
      for (const prop of MIRROR_PROPS) mirror.style[prop] = style[prop];
      mirror.style.width = `${width}px`;
      mirrorFor = el;
      mirrorKey = key;
    }
    const word = document.createElement('span');
    word.textContent = el.value.slice(start, end);
    const rest = document.createElement('span');
    rest.textContent = /^\S*/.exec(el.value.slice(end))[0] || '​'; // 커서 뒤에 붙은 글자들 (줄바꿈 위치를 맞춘다)
    mirror.replaceChildren(el.value.slice(0, start), word, rest);
    const box = mirror.getBoundingClientRect();
    const dx = rect.left + parseFloat(style.borderLeftWidth) - box.left - el.scrollLeft;
    const dy = rect.top + parseFloat(style.borderTopWidth) - box.top - el.scrollTop;
    const point = (r) => (r ? { x: r.left + dx, top: r.top + dy, bottom: r.bottom + dy } : null);
    return { start: point(word.getClientRects()[0]), caret: point(rest.getClientRects()[0]) };
  }

  function fieldAnchors(el, start, end, style = getComputedStyle(el)) {
    if (!style.writingMode.startsWith('horizontal')) return null;
    const rect = el.getBoundingClientRect();
    if (Math.abs(rect.width - el.offsetWidth) > 1) return null; // transform·zoom이 걸려 있으면 재지 않는다
    return el.localName === 'textarea'
      ? textareaAnchors(el, start, end, style, rect)
      : inputAnchors(el, start, end, style, rect);
  }

  // contenteditable: 첫 글자 한 칸과 마지막 글자 한 칸의 상자로 잰다 (DOM은 건드리지 않는다)
  function rangeAnchors(node, start, end) {
    const el = node.parentElement;
    if (!el || !getComputedStyle(el).writingMode.startsWith('horizontal')) return null;
    const range = document.createRange();
    const at = (index) => {
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      return range.getClientRects()[0] ?? null;
    };
    const first = at(start);
    const last = at(end - 1);
    return {
      start: first && { x: first.left, top: first.top, bottom: first.bottom },
      caret: last && { x: last.right, top: last.top, bottom: last.bottom },
    };
  }

  return { show, hide, fieldAnchors, rangeAnchors, pickAnchor };
})();
