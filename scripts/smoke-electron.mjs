import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync(process.execPath,['--import','tsx',fileURLToPath(new URL('./smoke-online-electron.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',env:process.env,windowsHide:true});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
