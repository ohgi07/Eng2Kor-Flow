// Eng2Kor Flow — Colab Monaco 편집기 다리 (페이지 MAIN world). 판정은 하지 않고 읽기·바꾸기만 한다.
// content.js가 document에 'eng2kor:monaco' 이벤트로 요청하면 같은 이벤트 처리 안에서 'eng2kor:monaco-reply'로 답한다.
(() => {
  'use strict';

  const focused = () => window.monaco?.editor?.getEditors?.().find((ed) => ed.hasTextFocus()) ?? null;

  // 커서 앞 글자의 표준 토큰 종류 (0 기타, 1 주석, 2 문자열, 3 정규식). 읽을 수 없으면 null
  function tokenTypeBefore(model, lineNumber, column) {
    const tokenization = model.tokenization ?? model;
    tokenization.forceTokenization?.(lineNumber);
    const tokens = tokenization.getLineTokens?.(lineNumber);
    if (!tokens) return null;
    return tokens.getStandardTokenType(tokens.findTokenIndexAtOffset(Math.max(0, column - 2)));
  }

  function read() {
    const ed = focused();
    if (!ed || !ed.getSelection()?.isEmpty()) return null;
    const model = ed.getModel();
    const { lineNumber, column } = ed.getPosition();
    const line = model.getLineContent(lineNumber);
    let tokenType = null;
    try {
      tokenType = tokenTypeBefore(model, lineNumber, column);
    } catch {
      tokenType = null;
    }
    return { language: model.getLanguageId(), before: line.slice(0, column - 1), next: line.charAt(column - 1), tokenType };
  }

  // 커서 바로 앞 len글자가 expected일 때만 text로 바꾼다. 변환은 실행 취소 한 단계가 되게 앞뒤로 끊는다.
  function edit({ len, text, expected }) {
    const ed = focused();
    if (!ed || !ed.getSelection()?.isEmpty()) return 'unchanged';
    const model = ed.getModel();
    const { lineNumber, column } = ed.getPosition();
    if (column - len < 1) return 'unchanged';
    const range = new window.monaco.Range(lineNumber, column - len, lineNumber, column);
    if (model.getValueInRange(range) !== expected) return 'unchanged';
    ed.pushUndoStop();
    const applied = ed.executeEdits('eng2kor', [{ range, text, forceMoveMarkers: true }]);
    ed.pushUndoStop();
    if (!applied) return 'unchanged';
    const position = ed.getPosition();
    return model.getLineContent(position.lineNumber).slice(0, position.column - 1).endsWith(text) ? 'ok' : 'unexpected';
  }

  document.addEventListener('eng2kor:monaco', (e) => {
    if (typeof e.detail !== 'string') return;
    let result = null;
    try {
      const request = JSON.parse(e.detail);
      result = request.op === 'read' ? read() : request.op === 'edit' ? edit(request) : null;
    } catch {
      result = null;
    }
    document.dispatchEvent(new CustomEvent('eng2kor:monaco-reply', { detail: JSON.stringify(result) }));
  });
})();
