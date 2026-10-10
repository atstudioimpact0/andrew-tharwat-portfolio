'use strict';
/**
 * Release A legacy UI safety regression.
 * Tests a real browser-script copy in a constrained VM with fake controls.
 * UI lock is not server authorization: production endpoints remain out of scope.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../admin/admin-unified.js'),'utf8');
function between(start,end){
 const a=src.indexOf(start);assert.notEqual(a,-1,'expected function '+start);
 const b=src.indexOf(end,a+start.length);assert.notEqual(b,-1,'expected next function '+end);
 return src.slice(a,b);
}
test('Release A legacy generators are default-OFF and all three direct invokes have entry guards',()=>{
 assert.match(src,/const LEGACY_AI_RELEASE_A_LOCK = true;/);
 const d=between('async function runDiagnosticEngine(','async function acceptSystemDiagnosis(');
 const b=between('async function ensureDeliveryBlueprint(','async function runDiagnosticEngine(');
 const p=between('async function loadTaskPlaybook(','function playbookProgressMap(');
 for(const body of [d,b,p]){
  const call=body.indexOf('.functions.invoke(');
  const gate=body.indexOf('if(LEGACY_AI_RELEASE_A_LOCK)');
  assert.ok(gate>=0&&call>gate,'generator must fail closed before invoking remote AI');
 }
});
test('opening and saving a client never unconditionally triggers paid AI or blueprint',()=>{
 const load=between('async function loadLeadDiagnosis(','async function syncDiagnosisPhase(');
 const save=between('async function recordAdminDiscoverySignal(','function setLeadFocusMode(');
 assert.doesNotMatch(load,/runDiagnosticEngine\(|ensureDeliveryBlueprint\(|autoAnalyze/);
 assert.doesNotMatch(save,/runDiagnosticEngine\(|ensureDeliveryBlueprint\(/);
 assert.match(src,/AI PAUSED · RELEASE A/);
});
test('opening a missing task playbook cannot change its state then generate it',()=>{
 const open=between('async function openCurrentLeadTaskWorkspace(','async function savePlaybookTaskProgress(');
 const guard=open.indexOf('if(LEGACY_AI_RELEASE_A_LOCK)');
 const move=open.indexOf("if(task.status==='todo')");
 assert.ok(guard>=0&&guard<move,'missing playbook must be checked before task state changes');
});
test('actual legacy click handler denies explicit legacy AI despite forged DOM action',async()=>{
 const listeners=new Map(),notices=[],calls=[];
 const doc={
  querySelector:()=>null,
  querySelectorAll:()=>[],
  addEventListener(name,fn){listeners.set(name,fn)},
  getElementById:()=>null
 };
 const w={
  addEventListener:()=>{},
  ATS_ADMIN:{
   notify(msg){notices.push(String(msg))},
   getClient(){return {functions:{invoke:async (...args)=>{calls.push(args);throw Error('should not call AI')}}}}
  }
 };
 const context={document:doc,window:w,location:{hash:''},console,
   setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
   Intl,Date,Map,Set,URL,crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(src,context,{timeout:1500,filename:'admin-unified.js'});
 assert.equal(typeof listeners.get('click'),'function');
 const event={target:{closest(selector){
  return selector==='[data-exec-action]'?{dataset:{execAction:'analysis'}}:null;
 }}};
 listeners.get('click')(event);
 await Promise.resolve();
 assert.equal(calls.length,0);
 assert.ok(notices.some(x=>x.includes('AI diagnosis is paused')));
});
