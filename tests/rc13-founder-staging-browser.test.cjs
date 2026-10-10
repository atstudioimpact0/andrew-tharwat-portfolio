'use strict';
/* RC13 staging-only browser acceptance tests; no network or Zoho credentials. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const bridge=require('../control-v2-preview/founder-case-contract-rc12.js');
const browser=require('../control-v2-preview/founder-staging-rc13.js');
const dir=path.join(__dirname,'../control-v2-preview');
const html=fs.readFileSync(path.join(dir,'founder-staging-rc13.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'founder-staging-rc13.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(dir,'founder-staging-rc13-init.js'),'utf8');
const origin='https://staging.atstudioimpact.com';
const uuid='83b5d6ae-73c4-42de-9f78-78c2c5100001';
const address=origin+'/control-v2/cases/'+uuid;
const api='/api/v2/founder/cases/'+uuid+'/workspace';
function dto(overrides={}){
 return {
  case_id:uuid,input_version:3,analysis_state:'collecting',
  intake_brief:{source:'unconfirmed_client_intake',service:'Product strategy',
    project_goal:'Customer does not understand the product',current_assets:[],timeline:null},
  known:{current_state:'Fragmented information',impact:null,desired_outcome:null,evidence:null},
  missing_fields:['evidence'],supporting_upload_count:0,review_pending_count:1,active_work_count:2,
  next_action:{kind:'collect_evidence',text:'Ask for one real example',task_hint:null},
  private_email:'do-not-show@example.invalid',private_token:'never-display',
  ...overrides
 };
}
function ok(body=dto(),contentType='application/json; charset=utf-8'){
 return {status:200,headers:{get:k=>k.toLowerCase()==='content-type'?contentType:null},
  async text(){return typeof body==='string'?body:JSON.stringify(body)}};
}
function result(status){
 return {status,headers:{get:()=>null},async text(){throw Error('do not inspect error body')}};
}
function domFactory(){
 const ids=[
  'rc13-status-shell','rc13-state','rc13-case','rc13-retry','rc13-lang','rc13-title','rc13-source',
  'rc13-subtitle','rc13-problem','rc13-known','rc13-missing','rc13-next',
  'rc13-extra','rc13-metrics','rc13-note','rc13-reload',
  'rc13-page-title','rc13-label-problem','rc13-label-known',
  'rc13-label-missing','rc13-label-next','rc13-label-extra'
 ];
 const map=new Map(ids.map(id=>[id,{id,hidden:false,textContent:'',dataset:{},
  open:false,disabled:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn}}]));
 return {getElementById:id=>map.get(id),documentElement:{lang:'ar',dir:'rtl'},title:'',
   get(id){const a=map.get(id);assert.ok(a,'DOM element absent '+id);return a;}};
}
function harness({href=address,fetch=async()=>ok()}={}){
 const calls=[],documentRef=domFactory();
 const fn=async (...args)=>{calls.push(args);return fetch(...args)};
 const instance=browser.create({locationHref:href,fetchFn:fn,bridge,
  documentRef,AbortControllerImpl:AbortController});
 return {instance,calls,doc:documentRef,get:id=>documentRef.get(id)};
}
test('RC13 only accepts the fixed HTTPS staging origin + UUID case deep-link',()=>{
 assert.deepEqual(browser.route(address),{caseId:uuid});
 for(const bad of [
  'https://atstudioimpact.com/control-v2/cases/'+uuid,
  'http://staging.atstudioimpact.com/control-v2/cases/'+uuid,
  'https://evil.invalid/control-v2/cases/'+uuid,
  origin+'/control-v2/cases/not-a-uuid',
  origin+'/control-v2/cases/'+uuid+'?tenant=other',
  origin+'/control-v2/cases/'+uuid+'#unsafe',
  origin+'/control-v2/cases/'+uuid+'/ai/diagnosis'
 ])assert.ok(browser.route(bad).error,bad);
});
test('RC13 verified 200 shows same RC12 model, one next action, no private fields',async()=>{
 const h=harness();await h.instance.load();
 assert.equal(h.calls.length,1);
 const [url,options]=h.calls[0];
 assert.equal(url,api);
 assert.equal(options.method,'GET');assert.equal(options.credentials,'same-origin');
 assert.equal(options.mode,'same-origin');assert.equal(options.cache,'no-store');
 assert.equal(options.redirect,'error');
 assert.deepEqual(options.headers,{Accept:'application/json'});
 assert.equal(h.get('rc13-case').hidden,false);
 assert.equal(h.get('rc13-state').hidden,true);
 assert.equal(h.get('rc13-status-shell').hidden,true);
 assert.equal(h.get('rc13-problem').textContent,'Customer does not understand the product');
 assert.match(h.get('rc13-missing').textContent,/الدليل/);
 assert.equal(h.get('rc13-next').textContent,'Ask for one real example');
 assert.match(h.get('rc13-source').textContent,/طلب العميل/);
 const view=[...['rc13-title','rc13-problem','rc13-known','rc13-next','rc13-metrics']
   .map(id=>h.get(id).textContent)].join(' ');
 assert.ok(!view.includes('never-display'));
 assert.ok(!view.includes('do-not-show@example.invalid'));
});
test('RC13 changing language does NOT fetch again or change role',async()=>{
 const h=harness();await h.instance.load();h.instance.toggle();
 assert.equal(h.calls.length,1);
 assert.equal(h.doc.documentElement.dir,'ltr');
 assert.equal(h.doc.documentElement.lang,'en');
 assert.match(h.get('rc13-missing').textContent,/evidence/i);
 h.instance.toggle();assert.equal(h.doc.documentElement.dir,'rtl');
});
test('RC13 401/403/404/503 all hide case content and return localized safe error',async()=>{
 for(const [status,word] of [[401,'انتهت الجلسة'],[403,'ليست لديك'],[404,'الملف غير متاح'],[503,'تعذر تحميل']]){
  const h=harness({fetch:async()=>result(status)});await h.instance.load();
  assert.equal(h.get('rc13-case').hidden,true);
  assert.equal(h.get('rc13-status-shell').hidden,false);
  assert.equal(h.get('rc13-problem').textContent,'');
  assert.match(h.get('rc13-state').textContent,new RegExp(word));
  assert.ok(!h.get('rc13-state').textContent.includes(uuid));
 }
});
test('RC13 invalid link or wrong origin never contacts any backend',async()=>{
 for(const href of ['https://atstudioimpact.com/control-v2/cases/'+uuid,
   origin+'/control-v2/cases/not-a-uuid']){
  const h=harness({href});await h.instance.load();
  assert.equal(h.calls.length,0);
  assert.equal(h.get('rc13-case').hidden,true);
 }
});
test('RC13 checks JSON mime and body size, drops mismatched cases and forged 200',async()=>{
 for(const payload of [
  ok(dto(),'text/html'),
  ok('x'.repeat(24001)),
  ok(dto({case_id:'71258625-c287-4fb3-9c80-853b7e13fe00'})),
  ok(dto({intake_brief:{source:'unapproved_identity',project_goal:'no'}})),
  ok('not-json')
 ]){
  const h=harness({fetch:async()=>payload});await h.instance.load();
  assert.equal(h.get('rc13-case').hidden,true);
  assert.equal(h.get('rc13-problem').textContent,'');
 }
});
test('RC13 user reload removes stale data before new auth response is known',async()=>{
 let resolveSecond;
 const h=harness({fetch:async()=>{
  if(h.calls.length===1)return ok();
  return new Promise(resolve=>{resolveSecond=resolve});
 }});
 await h.instance.load();
 assert.equal(h.get('rc13-case').hidden,false);
 const pending=h.instance.load();
 assert.equal(h.get('rc13-case').hidden,true);
 assert.equal(h.get('rc13-next').textContent,'');
 h.instance.toggle();
 assert.equal(h.get('rc13-case').hidden,true);
 resolveSecond(result(403));
 await pending;
 assert.equal(h.get('rc13-case').hidden,true);
 assert.equal(h.get('rc13-next').textContent,'');
});
test('RC13 simultaneous responses do not overwrite newer verified case result',async()=>{
 let resolveFirst;
 const h=harness({fetch:async()=>{
  if(h.calls.length===1)return new Promise(resolve=>{resolveFirst=resolve});
  return ok(dto({intake_brief:{source:'unconfirmed_client_intake',project_goal:'Latest case read'}}));
 }});
 const first=h.instance.load();
 await h.instance.load();
 resolveFirst(ok(dto({intake_brief:{source:'unconfirmed_client_intake',project_goal:'STALE case read'}})));
 await first;
 assert.equal(h.get('rc13-problem').textContent,'Latest case read');
});
test('RC13 pagehide disposal aborts request and drops delayed response',async()=>{
 let resolve;
 const h=harness({fetch:async()=>new Promise(r=>{resolve=r})});
 const pending=h.instance.load();
 const sig=h.calls[0][1].signal;
 h.instance.dispose();
 assert.equal(sig.aborted,true);
 resolve(ok());await pending;
 assert.equal(h.get('rc13-case').hidden,true);
 assert.equal(h.get('rc13-problem').textContent,'');
});
test('RC13 markup is CSP-restricted, read-only, and uses existing RC11/RC12 assets',()=>{
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/frame-ancestors 'none'/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/founder-case-rc11\.css/);
 assert.match(html,/founder-case-contract-rc12\.js/);
 assert.match(html,/founder-staging-rc13-init\.js/);
 assert.doesNotMatch(html,/<form\b|<input\b|client_secret|service_role|<script(?![^>]*\bsrc=)/i);
 assert.doesNotMatch(js,/\bfetch\s*\(|innerHTML|localStorage|sessionStorage|functions\.invoke|generateContent|postMessage\(|new WebSocket/i);
 assert.doesNotMatch(bootstrap,/localStorage|service_role|Bearer|ats-problem-solver/);
 for(const id of ['rc13-state','rc13-case','rc13-retry','rc13-lang','rc13-title','rc13-source','rc13-next'])
  assert.match(html,new RegExp('id="'+id+'"'));
});
