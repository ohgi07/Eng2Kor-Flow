// 두벌식 조합과 변환 판정. 콘텐츠 스크립트에서는 전역 Eng2Kor로, Node에서는 require로 쓴다.
const Eng2Kor = (() => {
  'use strict';

  const KEYMAP = {
    q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
    a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
    z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
    Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ',
  };
  const CHO = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
  const JUNG = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
  const JONG = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
  const VOWEL_PAIRS = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const FINAL_PAIRS = {
    'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ',
    'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ',
  };
  const FINAL_SPLIT = Object.fromEntries(Object.entries(FINAL_PAIRS).map(([pair, jamo]) => [jamo, [...pair]]));

  function compose(keys) {
    let out = '';
    let cho = '';
    let jung = '';
    let jong = '';
    const flush = () => {
      if (cho && jung) out += String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong));
      else out += cho + jung;
      cho = jung = jong = '';
    };
    for (const key of keys) {
      const jamo = KEYMAP[key] ?? KEYMAP[key.toLowerCase()];
      if (!jamo) {
        flush();
        out += key;
      } else if (JUNG.includes(jamo)) {
        if (jong) {
          // 받침 넘어가기: 겹받침이면 뒤 자음만 넘어간다
          const split = FINAL_SPLIT[jong];
          const moved = split ? split[1] : jong;
          jong = split ? split[0] : '';
          flush();
          cho = moved;
          jung = jamo;
        } else if (cho && !jung) {
          // 낱자음 겹자모(ㄳ 등) 뒤에 모음이 오면 앞 자음은 남기고 뒤 자음이 초성이 된다
          const split = FINAL_SPLIT[cho];
          if (split) {
            out += split[0];
            cho = split[1];
          }
          jung = jamo;
        } else if (jung && VOWEL_PAIRS[jung + jamo]) {
          jung = VOWEL_PAIRS[jung + jamo];
        } else {
          flush();
          jung = jamo;
        }
      } else if (cho && jung) {
        if (!jong && JONG.includes(jamo)) jong = jamo;
        else if (jong && FINAL_PAIRS[jong + jamo]) jong = FINAL_PAIRS[jong + jamo];
        else {
          flush();
          cho = jamo;
        }
      } else if (cho && FINAL_PAIRS[cho + jamo]) {
        cho = FINAL_PAIRS[cho + jamo];
      } else {
        flush();
        cho = jamo;
      }
    }
    flush();
    return out;
  }

  // KS X 1001 상용 2350자: EUC-KR 한글 영역
  const COMMON = (() => {
    const bytes = [];
    for (let hi = 0xb0; hi <= 0xc8; hi++) for (let lo = 0xa1; lo <= 0xfe; lo++) bytes.push(hi, lo);
    return new Set(new TextDecoder('euc-kr').decode(new Uint8Array(bytes)));
  })();
  const EXPRESSIVE = new Set(['ㅋ', 'ㅎ', 'ㅠ', 'ㅜ']);
  const ABBREVIATIONS = ['ㅇㅋ', 'ㅇㅇ', 'ㄴㄴ', 'ㄱㄱ', 'ㄳ', 'ㅅㄱ', 'ㅂㅂ', 'ㅊㅋ', 'ㅎㅇ', 'ㄷㄷ', 'ㅈㅅ', 'ㄹㅇ', 'ㅇㅈ'];
  const isSyllable = (ch) => ch >= '가' && ch <= '힣';

  function isValid(text) {
    if (!/[가-힣]/.test(text)) {
      const abbr = ABBREVIATIONS.find((a) => text.startsWith(a));
      if (abbr && [...text.slice(abbr.length)].every((ch) => EXPRESSIVE.has(ch))) return true;
    }
    for (const run of text.match(/([^가-힣])\1*/g) ?? []) {
      if (!EXPRESSIVE.has(run[0]) || run.length < 2) return false;
    }
    for (const ch of text) if (isSyllable(ch) && !COMMON.has(ch)) return false;
    return true;
  }

  function hangulCandidate(token) {
    const full = compose(token);
    if (isValid(full)) return full;
    // 전체 조합이 안 되면 끝의 반복 표현 자모를 분리한다.
    const run = /(?:z{2,}|g{2,}|b{2,}|n{2,})$/i.exec(token);
    if (!run) return null;
    const split = compose(token.slice(0, run.index)) + KEYMAP[run[0][0].toLowerCase()].repeat(run[0].length);
    return isValid(split) ? split : null;
  }

  // 한글로도 흔히 쓰는 짧은 영어 단어는 연쇄 중에 사전 보호를 푼다.
  const CHAIN_WORDS = new Set(['go', 'so', 'to', 'do', 'wp', 'aka', 'rid']);
  const WORDS = typeof ENGLISH_WORDS !== 'undefined' ? ENGLISH_WORDS : require('./words.js');

  const isEnglish = (token, chain) => {
    const lower = token.toLowerCase();
    return WORDS.has(lower) && !(chain && CHAIN_WORDS.has(lower));
  };

  function convert(token, { chain = false } = {}) {
    if (token.length < 2 || !/^[A-Za-z]+$/.test(token) || token === token.toUpperCase()) return null;
    if (isEnglish(token, chain)) return null;
    return hangulCandidate(token);
  }

  // 다음 음절의 초성이 될 수 있는 마지막 자음은 pending으로 분리한다. 사전 단어는 조합 중으로도 보이지 않는다.
  function preview(token, { chain = false } = {}) {
    const full = convert(token, { chain });
    if (full) return { text: full, pending: '' };
    if (isEnglish(token, chain)) return null;
    const key = token.slice(-1);
    const last = KEYMAP[key] ?? KEYMAP[key.toLowerCase()];
    if (!last || last < 'ㄱ' || last > 'ㅎ') return null;
    const head = convert(token.slice(0, -1), { chain });
    return head ? { text: head, pending: last } : null;
  }

  // 토큰 앞에 올 수 있는 글자: 공백, 한글, 여는 괄호·따옴표, 쉼표·느낌표·물음표
  const BEFORE_OK = /[\s가-힣ㄱ-ㆎ(\[{"'“‘,!?]/;
  // 커서 뒤에 이 글자가 있으면 단어나 식별자 중간이다
  const AFTER_BLOCK = /[A-Za-z0-9_@\/.\-]/;

  function extractToken(before, next = '', prevOutside = '') {
    const match = /[A-Za-z]+$/.exec(before);
    if (!match) return null;
    if (next && AFTER_BLOCK.test(next)) return null;
    const prev = match.index > 0 ? before[match.index - 1] : prevOutside;
    if (prev && !BEFORE_OK.test(prev)) return null;
    return { token: match[0], start: match.index };
  }

  return {
    tables: { KEYMAP, CHO, JUNG, JONG, VOWEL_PAIRS, FINAL_PAIRS, COMMON },
    compose,
    hangulCandidate,
    convert,
    preview,
    extractToken,
    CHAIN_WORDS,
  };
})();

if (typeof module !== 'undefined') module.exports = Eng2Kor;
