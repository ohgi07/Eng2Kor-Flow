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

  return {
    tables: { KEYMAP, CHO, JUNG, JONG, VOWEL_PAIRS, FINAL_PAIRS },
    compose,
  };
})();

if (typeof module !== 'undefined') module.exports = Eng2Kor;
