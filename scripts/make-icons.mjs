// extension/icons/icon.svg를 헤드리스 크롬의 캔버스로 래스터화해 16/32/48/128 PNG를 만든다.
// 16/32/48은 꽉 채우고, 스토어와 설치 화면에 쓰이는 128은 웹스토어 규격대로 96×96 그림에 사방 16px 투명 여백을 둔다.
// 사용법: node scripts/make-icons.mjs   (크롬 경로는 환경 변수 CHROME으로 바꿀 수 있다)
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CHROME = process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const SIZES = [16, 32, 48, 128];
const PADDING = { 128: 16 };

const svg = readFileSync(new URL('../extension/icons/icon.svg', import.meta.url));
const svgUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`;
const html = `<!doctype html><body><pre id="out"></pre><script>
const img = new Image();
img.onload = () => {
  const out = {};
  for (const size of ${JSON.stringify(SIZES)}) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const pad = ${JSON.stringify(PADDING)}[size] ?? 0;
    canvas.getContext('2d').drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
    out[size] = canvas.toDataURL('image/png');
  }
  document.getElementById('out').textContent = JSON.stringify(out);
};
img.src = ${JSON.stringify(svgUrl)};
</script>`;

const page = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', page], { encoding: 'utf8' });
const json = /<pre id="out">(.*?)<\/pre>/s.exec(dom)?.[1];
if (!json) throw new Error('아이콘 렌더링 결과를 찾지 못했습니다');

for (const [size, url] of Object.entries(JSON.parse(json))) {
  writeFileSync(new URL(`../extension/icons/icon${size}.png`, import.meta.url), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`extension/icons/icon${size}.png`);
}
