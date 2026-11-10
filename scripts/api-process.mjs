import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from 'dotenv';
config({path:['.env.local','.env'],quiet:true});
export async function startApi() {
  const url=process.env.VITE_API_URL??JSON.parse(readFileSync(new URL('../app-config.json',import.meta.url),'utf8')).apiUrl;
  if(!/^http:\/\/(127\.0\.0\.1|localhost):3001\/api\/?$/.test(url))return null;
  try{const running=await fetch(`http://127.0.0.1:${process.env.PORT??3001}/api/ready`,{signal:AbortSignal.timeout(2000)});if(running.ok)return null;}catch{/* Start a local API if one is not running. */}
  const child=spawn(process.execPath,['--import','tsx','server/start.ts'],{stdio:'inherit',env:process.env,windowsHide:true});
  let failed=false;child.once('error',()=>{failed=true;});child.once('exit',()=>{failed=true;});
  for(let attempt=0;attempt<80;attempt++){
    if(failed)throw new Error('The API failed to start. Check .env.local and run npm run db:migrate.');
    try{const response=await fetch(`http://127.0.0.1:${process.env.PORT??3001}/api/ready`,{signal:AbortSignal.timeout(2000)});if(response.ok)return child;}catch{/* waiting for startup */}
    await delay(250);
  }
  child.kill();throw new Error('Local API startup timed out. Check the API process.');
}
