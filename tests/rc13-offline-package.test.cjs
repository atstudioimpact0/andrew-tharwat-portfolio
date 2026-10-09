'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
test('RC13 portable visual preview builds as a SAFE mock, with no real-network bootstrap',()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'ats-rc13-'));
 try{
  const script=path.join(__dirname,'../scripts/package-control-v2-offline.cjs');
  const run=cp.spawnSync(process.execPath,[script,output],{
   encoding:'utf8',timeout:15000,env:{...process.env,NODE_ENV:'test'}
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/Created founder-rc13-offline.html/);
  for(const file of ['control-room-preview.html','access-preview.html','founder-rc13-offline.html','founder-rc14-offline.html'])
   assert.ok(fs.existsSync(path.join(output,file)),file);
  const html=fs.readFileSync(path.join(output,'founder-rc13-offline.html'),'utf8');
  assert.match(html,/OFFLINE MOCK — FAKE CLIENT/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/data-offline-source="rc13-synthetic-only"/);
  assert.match(html,/data-offline-source="founder-staging-rc13\.js"/);
  assert.match(html,/data-offline-source="founder-case-contract-rc12\.js"/);
  assert.match(html,/fetchFn:async/);
  assert.doesNotMatch(html,/fetchFn:window\.fetch|<script src=|<link rel="stylesheet" href=|Bearer [A-Za-z0-9]/);
  const readme=fs.readFileSync(path.join(output,'README.txt'),'utf8');
  assert.match(readme,/founder-rc13-offline.html/);
  assert.match(readme,/founder-rc14-offline.html/);
  assert.match(html,/href="\.\/founder-rc14-offline\.html"/);
  const picker=fs.readFileSync(path.join(output,'founder-rc14-offline.html'),'utf8');
  assert.match(picker,/OFFLINE MOCK — FICTIONAL CLIENTS/);
  assert.match(picker,/connect-src 'none'/);
  assert.match(picker,/data-offline-source="rc14-synthetic-only"/);
  assert.match(picker,/data-offline-source="founder-clients-rc14\.js"/);
  assert.match(picker,/founder-rc13-offline\.html/);
  assert.match(picker,/const first=/);
  assert.match(picker,/const after=/);
  assert.match(picker,/id="rc15-more"/);
  assert.match(picker,/path\.includes\("\?cursor="\)/);
  assert.match(readme,/load 25 FICTIONAL clients/);
  assert.doesNotMatch(picker,/fetchFn:window\.fetch|<script src=|<link rel="stylesheet" href=|Bearer [A-Za-z0-9]/);
 }finally{fs.rmSync(output,{recursive:true,force:true})}
});
