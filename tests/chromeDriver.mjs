// Drives one headless Chrome over the DevTools protocol (Node's own WebSocket, no library) and serves app/ for it.
import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const APP = join(REPO, 'app');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Serves app/ on a free localhost port; resolves to { url, close }. */
export function serveApp() {
  const server = createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(APP, normalize(pathname)));
    if (!file.startsWith(APP + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (!statSync(file).isFile()) throw new Error('not a file');
    } catch {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      done({ url: `http://127.0.0.1:${port}/`, close: () => new Promise((ok) => server.close(ok)) });
    });
  });
}

/** Rejects after `ms` with `label`, so no step can hang the laptop. */
function deadline(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Starts headless Chrome with a throwaway profile inside the repo's .cache/ and opens one page.
 * Resolves to { send, evaluate, navigate, setViewport, logs, close }.
 */
export async function launchChrome({ width = 1280, height = 720 } = {}) {
  const profile = mkdtempSync(join(REPO, '.cache-chrome-'));
  const child = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await deadline(new Promise((done, fail) => {
    let text = '';
    child.stderr.on('data', (chunk) => {
      text += chunk;
      const match = text.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) done(match[1]);
    });
    child.on('exit', () => fail(new Error('chrome exited early')));
  }), 20000, 'chrome start');

  const socket = new WebSocket(wsUrl);
  await deadline(new Promise((done) => socket.addEventListener('open', done, { once: true })), 10000, 'ws open');
  let nextId = 1;
  const pending = new Map();
  const logs = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { done, fail } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) fail(new Error(message.error.message));
      else done(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      logs.push(`exception: ${message.params.exceptionDetails.exception?.description ?? 'unknown'}`);
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const args = message.params.args.map((a) => a.value ?? a.description).join(' ');
      logs.push(`${message.params.type}: ${args}`);
    }
  });
  const raw = (method, params = {}, sessionId) => new Promise((done, fail) => {
    const id = nextId++;
    pending.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params, ms = 60000) => deadline(raw(method, params, sessionId), ms, method);
  await send('Page.enable');
  await send('Runtime.enable');

  const setViewport = (w, h) => send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: 1, mobile: false,
  });
  await setViewport(width, height);

  /** Evaluates an expression in the page, awaiting a promise result; returns its value. */
  const evaluate = async (expression, ms = 60000) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, ms);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  };
  /** Opens a URL and waits until the page sets window.__shotReady (or `readyExpr` turns true). */
  const navigate = async (url, readyExpr = 'window.__shotReady === true', ms = 30000) => {
    await send('Page.navigate', { url });
    const start = Date.now();
    while (Date.now() - start < ms) {
      const ready = await evaluate(`Boolean(${readyExpr})`).catch(() => false);
      if (ready) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`page not ready: ${url}\n${logs.join('\n')}`);
  };
  const close = async () => {
    try {
      socket.close();
    } catch {
      // already closed
    }
    child.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 300));
    rmSync(profile, { recursive: true, force: true });
  };
  /** Sends a browser-level command (Browser.*), outside the page session. */
  const sendBrowser = (method, params) => deadline(raw(method, params), 30000, method);
  return { send, sendBrowser, evaluate, navigate, setViewport, logs, close };
}
