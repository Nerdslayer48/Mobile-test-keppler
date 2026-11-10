import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import { connectDatabase } from '../server/db.ts';
import { companies } from '../server/schema.ts';

const profile=await mkdtemp(path.join(tmpdir(),'keppler-online-smoke-'));
const executable=path.resolve(process.argv.includes('--local')?'node_modules/electron/dist/electron.exe':process.argv[2]??'release/win-unpacked/Keppler.exe');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(executable,[...(process.argv.includes('--local')?['.']:[]),'--remote-debugging-port=0',`--user-data-dir=${profile}`],{env,stdio:'ignore',windowsHide:true});
let launchError;child.once('error',error=>{launchError=error;});
const requireRemote=process.argv.includes('--require-remote');
const networkUrls=[];
let socket;let sequence=0;const pending=new Map();let companyId;let ownerToken;
const connection=connectDatabase();const base=process.env.VITE_API_URL??JSON.parse(await readFile(new URL('../app-config.json',import.meta.url),'utf8')).apiUrl;
async function until(check){for(let i=0;i<160;i++){if(launchError)throw launchError;const result=await check();if(result)return result;await delay(200);}throw new Error('Timed out waiting for UI');}
function send(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out: ${method}`));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});assert.ok(!result.exceptionDetails,'Renderer evaluation failed');return result.result.value;}
async function click(label){await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`);}
async function selectorClick(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);}
async function exists(selector){return evaluate(`document.querySelector(${JSON.stringify(selector)}) !== null`);}
async function fill(fields){await evaluate(`Object.entries(${JSON.stringify(fields)}).forEach(([selector,value])=>{const input=document.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));})`);}
async function api(route,token=ownerToken){const response=await fetch(base+route,{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,200,route);return response.json();}
async function submit(){await evaluate('document.querySelector("form").requestSubmit()');}
const suffix=Date.now().toString(36);const companyEmail=`ui-${suffix}@example.test`;const staffEmail=`ui-staff-${suffix}@example.test`;
try{
  const port=await until(async()=>{try{return(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{return null;}});
  const page=await until(async()=>{const pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();return pages.find(page=>page.type==='page');});
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.method==='Network.requestWillBeSent' && /^https?:/.test(message.params.request.url))networkUrls.push(message.params.request.url);const item=pending.get(message.id);if(!item)return;pending.delete(message.id);clearTimeout(item.timer);if(message.error)item.reject(new Error(message.error.message));else item.resolve(message.result);};
  if(requireRemote){await send('Network.enable');await send('Network.setBlockedURLs',{urls:['http://localhost:*/*','http://127.0.0.1:*/*','http://[::1]:*/*']});}
  await send('Page.setInterceptFileChooserDialog',{enabled:true});
  await until(()=>evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  await click('Create company');await until(()=>evaluate('document.querySelector("input[name=confirmPassword]") !== null'));
  await fill({'[name=companyName]':'Online UI Company','[name=companyEmail]':companyEmail,'[name=password]':'Online UI password 123','[name=confirmPassword]':'Online UI password 123'});await submit();
  await until(()=>exists('[aria-label="Search clients"]'));
  ownerToken=await evaluate('localStorage.getItem("keppler.onlineSession")');const me=await api('/me');companyId=me.company.id;
  console.log('PASS UI: company signup opens the Neon-backed workspace.');
  await click('Staff');await until(()=>evaluate('document.body?.innerText.includes("+ New Staff")'));
  await click('+ New Staff');await fill({'[name=name]':'Online Staff','[name=email]':staffEmail,'[name=role]':'Designer'});await submit();
  await until(()=>evaluate('document.querySelector("dialog")?.open === true'));
  const staffToken=await evaluate(`document.querySelector('input[aria-label="Staff access token"]').value`);assert.equal(staffToken.length,64);
  await click('Copy token');await until(()=>evaluate('document.body?.innerText.includes("Token copied")'));await click('Close');await until(()=>evaluate('document.querySelector("dialog") === null'));
  await selectorClick('[aria-label="Show login token for Online Staff"]');await until(()=>evaluate('document.querySelector("dialog")?.open === true'));await click('Close');await until(()=>evaluate('document.querySelector("dialog") === null'));
  console.log('PASS UI: staff creation, token modal, and copy action.');
  await selectorClick('[aria-label="Back to home"]');await until(()=>exists('[aria-label="Search clients"]'));
  await click('+ New Client');await until(()=>evaluate('document.querySelector("input[placeholder=John]") !== null'));
  await fill({'input[placeholder=John]':'Cloud','input[placeholder=Doe]':'Client'});await click('Done');
  await until(async()=>{const me=await api('/me');return me.datasets.some(record=>record.key==='keppler.clients'&&record.value.some(client=>client.name==='Cloud Client'));});
  await fill({'[aria-label="Search clients"]':'not found'});await until(()=>evaluate('document.body?.innerText.includes("No matching clients")'));await fill({'[aria-label="Search clients"]':''});
  await selectorClick('[role=link]');await until(()=>evaluate('document.body?.innerText.includes("Create new")'));
  await selectorClick('[aria-label="Create project"]');
  await until(()=>evaluate('document.querySelector("#project-name") !== null'));
  await fill({'#project-name':'Cloud Project','#add-project':'UI/UX Design'});await selectorClick('[role=option]');await click('Create Project');
  await until(()=>exists('[aria-label="Open Cloud Project mood board"]'));
  await click('+ New Invoice');await until(()=>exists('[aria-label="Select invoice projects"]'));
  await evaluate(`document.querySelector('[aria-label="Select invoice projects"] input[type=checkbox]').click()`);
  await until(()=>evaluate(`document.querySelector('[aria-label="Select invoice projects"] input[type=checkbox]').checked === false`));
  await evaluate(`document.querySelector('[aria-label="Select invoice projects"] input[type=checkbox]').click()`);
  await click('Create invoice (1)');await until(()=>exists('[aria-label="Invoice editor"]'));
  await fill({'[aria-label="Amount 1"]':'1000.10','[aria-label="Invoice tax rate"]':'7.5'});
  await until(()=>evaluate('document.querySelector("[data-invoice-page]").innerText.includes("1,075.11")'));
  assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-invoice-page]")).width'),'794px');
  await mkdir('build',{recursive:true});
  const invoiceBox=await evaluate('(()=>{const r=document.querySelector("[data-invoice-page]").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()');
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:invoiceBox});
  await writeFile('build/invoice-preview.png',Buffer.from(screenshot.data,'base64'));
  const downloads=path.join(profile,'downloads');await mkdir(downloads,{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  for(let index=0;index<5;index++) await click('+ Add row');
  await until(()=>evaluate('document.querySelectorAll("[data-invoice-page]").length===2'));
  await click('Download PDF');
  const pdf=await until(async()=> (await readdir(downloads)).find(name=>name.endsWith('.pdf')));
  const pdfBytes=await readFile(path.join(downloads,pdf));
  assert.equal(pdfBytes.subarray(0,5).toString(),'%PDF-');
  assert.ok(pdfBytes.toString('latin1').includes('/Count 2'));
  await until(()=>evaluate('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Download image" && !button.disabled)'));
  await click('Download image');
  const png=await until(async()=> (await readdir(downloads)).find(name=>name.endsWith('.png')));
  const pngBytes=await readFile(path.join(downloads,png));
  assert.equal(pngBytes.subarray(1,4).toString(),'PNG');
  assert.equal(pngBytes.readUInt32BE(20),4492);
  await writeFile('build/invoice-export.png',await readFile(path.join(downloads,png)));
  await writeFile('build/invoice-export.pdf',await readFile(path.join(downloads,pdf)));
  await until(()=>evaluate('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Download image" && !button.disabled)'));
  await selectorClick('[aria-label="Close invoice"]');
  console.log('PASS UI: invoice project selection, NGN tax totals, A4 preview, PDF and PNG downloads.');
  await selectorClick('[aria-label="Open Cloud Project mood board"]');await until(()=>exists('[aria-label="Workspace tools"]'));
  await until(()=>evaluate(`document.querySelector('[aria-label="New card"]')?.disabled === false`));
  await selectorClick('[aria-label="New card"]');
  const projectData=await api('/me');const projects=projectData.datasets.find(record=>record.key.startsWith('projects.')).value;const project=projects[0];const boardKey=encodeURIComponent(JSON.stringify([companyId,project.clientId,project.id]));
  await until(async()=>{const board=await api(`/boards/${boardKey}`);return board.value.some(card=>card.kind==='text');});
  await selectorClick('[aria-label="Upload media"]');
  await evaluate(`new Promise(resolve=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.getContext('2d').fillRect(0,0,8,8);canvas.toBlob(blob=>{const transfer=new DataTransfer();transfer.items.add(new File([blob],'online.png',{type:'image/png'}));const input=document.querySelector('input[aria-label="Import media"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));resolve(true);});})`);
  await until(async()=>{const board=await api(`/boards/${boardKey}`);return board.value.some(card=>card.kind==='image'&&card.file?.mediaId);});
  console.log('PASS UI: client/project creation, search, board save, and media upload persisted to Neon.');
  await evaluate('location.reload()');await until(()=>exists('[aria-label="Open Cloud Project mood board"]'));await selectorClick('[aria-label="Open Cloud Project mood board"]');
  await until(()=>evaluate('Array.from(document.images).some(image=>image.alt==="online.png" && image.complete && image.naturalWidth>0)'));
  console.log('PASS UI: reloaded board downloads saved media from Neon.');
  await evaluate('location.hash="/settings"');await until(()=>evaluate('document.body?.innerText.includes("Company Settings")'));const companyShot=await send('Page.captureScreenshot',{format:'png'});await writeFile('build/company-settings-preview.png',Buffer.from(companyShot.data,'base64'));await click('Sign out');await until(()=>evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  await click('Staff sign in');await until(()=>evaluate('document.querySelector("input[name=accessToken]") !== null'));await fill({'[name=companyEmail]':staffEmail,'[name=accessToken]':staffToken});await submit();await until(()=>exists('[aria-label="Search clients"]'));
  await click('Settings');await until(()=>evaluate('document.body?.innerText.includes("Staff Settings")'));await until(()=>evaluate('document.querySelector("input[type=file]") !== null'));
  await evaluate(`new Promise(resolve=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.toBlob(blob=>{const transfer=new DataTransfer();transfer.items.add(new File([blob],'profile.png',{type:'image/png'}));const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));resolve(true);});})`);
  await until(()=>exists('img[alt="Staff profile"]'));await click('Save changes');await until(()=>evaluate('document.body?.innerText.includes("Profile updated.")'));await evaluate('location.reload()');await until(()=>exists('img[alt="Staff profile"]'));
  const newStaffEmail=`renamed-${suffix}@example.test`;
  await fill({'[name=staffName]':'Updated Online Staff','[name=staffEmail]':newStaffEmail});await click('Save changes');
  await until(()=>evaluate('document.body?.innerText.includes("Profile updated.")'));
  await evaluate('location.reload()');await until(()=>evaluate(`document.querySelector('[name=staffEmail]')?.value === ${JSON.stringify(newStaffEmail)}`));
  assert.equal(await evaluate('document.querySelector("[name=staffName]").value'),'Updated Online Staff');
  await mkdir('build',{recursive:true});const staffShot=await send('Page.captureScreenshot',{format:'png'});await writeFile('build/staff-settings-preview.png',Buffer.from(staffShot.data,'base64'));
  await click('Sign out');await until(()=>evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  await click('Staff sign in');await until(()=>evaluate('document.querySelector("input[name=accessToken]") !== null'));
  await fill({'[name=companyEmail]':newStaffEmail,'[name=accessToken]':staffToken});await submit();await until(()=>exists('[aria-label="Search clients"]'));
  await click('Settings');await until(()=>evaluate('document.querySelector("[name=staffName]")?.value === "Updated Online Staff"'));await click('Sign out');await until(()=>evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  console.log('PASS UI: staff name/email/photo persistence, sign-in with updated email and existing token, and sign-out.');
  await click('Company sign in');await until(()=>evaluate('document.querySelector("[name=password]") !== null'));
  await fill({'[name=companyEmail]':companyEmail,'[name=password]':'Online UI password 123'});await submit();await until(()=>exists('[aria-label="Search clients"]'));
  await click('Staff');await until(()=>exists('[aria-label="Show login token for Updated Online Staff"]'));
  await selectorClick('[aria-label="Show login token for Updated Online Staff"]');await until(()=>evaluate('document.querySelector("dialog")?.open === true'));
  await click('Revoke access');await click('Cancel');assert.equal(await exists('[aria-label="Staff access token"]'),true);
  await click('Revoke access');await click('Confirm revoke');await until(()=>evaluate('document.querySelector("dialog")?.innerText.includes("All staff sessions have been signed out")'));
  assert.equal(await exists('[aria-label="Staff access token"]'),false);
  const accessShot=await send('Page.captureScreenshot',{format:'png'});await writeFile('build/staff-access-preview.png',Buffer.from(accessShot.data,'base64'));
  await click('Restore access');await until(()=>exists('[aria-label="Staff access token"]'));
  assert.notEqual(await evaluate(`document.querySelector('[aria-label="Staff access token"]').value`),staffToken);
  await click('Delete staff');await click('Cancel');assert.equal(await exists('[aria-label="Staff access token"]'),true);
  await click('Delete staff');await click('Confirm delete');await until(()=>evaluate('document.querySelector("dialog") === null'));
  assert.equal(await exists('[aria-label="Show login token for Updated Online Staff"]'),false);
  await evaluate('location.hash="/settings"');await until(()=>evaluate('document.body?.innerText.includes("Company Settings")'));await click('Sign out');await until(()=>evaluate('document.body?.innerText.includes("Welcome to Keppler")'));
  console.log('PASS UI: owner confirmation, staff access revoke/restore, fresh tokens, and staff deletion.');

  if(requireRemote){assert.ok(networkUrls.length>0);assert.ok(networkUrls.every(url=>new URL(url).protocol==='https:' && !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)));console.log('PASS: packaged UI uses hosted HTTPS requests with localhost blocked.');}
  console.log('PASS: Electron UI -> authenticated API -> LIVE NEON PostgreSQL.');
}catch(error){if(socket?.readyState===WebSocket.OPEN)console.error(await evaluate('JSON.stringify({url:location.href,text:document.body?.innerText})').catch(()=>''));throw error;}
finally{
  socket?.close();child.kill();for(const item of pending.values())clearTimeout(item.timer);pending.clear();
  if(companyId)await connection.db.delete(companies).where(eq(companies.id,companyId));await connection.close();
  await delay(1500);assert.ok(path.resolve(profile).startsWith(path.resolve(tmpdir())+path.sep));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:500});
}
