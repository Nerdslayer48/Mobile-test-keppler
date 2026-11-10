import { existsSync, appendFileSync, readFileSync } from 'node:fs';
import { randomToken } from './security.ts';
const file=existsSync('.env')?'.env':'.env.local';
const contents=existsSync(file)?readFileSync(file,'utf8'):'';
if(!/^TOKEN_ENCRYPTION_KEY=.+/m.test(contents)) {
  appendFileSync(file,`\nTOKEN_ENCRYPTION_KEY=${randomToken()}\n`);
  console.log(`Server token encryption key generated in ${file} (value hidden).`);
} else console.log('Existing token encryption key preserved.');
