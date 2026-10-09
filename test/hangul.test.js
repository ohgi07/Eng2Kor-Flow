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

test('상용 2350자 집합', () => assert.equal(E.tables.COMMON.size, 2350));

test('hangulCandidate: 반복 자모 분리 (스펙 3.3)', () => expectAll(E.hangulCandidate, {
  rmfozzz: '그래ㅋㅋㅋ', gkzzz: '하ㅋㅋㅋ', rhakdnjggg: '고마워ㅎㅎㅎ', whggg: '좋ㅎㅎ', aksggg: '많ㅎㅎ',
  qndjzzz: '부엌ㅋㅋ', djgbbb: '어휴ㅠㅠ', sjggg: '넣ㅎㅎ', aldksbb: '미안ㅠㅠ', Wkdbb: '짱ㅠㅠ',
  dkzzz: '아ㅋㅋㅋ', rmfoz: null,
}));

test('hangulCandidate: 구조와 상용 음절 (스펙 3.4 3–4단계)', () => expectAll(E.hangulCandidate, {
  dkssudgktpdy: '안녕하세요', hello: null, meeting: null, sun: null, dog: null, the: null,
  zzz: 'ㅋㅋㅋ', dz: 'ㅇㅋ', dzzz: 'ㅇㅋㅋㅋ', rt: 'ㄳ', rtk: null,
  dkssudz: null, dkssudzz: '안녕ㅋㅋ', zzdkssud: 'ㅋㅋ안녕',
}));
