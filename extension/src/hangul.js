// Eng2Kor Flow — 두벌식 조합과 변환 판정. DOM·크롬 API에 의존하지 않는 순수 로직이다.
// 콘텐츠 스크립트에서는 전역 Eng2Kor로, Node(테스트·생성 스크립트)에서는 require로 쓴다.
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
  const isVowel = (jamo) => JUNG.includes(jamo);

  // 영문 키 입력을 두벌식 규칙으로 조합한다 (스펙 3.2)
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
      } else if (isVowel(jamo)) {
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

  // KS X 1001 상용 2350자: EUC-KR 한글 영역을 한 번 디코딩해 만든다 (스펙 3.5)
  const COMMON = (() => {
    const bytes = [];
    for (let hi = 0xb0; hi <= 0xc8; hi++) for (let lo = 0xa1; lo <= 0xfe; lo++) bytes.push(hi, lo);
    return new Set(new TextDecoder('euc-kr').decode(new Uint8Array(bytes)));
  })();
  const EXPRESSIVE = new Set(['ㅋ', 'ㅎ', 'ㅠ', 'ㅜ']);
  const ABBREVIATIONS = ['ㅇㅋ', 'ㅇㅇ', 'ㄴㄴ', 'ㄱㄱ', 'ㄳ', 'ㅅㄱ', 'ㅂㅂ', 'ㅊㅋ', 'ㅎㅇ', 'ㄷㄷ', 'ㅈㅅ', 'ㄹㅇ', 'ㅇㅈ'];
  const isSyllable = (ch) => ch >= '가' && ch <= '힣';

  // 스펙 3.4의 3단계(구조)와 4단계(상용 음절)
  function isValid(text) {
    if (![...text].some(isSyllable)) {
      const abbr = ABBREVIATIONS.find((a) => text.startsWith(a));
      if (abbr && [...text.slice(abbr.length)].every((ch) => EXPRESSIVE.has(ch))) return true;
    }
    for (const run of text.match(/([^가-힣])\1*/g) ?? []) {
      if (!EXPRESSIVE.has(run[0]) || run.length < 2) return false;
    }
    return [...text].filter(isSyllable).every((ch) => COMMON.has(ch));
  }

  // 후보 A: 전체 조합. 후보 B: 끝의 같은 표현 자모 키 반복(2회 이상)을 떼어 낱자모로 붙임 (스펙 3.3)
  function candidates(token) {
    const list = [compose(token)];
    const run = /(?:z{2,}|g{2,}|b{2,}|n{2,})$/i.exec(token);
    if (run) list.push(compose(token.slice(0, run.index)) + KEYMAP[run[0][0].toLowerCase()].repeat(run[0].length));
    return list;
  }

  function hangulCandidate(token) {
    return candidates(token).find(isValid) ?? null;
  }

  // 한글로도 흔히 쓰는 짧은 영어 단어. 연쇄 중에는 사전 보호를 풀어 준다 (스펙 3.4 5단계)
  const CHAIN_WORDS = new Set(['go', 'so', 'to', 'do', 'wp', 'aka', 'rid']);
  const WORDS = typeof ENGLISH_WORDS !== 'undefined' ? ENGLISH_WORDS : require('./words.js');

  // 스펙 3.4: 토큰을 한글로 바꿀지 판정한다. 바꿀 결과 또는 null
  function convert(token, { chain = false, skip } = {}) {
    if (token.length < 2 || !/^[A-Za-z]+$/.test(token) || token === token.toUpperCase()) return null;
    if (skip?.has(token)) return null;
    const result = hangulCandidate(token);
    if (!result) return null;
    const lower = token.toLowerCase();
    if (WORDS.has(lower) && !(chain && CHAIN_WORDS.has(lower))) return null;
    return result;
  }

  return {
    tables: { KEYMAP, CHO, JUNG, JONG, VOWEL_PAIRS, FINAL_PAIRS, COMMON },
    compose,
    hangulCandidate,
    convert,
    CHAIN_WORDS,
  };
})();

if (typeof module !== 'undefined') module.exports = Eng2Kor;
