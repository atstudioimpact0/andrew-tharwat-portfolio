'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../control-v2-preview');
const ui=require('../control-v2-preview/founder-clients-rc14.js');
const html=fs.readFileSync(path.join(dir,'founder-clients-rc14.html'),'utf8');
const code=fs.readFileSync(path.join(dir,'founder-clients-rc14.js'),'utf8');
const host='https://staging.atstudioimpact.com',route=host+'/control-v2/clients';
const uuid='83b5d6ae-73c4-42de-9f78-78c2c5100001';
const list={cases:[{case_id:uuid,label:'<img onerror=alert(1)>',
 service:'Website',problem_preview:'The client needs clarity',analysis_state:'collecting',
 updated_at:'2026-10-09T18:00:00.000Z'}],has_more:false,
 hidden_secret:'MUST_NOT_APPEAR'};
const good=(data=list,mime='application/json; charset=utf-8')=>({
 status:200,headers:{get:()=>mime},async text(){return JSON.stringify(data)}
});
const error=status=>({status,headers:{get:()=>null},async text(){throw Error('do not read error body')}});
function node(id){
 return {id,textContent:'',value:'',hidden:false,disabled:false,dataset:{},
  placeholder:'',children:[],handlers:{},href:'',className:'',
  addEventListener(event,handler){this.handlers[event]=handler},
  replaceChildren(...x){this.children=x},
  append(...x){this.children.push(...x)}
 };
}
function setup({url=route,fetcher=async()=>good()}={}){
 const ids=['rc14-status','rc14-list','rc14-lang','rc14-retry','rc14-refresh',
   'rc14-search','rc14-count','rc14-limit','rc14-title','rc14-kicker','rc14-caption'];
 const nodes=new Map(ids.map(id=>[id,node(id)])),calls=[];
 const dom={documentElement:{lang:'ar',dir:'rtl'},title:'',
  getElementById:id=>nodes.get(id),createElement:tag=>node(tag)};
 const fetch=async (...args)=>{calls.push(args);return fetcher(...args)};
 const app=ui.create({locationHref:url,fetchFn:fetch,documentRef:dom,
  AbortControllerImpl:AbortController});
 return {app,calls,dom,get:id=>nodes.get(id)};
}
test('RC14 only accepts exact fixed-origin protected clients route',()=>{
 assert.equal(ui.validUrl(route),true);
 assert.equal(ui.validUrl(route+'/'),true);
 for(const url of [host+'/control-v2/clients?tenant=other',
  'http://staging.atstudioimpact.com/control-v2/clients',
  'https://atstudioimpact.com/control-v2/clients',host+'/control-v2/cases/'+uuid,
  host+'/control-v2/clients#fragment'])assert.equal(ui.validUrl(url),false);
});
test('RC14 same-origin GET returns selectable links, no client UUID input',async()=>{
 const s=setup();await s.app.load();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0][0],'/api/v2/founder/cases');
 const req=s.calls[0][1];
 assert.equal(req.method,'GET');assert.equal(req.credentials,'same-origin');
 assert.equal(req.cache,'no-store');assert.equal(req.mode,'same-origin');assert.equal(req.redirect,'error');
 assert.deepEqual(req.headers,{Accept:'application/json'});
 assert.equal(s.get('rc14-list').children.length,1);
 const link=s.get('rc14-list').children[0].children[0];
 assert.equal(link.href,'/control-v2/cases/'+uuid);
 assert.equal(link.children[0].children[0].textContent,'<img onerror=alert(1)>');
 assert.ok(!JSON.stringify(link).includes('MUST_NOT_APPEAR'));
 assert.ok(!JSON.stringify(s.get('rc14-count')).includes('MUST_NOT_APPEAR'));
});
test('RC14 empty scope is truthful; no sample clients silently created',async()=>{
 const s=setup({fetcher:async()=>good({cases:[],has_more:false})});
 await s.app.load();
 assert.equal(s.get('rc14-list').children.length,0);
 assert.match(s.get('rc14-status').textContent,/لا توجد ملفات/);
});
test('RC14 local search and language toggle never send a second request',async()=>{
 const s=setup();await s.app.load();
 s.get('rc14-search').value='nothing';
 s.get('rc14-search').handlers.input();
 assert.equal(s.get('rc14-list').children.length,0);
 assert.match(s.get('rc14-status').textContent,/مطابقة/);
 s.get('rc14-search').value='website';
 s.get('rc14-search').handlers.input();
 assert.equal(s.get('rc14-list').children.length,1);
 s.app.toggle();
 assert.equal(s.dom.documentElement.lang,'en');
 assert.equal(s.dom.documentElement.dir,'ltr');
 assert.equal(s.calls.length,1);
});
test('RC14 unauthorized/expired/failing refresh clears previous rendered clients',async()=>{
 let status=200;
 const s=setup({fetcher:async()=>status===200?good():error(status)});
 await s.app.load();assert.equal(s.get('rc14-list').children.length,1);
 for(const code of [401,403,503]){
  status=code;await s.app.load();
  assert.equal(s.get('rc14-list').children.length,0);
  assert.equal(s.get('rc14-count').textContent,'');
  assert.ok(s.get('rc14-status').textContent.length>10);
 }
});
test('RC14 wrong-origin browser never queries backend, even with a fetch stub',async()=>{
 const s=setup({url:'https://evil.invalid/control-v2/clients'});await s.app.load();
 assert.equal(s.calls.length,0);assert.equal(s.get('rc14-list').children.length,0);
});
test('RC14 strict envelope and case UUID/type validation are fail closed',()=>{
 for(const value of [null,{},[],{cases:[],has_more:'yes'},
  {cases:new Array(26).fill(list.cases[0]),has_more:true},
  {cases:[{...list.cases[0],case_id:'bad-uuid'}],has_more:false},
  {cases:[list.cases[0],list.cases[0]],has_more:false},
  {cases:[{...list.cases[0],service:null}],has_more:false}]){
  assert.equal(ui.project(value),null);
 }
});
test('RC14 visibly flags truncated first-page result, no invented pagination',async()=>{
 const s=setup({fetcher:async()=>good({...list,has_more:true})});
 await s.app.load();
 assert.match(s.get('rc14-limit').textContent,/25/);
});
test('RC14 malformed content type, huge response and server errors never render cases',async()=>{
 for(const value of [good(list,'text/html'),
  {status:200,headers:{get:()=> 'application/json'},async text(){return 'x'.repeat(45001)}},
  {status:200,headers:{get:()=> 'application/json'},async text(){return '{bad json'}},
  error(500)]){
  const s=setup({fetcher:async()=>value});await s.app.load();
  assert.equal(s.get('rc14-list').children.length,0);
 }
});
test('RC14 racing responses cannot overwrite later valid list',async()=>{
 let resolveFirst;
 const s=setup({fetcher:async()=>{
  if(s.calls.length===1)return new Promise(r=>{resolveFirst=r});
  return good({cases:[],has_more:false});
 }});
 const first=s.app.load();await s.app.load();resolveFirst(good());
 await first;assert.equal(s.get('rc14-list').children.length,0);
});
test('RC14 disposed browser aborts request and drops response',async()=>{
 let complete;
 const s=setup({fetcher:async()=>new Promise(r=>{complete=r})});
 const pending=s.app.load(),signal=s.calls[0][1].signal;
 s.app.dispose();assert.equal(signal.aborted,true);
 complete(good());await pending;
 assert.equal(s.get('rc14-list').children.length,0);
});
test('RC14 security review: no credential material or generator calls in browser assets',()=>{
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/frame-ancestors 'none'/);
 assert.match(html,/founder-clients-rc14-init\.js/);
 assert.doesNotMatch(code,/\bfetch\s*\(|innerHTML|localStorage|sessionStorage|service_role|functions\.invoke|generateContent/);
 assert.doesNotMatch(html,/<form\b|onsubmit=|onclick=|<script(?![^>]*\bsrc=)/i);
});
