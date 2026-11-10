import { createServer } from 'vite';
import { startApi } from './api-process.mjs';
const api=await startApi();
const server=await createServer({server:{host:'127.0.0.1',port:5173,strictPort:true}});
try{await server.listen();server.printUrls();}catch(error){api?.kill();throw error;}
let closing=false;
async function close(){if(closing)return;closing=true;api?.kill();await server.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);
api?.once('exit',()=>{void close();});
