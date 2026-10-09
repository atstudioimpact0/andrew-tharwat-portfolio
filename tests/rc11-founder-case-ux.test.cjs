'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../control-v2-preview');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'control-v2.js'),'utf8');
const css=fs.readFileSync(path.join(root,'founder-case-rc11.css'),'utf8');
const pack=fs.readFileSync(path.join(__dirname,'../scripts/package-control-v2-offline.cjs'),'utf8');

function count(s,fragment){return s.split(fragment).length-1}
function extractFunction(start,next){
 const a=js.indexOf(start),b=js.indexOf(next,a+start.length);
 assert.ok(a>=0&&b>a,'renderCases function boundaries preserved');
 return js.slice(a,b).trim();
}
function fakeElement(type='',className='',textContent=''){
 const el={type,className,textContent,hidden:false,open:false,children:[],attributes:{},
   dataset:{},classList:{toggle(){},add(){},remove(){}},
   replaceChildren(...children){this.children=children},
   append(...children){this.children.push(...children)},
   setAttribute(k,v){this.attributes[k]=String(v)},
   addEventListener(name,fn){this['on'+name]=fn}};
 return el;
}
function runtimeFixture(){
 const ids=[
  'case-search','case-list','case-empty','case-detail','case-detail-more',
  'case-title','case-subtitle','case-status','case-problem','case-known',
  'case-missing','case-recommendation','review-direction','request-context',
  'case-action-status'
 ];
 const dom=new Map(ids.map(id=>['#'+id,fakeElement()]));
 const filters=['all','needs','review','handled'].map(caseFilter=>{
   const x=fakeElement();x.dataset.caseFilter=caseFilter;return x;
 });
 const $=key=>{assert.ok(dom.has(key),'missing '+key);return dom.get(key)};
 const $$=key=>key==='.case-filter'?filters:[];
 const cases=[
   {id:'a',name:'First',subtitle:'Design',problem:'Not understood',
    known:'Existing customer',missing:'Need evidence',next:'Review sample',status:'review',action:'review'},
   {id:'b',name:'Second',subtitle:'Workflow',problem:'Follow up missing',
    known:'Calls',missing:'No metric',next:'Request one example',status:'needs',action:'ask'}
 ];
 const state={selectedCase:'a',lastDetailCase:null,caseFilter:'all',lang:'ar',
   completed:new Set(),outcomes:new Map(),journal:new Map()};
 const elt=fakeElement;
 const context={$,$,elt,sampleCases:cases,state,textFor:x=>x,
   caseLabel:c=>c.status,translations:k=>k,renderJournal:()=>{}};
 const func=vm.runInNewContext('('+extractFunction('function renderCases(){','function card(')+')',context);
 return {func,state,dom,filters,handlers:dom,byId:id=>$(id)};
}
test('RC11 uses the ORIGINAL Clients view and established typography and mock-only controls',()=>{
 assert.match(html,/data-page="clients"/);
 assert.match(html,/id="case-detail"/);
 assert.match(html,/founder-case-rc11\.css/);
 assert.match(css,/AT STUDIO — RC11 FOUNDER CASE WORKSPACE/);
 assert.match(html,/بيانات توضيحية غير مؤكدة|مثال توضيحي/);
 assert.doesNotMatch(html,/https:\/\/[^\s"'<>]+\/api\/v2\/founder\/cases/);
});
test('RC11 has problem → known/missing → ONE action → collapsed optional history',()=>{
 const problem=html.indexOf('id="case-problem"');
 const known=html.indexOf('id="case-known"');
 const missing=html.indexOf('id="case-missing"');
 const next=html.indexOf('id="case-recommendation"');
 const details=html.indexOf('id="case-detail-more"');
 assert.ok(problem>0&&problem<known&&known<missing&&missing<next&&next<details);
 for(const id of ['case-title','case-status','case-problem','case-known','case-missing',
   'case-recommendation','review-direction','request-context','case-action-status']){
   assert.equal(count(html,'id="'+id+'"'),1,'one distinct #'+id);
 }
 assert.match(html,/<details class="rc11-progressive"/);
 assert.doesNotMatch(html,/<details class="rc11-progressive"[^>]*\sopen/);
});
test('RC11 Arabic/English labels cover readable uncertainty and human review',()=>{
 for(const key of ['caseSource','rc11CurrentChallenge','rc11Unconfirmed',
  'rc11OnlyOneQuestion','rc11OneNextAction','rc11HumanReview',
  'rc11MoreContext','rc11AlreadyHandled']){
  assert.equal(count(js,key+':'),2,key+' must be localized in both languages');
 }
});
test('RC11 founder sees exactly one relevant call-to-action per case',()=>{
 const x=runtimeFixture();x.func();
 assert.equal(x.byId('review-direction').hidden,false);
 assert.equal(x.byId('request-context').hidden,true);
 assert.equal(x.byId('case-action-status').hidden,true);
 x.state.selectedCase='b';x.byId('case-detail-more').open=true;x.func();
 assert.equal(x.byId('review-direction').hidden,true);
 assert.equal(x.byId('request-context').hidden,false);
 assert.equal(x.byId('case-detail-more').open,false,'new case resets deep details');
 assert.equal(x.byId('case-recommendation').textContent,'Request one example');
});
test('RC11 simulated follow-up is transparent and never falsely closes the case',()=>{
 const x=runtimeFixture();x.state.selectedCase='b';x.state.completed.add('b');
 x.func();
 assert.equal(x.byId('review-direction').hidden,true);
 assert.equal(x.byId('request-context').hidden,true);
 assert.equal(x.byId('case-action-status').hidden,false);
 assert.equal(x.byId('case-action-status').textContent,'rc11AlreadyHandled');
 assert.equal(x.byId('case-detail').hidden,false);
});
test('RC11 remains portable, offline and isolated; no connected auth/API/AI',()=>{
 assert.match(pack,/founder-case-rc11\.css/);
 assert.match(html,/connect-src 'none'/);
 assert.match(js,/No API calls, storage, credentials, or live-client actions/);
 assert.doesNotMatch(js,/functions\.invoke|ats-problem-solver|generateContent|fetch\(/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css, /prefers-reduced-motion/);
});
