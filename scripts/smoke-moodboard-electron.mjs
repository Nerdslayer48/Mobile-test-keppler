import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const profile = await mkdtemp(path.join(tmpdir(), 'keppler-moodboard-smoke-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const executable = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('node_modules/electron/dist/electron.exe');
const child = spawn(executable, [...(process.argv[2] ? [] : ['.']), '--remote-debugging-port=0', `--user-data-dir=${profile}`], { env, windowsHide: true, stdio: 'ignore' });
let socket; let sequence = 0; const pending = new Map();
function send(method, params = {}) { const id = ++sequence; return new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 10000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value; }
async function until(check) { for (let index = 0; index < 160; index++) { const result = await check(); if (result) return result; await delay(100); } throw new Error('Timed out waiting for offline UI'); }
async function reload() { const previous = await evaluate('window.startupDocumentId'); await send('Page.reload'); await until(() => evaluate(`window.startupDocumentId !== ${JSON.stringify(previous) ?? 'undefined'} && typeof window.startupDocumentId === 'number' && document.readyState === "complete" && document.getElementById("root")?.childElementCount > 0`)); }

const token = '6'.repeat(64);
const company = { id:'board-test-company', companyName:'Board test', companyEmail:'board@example.test', createdAt:new Date().toISOString() };
const client = { id:'board-test-client', companyId:company.id, name:'Test client', clientType:'individual', firstName:'Test', lastName:'client', email:'',phone:'',address:'',otherContact:'',companyName:'',companyAddress:'',hotline:'' };
const project = { id:'board-test-project', clientId:client.id, companyId:company.id, name:'Test moodboard', categories:['UI/UX Design'] };
const snapshot = { token, company, session:{id:'board-test-session',companyId:company.id,authenticatedAt:Date.now(),expiresAt:Date.now()+3600000},datasets:[{key:'keppler.clients',value:[client],version:1},{key:`projects.${client.id}`,value:[project],version:1}] };
const board = [
  {id:'section',kind:'section',name:'Section',x:100,y:150,width:800,height:550},
  {id:'inside',kind:'text',name:'Inside card',title:'Inside card',x:300,y:320,width:280,inputs:[]},
  {id:'outside',kind:'text',name:'Outside card',title:'Outside card',x:1000,y:200,width:280,inputs:[]}
];
async function click(label) { await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`); }
async function openBoard() { await evaluate(`document.querySelector('[aria-label="Open Test moodboard mood board"]').click()`); }
async function pointerDrag(x,y,dx,dy) {
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+dx,y:y+dy,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+dx,y:y+dy,button:'left',buttons:0,clickCount:1});
}
try {
  const port = await until(async () => { try { return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return null; } });
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); };
  await until(() => evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  await send('Page.enable');

  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.startupDocumentId=Math.random();window.boardMode='slow';window.boardReads=0;window.mockBoard=${JSON.stringify(board)};window.boardVersion=1;
    window.fetch=async (url,options={})=>{
      if(!String(url).includes('/boards/'))throw new Error('Unexpected API request');
      if(options.method==='PUT'){const data=JSON.parse(options.body);window.mockBoard=data.value;return Response.json({version:++window.boardVersion});}
      window.boardReads++;
      if(window.boardMode==='error')throw new TypeError('Forced offline');
      if(window.boardMode==='slow')return new Promise((resolve,reject)=>{window.finishLoading=()=>resolve(Response.json({value:window.mockBoard,version:window.boardVersion}));options.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
      return Response.json({value:window.mockBoard,version:window.boardVersion});
    };
  `});
  await evaluate(`localStorage.setItem('keppler.onlineSession',${JSON.stringify(token)});localStorage.setItem('keppler.sessionSnapshot',${JSON.stringify(JSON.stringify(snapshot))});location.hash=${JSON.stringify(`/project?clientId=${client.id}`)}`);
  await reload();
  await until(()=>evaluate('document.querySelector(\'[aria-label="Open Test moodboard mood board"]\')!==null'));
  await openBoard();
  await until(()=>evaluate('document.querySelector(\'[aria-label="Loading moodboard"]\')!==null && typeof window.finishLoading==="function"'));
  assert.equal(await evaluate('document.querySelectorAll("[data-media-id]").length'),0);
  assert.equal(await evaluate('document.querySelector(\'[aria-label="New card"]\').disabled'),true);
  console.log('PASS: slow board requests show a loading screen and block editing before data arrives.');
  const reads=await evaluate('window.boardReads');
  await delay(15500);
  assert.equal(await evaluate('window.boardReads'),reads);
  assert.equal(await evaluate('document.body.innerText.includes("Still loading.")'),true);
  console.log('PASS: slow-loading guidance appears and a pending request is not restarted by automatic retries.');
  await evaluate('window.finishLoading()');
  await until(()=>evaluate('document.querySelector(\'[data-media-id="section"]\')!==null && document.querySelector(\'[aria-label="Loading moodboard"]\')===null'));
  await evaluate('document.querySelector(\'[data-media-id="section"]\').dispatchEvent(new MouseEvent("dblclick",{bubbles:true}))');
  await until(()=>evaluate('document.querySelector(\'[data-media-id="section"]\').style.outline.includes("primary")'));
  const bounds=await evaluate('(()=>{const r=document.querySelector(\'[data-media-id="section"]\').getBoundingClientRect();return {x:r.x+25,y:r.y+80};})()');
  await pointerDrag(bounds.x,bounds.y,40,25);
  await until(()=>evaluate('document.querySelector(\'[data-media-id="section"]\').style.left==="140px"'));
  assert.equal(await evaluate('document.querySelector(\'[data-media-id="inside"]\').style.left'),'340px');
  assert.equal(await evaluate('document.querySelector(\'[data-media-id="inside"]\').style.top'),'345px');
  assert.equal(await evaluate('document.querySelector(\'[data-media-id="outside"]\').style.left'),'1000px');
  console.log('PASS: dragging a selected section moves its contents and leaves outside items in place.');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  const area=await evaluate('(()=>{const r=document.querySelector(\'[data-media-id="section"]\').getBoundingClientRect();return {x:r.x+70,y:r.y+100};})()');
  await pointerDrag(area.x,area.y,650,400);
  await until(()=>evaluate('document.querySelector(\'[aria-label="Move selected items"]\')!==null'));
  assert.equal(await evaluate('document.querySelector(\'[aria-label="Move selected items"]\').style.width'),'320px');
  console.log('PASS: drag selection inside an unselected section selects the card and ignores the section.');
  await evaluate('document.querySelector(\'[aria-label="Back to projects"]\').click();window.boardMode="error"');
  await until(()=>evaluate('document.querySelector(\'[aria-label="Open Test moodboard mood board"]\')!==null'));
  await openBoard();await until(()=>evaluate('document.querySelector(\'[aria-label="Moodboard loading failed"]\')!==null'));
  await evaluate('window.boardMode="ready"');await click('Try again');
  await until(()=>evaluate('document.querySelector(\'[data-media-id="inside"]\')!==null && document.querySelector(\'[aria-label="Moodboard loading failed"]\')===null'));
  console.log('PASS: load failures show a retry screen, and retry opens the saved board.');
} catch (error) { console.error(await evaluate('JSON.stringify({id:window.startupDocumentId,count:window.apiAttempts,ready:document.readyState,url:location.href,text:document.body?.innerText})').catch(()=>'Unable to inspect renderer')); throw error; } finally {
  socket?.close(); child.kill(); for (const item of pending.values()) clearTimeout(item.timer);
  await delay(1200); assert.ok(path.resolve(profile).startsWith(path.resolve(tmpdir()) + path.sep));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
