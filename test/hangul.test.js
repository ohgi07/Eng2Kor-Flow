const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../extension/src/hangul.js');

function expectAll(fn, table) {
  for (const [input, expected] of Object.entries(table)) assert.equal(fn(input), expected, input);
}

test('compose: 키 하나는 자모 하나', () => {
  for (const [key, jamo] of Object.entries(E.tables.KEYMAP)) assert.equal(E.compose(key), jamo, key);
});

test('compose: 문장', () => expectAll(E.compose, {
  dkssudgktpdy: '안녕하세요', rkatkgkqslek: '감사합니다', DKSSUD: '안녕',
}));

test('compose: 이중모음 7종', () => expectAll(E.compose, {
  dhk: '와', dho: '왜', dhl: '외', dnj: '워', dnp: '웨', dnl: '위', dml: '의', hk: 'ㅘ',
}));

test('compose: 겹받침 11종', () => expectAll(E.compose, {
  sjrt: '넋', dksw: '앉', dksg: '않', ekfr: '닭', tkfa: '삶', sjfq: '넓',
  rhft: '곬', gkfx: '핥', dmfv: '읊', tlfg: '싫', djqt: '없',
}));

test('compose: 받침 넘어가기', () => expectAll(E.compose, { rkqk: '가바', rkqtk: '갑사', ekfrk: '달가' }));

test('compose: Shift 쌍자음과 ㅒ ㅖ', () => expectAll(E.compose, {
  Rk: '까', Ek: '따', Qk: '빠', Tk: '싸', Wk: '짜', dO: '얘', dP: '예',
}));

test('compose: ㄲ ㅆ은 받침 가능, ㄸ ㅃ ㅉ는 불가', () => expectAll(E.compose, {
  dlTdj: '있어', rkRk: '가까', rkE: '가ㄸ', rkQ: '가ㅃ', rkW: '가ㅉ',
}));

test('compose: 낱자모와 IME식 조합', () => expectAll(E.compose, {
  rt: 'ㄳ', rtk: 'ㄱ사', zz: 'ㅋㅋ', fr: 'ㄺ', k: 'ㅏ', rmfozzz: '그랰ㅋㅋ', aldksbb: '미아뉴ㅠ',
}));
