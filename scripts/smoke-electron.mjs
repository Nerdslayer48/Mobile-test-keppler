import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Test a real packaged executable with an isolated, disposable user profile.
const profile = await mkdtemp(path.join(tmpdir(), 'keppler-smoke-'));
const executable = path.resolve(process.argv[2] ?? 'release/win-unpacked/Keppler.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, ['--remote-debugging-port=0', `--user-data-dir=${profile}`], { env, stdio: 'ignore' });
let launchError;
child.on('error', (error) => { launchError = error; });
let socket;
const pending = new Map();
let sequence = 0;
async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    const value = await check();
    if (value) return value;
    await delay(200);
  }
  throw new Error('Timed out waiting for the packaged app');
}
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
try {
  const port = await until(async () => {
    try { return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { return null; }
  });
  const page = await until(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    return targets.find((target) => target.type === 'page' && target.url.startsWith('file:'));
  });
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  await until(() => evaluate('document.querySelector("#root")?.childElementCount > 0'));
  assert.equal(await evaluate('typeof window.require'), 'undefined');
  await delay(500);
  await evaluate(`localStorage.setItem('keppler.clients', JSON.stringify([{
    id: 'smoke-client', name: 'Beta Test', clientType: 'individual', firstName: 'Beta', lastName: 'Test',
    email: '', phone: '', address: '', otherContact: '', companyName: '', companyAddress: '', hotline: ''
  }])); location.reload();`);
  await until(() => evaluate('document.body?.innerText.includes("Beta Test")'));
  await evaluate('document.querySelector("[role=link]").click()');
  await until(() => evaluate('location.hash.includes("clientId=smoke-client") && document.body?.innerText.includes("Create new")'));
  assert.equal(await evaluate('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)'), true);
  await evaluate('location.reload()');
  await until(() => evaluate('document.body?.innerText.includes("Create new")'));
  await evaluate(`document.querySelector('[aria-label="Back to clients"]').click()`);
  await until(() => evaluate('location.hash === "#/" && document.body?.innerText.includes("Beta Test")'));
  await evaluate('location.hash = "/workspace"');
  await until(() => evaluate('document.querySelector("video") !== null || document.body?.innerText.includes("Untitled board")'));
  assert.equal(await evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('keppler-workspaces', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; const ok = db.objectStoreNames.contains('boards'); db.close(); resolve(ok); };
  })`), true);
  console.log('PASS: packaged rendering, sandbox, client storage, project navigation, assets, reload, back navigation, and workspace IndexedDB.');
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    console.error(await evaluate('JSON.stringify({url: location.href, text: document.body?.innerText, clients: localStorage.getItem("keppler.clients")})'));
  }
  throw error;
} finally {
  socket?.close();
  child.kill();
  await delay(1500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
