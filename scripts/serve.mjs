// playground용 정적 서버 (개발 전용, 의존성 없음). 사용법: node scripts/serve.mjs
// 8080은 playground, 8081은 다른 origin iframe용이다.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

async function handle(req, res) {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://localhost').pathname)));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}

for (const port of [8080, 8081]) {
  createServer(handle).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/test/playground.html`));
}
