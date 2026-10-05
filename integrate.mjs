import {cp,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
if(!process.argv[2]) throw new Error('Pass the existing ATS repository directory.');
const target=resolve(process.argv[2]);
const configPath=join(target,'vercel.json');
const config=JSON.parse(await readFile(configPath,'utf8'));
const patch=JSON.parse(await readFile(join(here,'vercel.routes.json'),'utf8'));
let exists=false;try{await access(join(target,'beauty-rozy'));exists=true;}catch{}
if(exists) throw new Error('beauty-rozy already exists. Review before updating.');
config.rewrites=[...patch.rewrites,...(config.rewrites||[])];
config.headers=[...(config.headers||[]),...patch.headers];
await cp(join(here,'beauty-rozy'),join(target,'beauty-rozy'),{recursive:true});
await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
console.log('Prepared beauty-rozy/ and merged vercel.json. Review before publishing.');
