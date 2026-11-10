import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const profile = await mkdtemp(path.join(tmpdir(), 'keppler-startup-smoke-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const executable = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('node_modules/electron/dist/electron.exe');
const child = spawn(executable, [...(process.argv[2] ? [] : ['.']), '--remote-debugging-port=0', `--user-data-dir=${profile}`], { env, windowsHide: true, stdio: 'ignore' });
let socket; let sequence = 0; const pending = new Map();
function send(method, params = {}) { const id = ++sequence; return new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 10000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value; }
async function until(check) { for (let index = 0; index < 160; index++) { const result = await check(); if (result) return result; await delay(100); } throw new Error('Timed out waiting for offline UI'); }
async function reload() { const previous = await evaluate('window.startupDocumentId'); await send('Page.reload'); await until(() => evaluate(`window.startupDocumentId !== ${JSON.stringify(previous) ?? 'undefined'} && typeof window.startupDocumentId === 'number' && document.readyState === "complete" && document.getElementById("root")?.childElementCount > 0`)); }
const token = '7'.repeat(64);
const company = { id: 'startup-company', companyName: 'Cached company', companyEmail: 'owner@example.test', createdAt: new Date().toISOString() };
const snapshot = { token, company, session: { id: 'startup-session', companyId: company.id, authenticatedAt: Date.now(), expiresAt: Date.now() + 3600000 }, datasets: [{ key: 'keppler.clients', version: 1, value: [{ id: 'client-one', companyId: company.id, name: 'Cached client', clientType: 'individual', firstName: 'Cached', lastName: 'client', email: '', phone: '', address: '', otherContact: '', companyName: '', companyAddress: '', hotline: '' }] }] };
try {
  const port = await until(async () => { try { return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return null; } });
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); };
  await until(() => evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.startupDocumentId = Math.random(); window.apiAttempts = 0; window.fetch = async () => { window.apiAttempts++; throw new TypeError('Forced offline'); };` });
  await evaluate(`localStorage.clear(); localStorage.setItem('keppler.onlineSession', ${JSON.stringify(token)})`);
  await reload();
  await until(() => evaluate('document.body.innerText.includes("Welcome to Keppler")'));
  assert.equal(await evaluate('window.apiAttempts'), 0);
  console.log('PASS: startup with a legacy token opens Welcome without an API request.');

  await evaluate(`localStorage.setItem('keppler.onlineSession', ${JSON.stringify(token)}); localStorage.setItem('keppler.sessionSnapshot', ${JSON.stringify(JSON.stringify(snapshot))})`);
  await reload(); await until(() => evaluate('document.body.innerText.includes("Cached client")'));
  await evaluate('window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online"))');
  await delay(300);
  assert.equal(await evaluate('window.apiAttempts'), 0);
  assert.equal(await evaluate('document.querySelector("[role=alert]") === null'), true);
  console.log('PASS: cached workspace and clients open offline; focus and online events do not probe the API.');

  await evaluate(`const saved=JSON.parse(localStorage.getItem('keppler.sessionSnapshot')); saved.session.expiresAt=Date.now()-1; localStorage.setItem('keppler.sessionSnapshot', JSON.stringify(saved))`);
  await reload(); await until(() => evaluate('document.body.innerText.includes("Welcome to Keppler")'));
  assert.equal(await evaluate('window.apiAttempts'), 0);
  console.log('PASS: an expired local session returns to Welcome without a network check.');

  assert.equal(await evaluate('document.querySelector("section button").textContent.trim()'), 'Staff sign in');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Company sign in').click()`);
  await until(() => evaluate('document.querySelector("[name=password]") !== null'));
  await evaluate(`document.querySelector('button[aria-label="Back to welcome"]').click()`);
  await until(() => evaluate('document.body.innerText.includes("Welcome to Keppler")'));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Staff sign in').click()`);
  await until(() => evaluate('document.querySelector("[name=accessToken]") !== null'));
  assert.equal(await evaluate('document.querySelector("[name=password]") === null'), true);
  console.log('PASS: staff sign-in is the primary welcome action; company sign-in remains available.');
  await evaluate(`for(const [name,value] of Object.entries({companyEmail:'staff@example.test',accessToken:'test-token'})){const input=document.querySelector('[name='+name+']');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await evaluate('document.querySelector("form").requestSubmit()');
  await until(() => evaluate('document.querySelector("[role=alert]")?.innerText.includes("connection")'));
  assert.equal(await evaluate('window.apiAttempts'), 1);
  console.log('PASS: the API is contacted when Sign in is submitted, and offline failures stay in the sign-in form.');
} catch (error) { console.error(await evaluate('JSON.stringify({id:window.startupDocumentId,count:window.apiAttempts,ready:document.readyState,url:location.href,text:document.body?.innerText})').catch(()=>'Unable to inspect renderer')); throw error; } finally {
  if (socket?.readyState === WebSocket.OPEN) await send('Page.close').catch(() => {});
  socket?.close(); child.kill(); for (const item of pending.values()) clearTimeout(item.timer);
  await delay(1200); assert.ok(path.resolve(profile).startsWith(path.resolve(tmpdir()) + path.sep));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
