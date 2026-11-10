import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const stage=resolve('build/desktop-app');
if(dirname(stage)!==resolve('build'))throw new Error('Unexpected desktop staging directory.');
await rm(stage,{recursive:true,force:true});
await mkdir(stage,{recursive:true});
await cp('dist',resolve(stage,'dist'),{recursive:true});
await cp('electron',resolve(stage,'electron'),{recursive:true});
const pkg=JSON.parse(await readFile('package.json','utf8'));
await writeFile(resolve(stage,'package.json'),JSON.stringify({name:pkg.name,productName:'Keppler',version:pkg.version,description:pkg.description,main:'electron/main.cjs',private:true},null,2));
console.log('Desktop UI staged without server credentials.');

