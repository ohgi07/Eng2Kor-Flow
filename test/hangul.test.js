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

const WORDS = require('../extension/src/words.js');

test('convert: 결과 예시 (스펙 3.7)', () => {
  const rows = [
    ['dkssudgktpdy', false, '안녕하세요'], ['dlTdj', false, '있어'], ['hello', false, null],
    ['meeting', true, null], ['sun', true, null], ['dog', true, null], ['the', false, null],
    ['go', false, null], ['go', true, '해'], ['for', true, null], ['gg', true, null],
    ['zzz', false, 'ㅋㅋㅋ'], ['dz', false, 'ㅇㅋ'], ['dzzz', false, 'ㅇㅋㅋㅋ'], ['rt', false, 'ㄳ'],
    ['NASA', false, null], ['a', false, null],
  ];
  for (const [token, chain, expected] of rows) assert.equal(E.convert(token, { chain }), expected, `${token} chain=${chain}`);
});

test('convert: 영문자 외 글자가 섞이면 변환하지 않는다', () => {
  for (const token of ['dkssud1', 'dk_ssud', 'dkssud!']) assert.equal(E.convert(token), null, token);
});

test('words.js: 모든 단어가 한글 후보를 낸다', () => {
  assert.ok(WORDS.size > 0);
  for (const word of WORDS) assert.ok(E.hangulCandidate(word), word);
});

test('words.js: 보호가 필요한 대표 단어를 포함하고 CHAIN_WORDS는 그 부분집합이다', () => {
  for (const word of ['go', 'so', 'to', 'do', 'for', 'and', 'gg', 'gl', 'wp']) assert.ok(WORDS.has(word), word);
  for (const word of E.CHAIN_WORDS) assert.ok(WORDS.has(word), word);
});

test('extractToken: 토큰 경계 (스펙 4.2)', () => {
  const tok = (before, next, prev) => E.extractToken(before, next, prev)?.token ?? null;
  assert.equal(tok('dkssud'), 'dkssud');
  assert.equal(E.extractToken('안녕 dkssud').start, 3);
  assert.equal(tok('안녕하세요rkatk'), 'rkatk');
  assert.equal(tok('안녕,dkssud'), 'dkssud');
  assert.equal(tok('(dkssud'), 'dkssud');
  assert.equal(tok('“dkssud'), 'dkssud');
  for (const before of ['user_dkssud', 'a@dkssud', 'http://dkssud', '3dkssud', 'e.g', 'well-dkssud', '#dkssud', ':dkssud']) {
    assert.equal(tok(before), null, before);
  }
  for (const next of ['a', 'Z', '1', '_', '@', '/', '.', '-']) assert.equal(tok('dkssud', next), null, `next ${next}`);
  for (const next of [' ', '안', ')', ',']) assert.equal(tok('dkssud', next), 'dkssud', `next ${next}`);
  assert.equal(tok('dkssud', '', 'c'), null);
  assert.equal(tok('dkssud', '', ' '), 'dkssud');
  assert.equal(tok(''), null);
  assert.equal(tok('안녕 '), null);
});

// 평가 묶음: 한글을 두벌식 키로 되돌리는 도우미와, 단어마다 convert를 부르며 연쇄를 적용하는 시뮬레이터
const { KEYMAP, CHO, JUNG, JONG, VOWEL_PAIRS, FINAL_PAIRS } = E.tables;
const KEY_OF = Object.fromEntries(Object.entries(KEYMAP).map(([key, jamo]) => [jamo, key]));
const SPLIT = Object.fromEntries([...Object.entries(VOWEL_PAIRS), ...Object.entries(FINAL_PAIRS)].map(([pair, jamo]) => [jamo, pair]));
const jamoKeys = (jamo) => [...(SPLIT[jamo] ?? jamo)].map((j) => KEY_OF[j]).join('');

function toKeys(text) {
  let keys = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) keys += jamoKeys(ch);
    else keys += jamoKeys(CHO[Math.floor(code / 588)]) + jamoKeys(JUNG[Math.floor(code / 28) % 21]) + jamoKeys(JONG[code % 28]);
  }
  return keys;
}

function simulate(sentence) {
  let chain = false;
  return sentence.split(' ').map((word) => {
    const intended = /^\{(.+)\}$/.exec(word);
    const typed = intended ? toKeys(intended[1]) : word;
    if (!/^[A-Za-z]+$/.test(typed)) {
      chain = false; // 한글 모드(IME)로 친 단어
      return typed;
    }
    const out = E.convert(typed, { chain });
    chain = out !== null;
    return out ?? typed;
  }).join(' ');
}

const EVAL = [
  // 영문 모드로 친 한국어
  '{안녕하세요}', '{감사합니다}', '{오늘} {날씨} {진짜} {좋다}', '{뭐} {해}', '{왜} {해}', '{나도} {그래}',
  '{배고파} {밥} {먹자}', '{회의} {시작할게요}', '{없어}', '{괜찮아}', '{빨리} {해}', '{이거} {내} {거야}',
  '{나} {새} {차} {샀어}', '{고양이} {귀여워}', '{나} {지금} {가}', '{그럼} {내일} {봐}', '{진짜} {대박}',
  // 반복 자모와 약어
  '{미안ㅠㅠ}', '{그래ㅋㅋㅋ}', '{좋아ㅎㅎ}', '{어휴ㅠㅠ}', '{짱ㅠㅠ}', '{고마워ㅎㅎ}', '{ㅋㅋㅋㅋ}',
  '{ㅇㅋ}', '{ㄱㄱ}', '{ㄳ}', '{ㅋㅋㅋ} {진짜} {웃기다}',
  // 그대로 둬야 하는 영어
  'hello world', 'good morning', 'this is a test', 'let me know', 'go for it', 'to do list', 'and so on',
  'gg wp', 'thx', 'git push origin main', 'npm install', 'NASA OK', 'iPhone Seoul', 'dog cat', 'sun run fun',
  // 한글 모드로 친 한국어 + 영어
  '조건문 for 루프', '언어 go 써봤어', '오늘 meeting 있어', '이 db 확인해',
  // 영문 모드 한국어와 영어가 섞임
  '{오늘} meeting {있어}', '{조건문} for {루프}', '{감사합니다} thank you', '{안녕} hi', 'see you {내일}',
];

test('평가 묶음: 실제 입력 패턴', () => {
  const failures = EVAL.filter((c) => simulate(c) !== c.replace(/[{}]/g, '')).map((c) => `${c} → ${simulate(c)}`);
  assert.deepEqual(failures, []);
});
