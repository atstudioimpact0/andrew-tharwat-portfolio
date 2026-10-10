'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const vm=require('node:vm');

test('offline Ultra-Premium package embeds its exact sources and requires no web assets',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ats-control-offline-'));
 try {
  const script=path.resolve(__dirname,'..','scripts','package-control-v2-offline.cjs');
  const run=spawnSync(process.execPath,[script,dir],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const control=fs.readFileSync(path.join(dir,'control-room-preview.html'),'utf8');
  const access=fs.readFileSync(path.join(dir,'access-preview.html'),'utf8');
  for(const page of [control,access]){
   assert.match(page,/content="OFFLINE DESIGN REVIEW; MOCK DATA ONLY; NO LOGIN OR NETWORK"/);
   assert.match(page,/data:image\/png;base64,[A-Za-z0-9+/=]+/);
   assert.match(page,/connect-src 'none'/);
   assert.match(page,/script-src 'unsafe-inline'/);
   assert.doesNotMatch(page,/<link rel="stylesheet" href="\/control-v2-preview\//);
   assert.doesNotMatch(page,/<script src="\/control-v2-preview\//);
   assert.doesNotMatch(page,/<img src="\/assets\//);
   const js=page.match(/<script data-offline-source="[^"]+">([\s\S]*?)<\/script>/);
   assert.ok(js,'interactive JavaScript is embedded');
   assert.doesNotThrow(()=>new vm.Script(js[1]));
  }
  for(const name of ['control-v2.css','premium.css','ultra.css','control-v2.js'])
   assert.ok(control.includes('data-offline-source="'+name+'"'));
  for(const name of ['access.css','access-premium.css','access.js'])
   assert.ok(access.includes('data-offline-source="'+name+'"'));
  assert.match(control,/href="\.\/access-preview\.html"/);
  assert.match(access,/href="\.\/control-room-preview\.html"/);
  assert.match(control,/id="command-dialog"/);
  assert.match(access,/id="role-panel"/);
  assert.ok(fs.statSync(path.join(dir,'README.txt')).size>200);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
