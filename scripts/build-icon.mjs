import pngToIco from 'png-to-ico';
import { mkdir, writeFile } from 'node:fs/promises';
const icon=await pngToIco('public/Logomark with rounded bg.png');
await mkdir('build',{recursive:true});
await writeFile('build/icon.ico',icon);
console.log('Windows app icon generated from Logomark with rounded bg.png.');
