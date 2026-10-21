// 실제 크롬에 키 입력을 보내 편집기별 변환 결과를 확인한다. 의존성 없이 DevTools 프로토콜을 쓴다.
// 크롬을 찾지 못하면 건너뛴다. 경로는 CHROME 환경 변수로 줄 수 있다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((path) => path && existsSync(path));
const skip = !CHROME ? '크롬을 찾지 못했습니다 (CHROME 환경 변수로 경로 지정)'
  : typeof WebSocket === 'undefined' ? 'WebSocket이 없는 Node입니다 (22 이상 필요)' : false;

// ── 정적 서버 ──
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://localhost').pathname)));
    if (!path.startsWith(ROOT)) return res.writeHead(403).end();
    let body;
    try {
      body = await readFile(path);
    } catch {
      return res.writeHead(404).end();
    }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ── 크롬과 DevTools 프로토콜 ──
async function launch() {
  const profile = await mkdtemp(join(tmpdir(), 'eng2kor-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'];
  if (process.getuid?.() === 0) args.push('--no-sandbox');
  const proc = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let log = '';
    proc.stderr.on('data', (chunk) => {
      log += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(log);
      if (match) resolve(match[1]);
    });
    proc.on('exit', () => reject(new Error(`크롬이 종료됨\n${log}`)));
  });
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const calls = new Map();
  const listeners = new Set();
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    const call = calls.get(msg.id);
    if (!call) return listeners.forEach((fn) => fn(msg));
    calls.delete(msg.id);
    if (msg.error) call.reject(new Error(msg.error.message));
    else call.resolve(msg.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    id += 1;
    calls.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const close = async () => {
    ws.close();
    proc.kill();
    await new Promise((resolve) => (proc.exitCode === null ? proc.once('exit', resolve) : resolve()));
    await rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  };
  return { send, listeners, close };
}

const SHIFTED = { '(': '9', ')': '0', '!': '1', '?': '/', ':': ';', '"': "'", '~': '`', '{': '[', '}': ']' };
const CODES = {
  ' ': ['Space', 32], '.': ['Period', 190], ',': ['Comma', 188], ';': ['Semicolon', 186], "'": ['Quote', 222],
  '/': ['Slash', 191], '`': ['Backquote', 192], '[': ['BracketLeft', 219], ']': ['BracketRight', 221],
};
const NAMED = {
  Enter: { key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 },
  Backspace: { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 },
};
const SHIFT = { key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 };
NAMED.Shift = { ...SHIFT, modifiers: 8 };

function keyOf(ch) {
  const base = SHIFTED[ch] ?? ch.toLowerCase();
  const [code, vk] = /[a-z]/.test(base) ? [`Key${base.toUpperCase()}`, base.toUpperCase().charCodeAt(0)]
    : /[0-9]/.test(base) ? [`Digit${base}`, base.charCodeAt(0)] : CODES[base];
  return { key: ch, code, text: ch, windowsVirtualKeyCode: vk, shift: ch in SHIFTED || /[A-Z]/.test(ch) };
}

async function openPage(browser) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  const key = async ({ shift, ...k }) => {
    const modifiers = shift ? 8 : 0;
    if (shift) await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers, ...SHIFT });
    await send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', modifiers, ...k });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, ...k, text: undefined });
    if (shift) await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, ...SHIFT });
  };

  const page = {
    async goto(url) {
      const loaded = new Promise((resolve) => {
        const fn = (msg) => {
          if (msg.sessionId !== sessionId || msg.method !== 'Page.loadEventFired') return;
          browser.listeners.delete(fn);
          resolve();
        };
        browser.listeners.add(fn);
      });
      await send('Page.navigate', { url });
      await loaded;
    },
    async eval(expression) {
      const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    },
    // {Enter}, {Backspace}, {Shift}는 그 키를, ASCII가 아닌 글자는 IME 확정처럼 한 번에 넣는다. 키 사이에 기다리지 않는다.
    async type(sequence) {
      for (const [, name, other, ascii] of sequence.matchAll(/\{(\w+)\}|([^\x00-\x7f]+)|([\s\S])/g)) {
        if (name) await key(NAMED[name]);
        else if (other) await send('Input.insertText', { text: other });
        else await key(keyOf(ascii));
      }
      await page.eval('new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)))');
    },
  };
  return page;
}

// ── 시나리오 ──
// 자체 모델 편집기 흉내는 test/editors.html에 있다. 화면과 모델이 둘 다 기대값이어야 한다.
const TARGETS = ['input', 'textarea', 'plain', 'sync', 'react', 'swallow', 'strict'];
// swallow·strict는 변환을 반영할 수 없는 편집기다. 바꾸지 못하더라도 친 글자는 그대로 남아야 한다.
const UNCONVERTIBLE = new Set(['swallow', 'strict']);
const CASES = [
  { name: '닫는 괄호로 변환', keys: '(dkssud)', expected: '(안녕)', kept: '(dkssud)' },
  { name: '영어 뒤 닫는 괄호', keys: 'hello)', expected: 'hello)' },
  { name: '한글 뒤 닫는 괄호', keys: '안녕)', expected: '안녕)' },
  { name: '여는 괄호는 트리거가 아님', keys: 'dkssud(', expected: 'dkssud(' },
  { name: '빠른 연속 입력', keys: '(dkssud) gkrh, (whgdk)! dkssud.', expected: '(안녕) 하고, (좋아)! 안녕.', kept: '(dkssud) gkrh, (whgdk)! dkssud.' },
  { name: '괄호 변환 직후 Backspace', keys: '(dkssud){Backspace}', expected: '(dkssud' },
  { name: 'Shift만 눌렀다 떼도 Backspace로 되돌린다', keys: '(dkssud){Shift}{Backspace}', expected: '(dkssud' },
  { name: '스페이스 변환 뒤 Backspace 두 번', keys: 'dkssud {Backspace}{Backspace}', expected: 'dkssud', kept: 'dkssu' },
];

// 화면 글자. 모델이 화면과 다르면 "화면 | 모델: 모델 글자"로 돌려준다.
function readTarget(page, id) {
  return page.eval(`(() => {
    const el = document.getElementById(${JSON.stringify(id)});
    const dom = el.localName === 'div' ? el.textContent : el.value;
    const model = window.editors?.[${JSON.stringify(id)}]?.text ?? dom;
    return model === dom ? dom : \`\${dom} | 모델: \${model}\`;
  })()`);
}

test('브라우저: 편집기별 키 입력', { skip }, async (t) => {
  const server = await serve();
  const browser = await launch();
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await openPage(browser);
    for (const query of ['direct=1', 'direct=1&preview=0']) {
      for (const c of CASES) {
        await t.test(`${c.name} [${query}]`, async () => {
          const actual = {};
          const expected = {};
          for (const id of TARGETS) {
            await page.goto(`${base}/test/editors.html?${query}`);
            await page.eval(`document.getElementById(${JSON.stringify(id)}).focus()`);
            await page.type(c.keys);
            actual[id] = await readTarget(page, id);
            expected[id] = UNCONVERTIBLE.has(id) ? c.kept ?? c.expected : c.expected;
          }
          assert.deepEqual(actual, expected);
        });
      }
    }

    await t.test('Enter 전송 전에 변환이 모델에 들어간다', async () => {
      for (const id of ['sync', 'react', 'swallow', 'strict']) {
        await page.goto(`${base}/test/editors.html?direct=1`);
        await page.eval(`document.getElementById(${JSON.stringify(id)}).focus()`);
        await page.type('(dkssud{Enter}');
        const sent = await page.eval(`window.editors.${id}.sent`);
        assert.deepEqual(sent, [UNCONVERTIBLE.has(id) ? '(dkssud' : '(안녕'], id);
      }
    });

    // 실제 Slate. esm.sh에서 불러오지 못하면 건너뛴다.
    await t.test('Slate', async (st) => {
      await page.goto(`${base}/test/slate.html?direct=1`);
      const ready = await page.eval(`new Promise((resolve) => {
        const started = performance.now();
        (function poll() {
          if (window.slateText) resolve(true);
          else if (performance.now() - started > 10000) resolve(false);
          else setTimeout(poll, 50);
        })();
      })`);
      if (!ready) return st.skip('Slate를 불러오지 못했습니다 (esm.sh 접속 필요)');
      for (const [keys, want] of [['(dkssud)', '(안녕)'], ['(dkssud){Backspace}', '(dkssud'], ['dkssud dkssud) dkssud.', '안녕 안녕) 안녕.']]) {
        await page.goto(`${base}/test/slate.html?direct=1`);
        await page.eval(`new Promise((resolve) => (function poll() { window.slateText ? resolve() : setTimeout(poll, 50); })())`);
        await page.eval(`document.querySelector('[data-slate-editor]').focus()`);
        await page.type(keys);
        assert.equal(await page.eval('window.slateText()'), want, `${keys} 모델`);
        assert.equal(await page.eval(`document.querySelector('[data-slate-editor]').textContent.replace(/\\uFEFF/g, '')`), want, `${keys} 화면`);
      }
    });
  } finally {
    await browser.close();
    server.close();
  }
});
