// SCOWL 단어 목록에서 한글로 조합되는 영어 단어만 골라 extension/src/words.js를 만든다.
// 사용법: node scripts/gen-words.mjs scripts/.cache/scowl-60.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hangulCandidate } = require('../extension/src/hangul.js');

// SCOWL에 없는 채팅·게임·개발 약어
const SUPPLEMENT = [
  'gg', 'gl', 'wp', 'gj', 'gn', 'gm', 'dm', 'ty', 'thx', 'tho', 'rn', 'wb', 'db', 'vm', 'dns',
  'ai', 'gpt', 'todo', 'wifi', 'sudo', 'figma', 'django', 'gitlab', 'ci', 'fn', 'cms', 'tba', 'apr',
];
// SCOWL에 있지만 흔한 한글 입력과 겹쳐서 빼는 단어 (생성 후 2–3글자 단어를 검토해 채운다)
const EXCLUDE = [
  'dd', 'dz', 'rt', 'tr', 'wt', // ㅇㅇ ㅇㅋ ㄳ ㅅㄱ ㅈㅅ
  'wk', 'tn', 'en', 'ck', 'cor', 'ans', 'ska', 'tor', 'emf', // 자 수 두 차 책 문 남 색 들
];

const source = process.argv[2];
if (!source) {
  console.error('사용법: node scripts/gen-words.mjs <SCOWL 단어 목록 파일>');
  process.exit(1);
}

const text = readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
const separator = text.indexOf('\n---\n');
const header = separator >= 0 ? text.slice(0, separator).trim() : '';
const body = separator >= 0 ? text.slice(separator + 5) : text;

const exclude = new Set(EXCLUDE);
const words = new Set();
for (const word of [...body.split('\n'), ...SUPPLEMENT]) {
  if (/^[a-z]{2,}$/.test(word) && !exclude.has(word) && hangulCandidate(word)) words.add(word);
}
const sorted = [...words].sort();

const lines = [];
for (let i = 0; i < sorted.length; i += 12) lines.push(`  ${sorted.slice(i, i + 12).map((w) => `'${w}'`).join(', ')},`);

const out = [
  '// 생성 파일: node scripts/gen-words.mjs 로 다시 만든다. 직접 고치지 않는다.',
  `// 한글로 조합되는 영어 단어 ${sorted.length}개. 원본은 SCOWL이며 저작권 고지는 다음과 같다.`,
  ...header.split('\n').map((line) => `// ${line}`.trimEnd()),
  'const ENGLISH_WORDS = new Set([',
  ...lines,
  ']);',
  "if (typeof module !== 'undefined') module.exports = ENGLISH_WORDS;",
  '',
].join('\n');

writeFileSync(new URL('../extension/src/words.js', import.meta.url), out);
console.log(`words.js: ${sorted.length}개`);
