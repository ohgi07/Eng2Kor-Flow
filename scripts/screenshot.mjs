// HTML 파일을 헤드리스 크롬으로 지정한 크기의 PNG로 찍는다 (스토어 이미지용).
// 사용법: node scripts/screenshot.mjs <html 파일> <너비> <높이> <출력 png>
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const [file, width, height, out] = process.argv.slice(2);
if (!out) {
  console.error('사용법: node scripts/screenshot.mjs <html 파일> <너비> <높이> <출력 png>');
  process.exit(1);
}
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--window-size=${width},${height}`, `--screenshot=${resolve(out)}`, pathToFileURL(resolve(file)).href,
], { stdio: ['ignore', 'inherit', 'ignore'] });
