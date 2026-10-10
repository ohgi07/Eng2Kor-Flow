// HTML 파일이나 주소를 헤드리스 크롬으로 지정한 크기의 PNG로 찍는다 (스토어 이미지용).
// 사용법: node scripts/screenshot.mjs <html 파일 또는 http 주소> <너비> <높이> <출력 png> [배율]
// 배율을 주면 너비×배율, 높이×배율 크기로 찍힌다 (예: 640 400 ... 2 → 1280×800).
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const [target, width, height, out, scale = '1'] = process.argv.slice(2);
if (!out) {
  console.error('사용법: node scripts/screenshot.mjs <html 파일 또는 http 주소> <너비> <높이> <출력 png> [배율]');
  process.exit(1);
}
const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=3000',
  `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`, `--screenshot=${resolve(out)}`, url,
], { stdio: ['ignore', 'inherit', 'ignore'] });
