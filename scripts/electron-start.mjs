import { spawn } from 'node:child_process';
import electron from 'electron';
import { startApi } from './api-process.mjs';
const api=await startApi();const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,['.'],{stdio:'inherit',env,windowsHide:false});
child.once('exit',code=>{api?.kill();process.exit(code??0);});
child.once('error',error=>{api?.kill();console.error(error.message);process.exit(1);});
process.on('SIGINT',()=>{child.kill();api?.kill();});process.on('SIGTERM',()=>{child.kill();api?.kill();});
