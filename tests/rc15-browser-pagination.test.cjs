'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const ui=require('../control-v2-preview/founder-clients-rc14.js');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../control-v2-preview/founder-clients-rc14.html'),'utf8');
const id=i=>'83b5d6ae-73c4-42de-9f78-'+String(i).padStart(12,'0');
const cursor='A'.repeat(120)+'.'+'B'.repeat(43);
const host='https://staging.atstudioimpact.com/control-v2/clients';
function cases(a,b){return Array.from({length:b-a+1},(_,n)=>({
 case_id:id(a+n),label:'Fictional Case '+(a+n),service:'Website',
 problem_preview:'Clarify the customer request '+(a+n),analysis_state:'collecting',
 updated_at:'2026-10-09T18:00:00.000000Z'
}))}
const first={cases:cases(1,25),has_more:true,next_cursor:cursor};
const second={cases:[...cases(24,27)],has_more:false,next_cursor:null};
function ok(v){return {status:200,headers:{get:()=> 'application/json'},async text(){return JSON.stringify(v)}}}
function fake(id){
 return {id,textContent:'',value:'',hidden:false,disabled:false,dataset:{},children:[],handlers:{},
  addEventListener(k,fn){this.handlers[k]=fn},
  append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},
  href:'',className:'',placeholder:''};
}
function setup(response=async()=>ok(first)){
 const ids=['rc14-status','rc14-list','rc14-lang','rc14-retry','rc14-refresh',
  'rc14-search','rc14-count','rc14-limit','rc14-title','rc14-kicker','rc14-caption','rc15-more'];
 const elements=new Map(ids.map(x=>[x,fake(x)])),calls=[];
 const documentRef={title:'',documentElement:{lang:'ar',dir:'rtl'},
  getElementById:k=>elements.get(k),createElement:k=>fake(k)};
 const fetchFn=async(...args)=>{calls.push(args);return response(...args)};
 const app=ui.create({locationHref:host,fetchFn,documentRef,AbortControllerImpl:AbortController});
 return {app,calls,el:k=>elements.get(k),documentRef};
}
test('RC15 browser accepts optional signed cursor shape but rejects malformed continuation',()=>{
 assert.equal(ui.project({cases:[],has_more:false,next_cursor:null}).has_more,false);
 assert.equal(ui.project({...first}).next_cursor,cursor);
 for(const x of [
  {...first,next_cursor:'bad'},
  {...first,next_cursor:{token:'forged'}},
  {cases:cases(1,1),has_more:false,next_cursor:cursor}
 ])assert.equal(ui.project(x),null);
});
test('RC15 manually loads 25 then 2 new cases; deduplicates overlaps without losing search',async()=>{
 let n=0;const t=setup(async()=>ok(n++===0?first:second));
 await t.app.load();
 assert.equal(t.el('rc14-list').children.length,25);
 assert.equal(t.el('rc15-more').hidden,false);
 assert.equal(t.calls.length,1);
 await t.app.loadMore();
 assert.equal(t.calls.length,2);
 assert.match(t.calls[1][0],/\?cursor=/);
 assert.equal(new URL('https://staging.atstudioimpact.com'+t.calls[1][0]).searchParams.get('cursor'),cursor);
 assert.equal(t.calls[1][1].credentials,'same-origin');
 assert.equal(t.calls[1][1].cache,'no-store');
 assert.equal(t.el('rc14-list').children.length,27);
 const names=t.el('rc14-list').children.map(c=>c.children[0].children[0].children[0].textContent);
 assert.equal(new Set(names).size,27);
 assert.equal(t.el('rc15-more').hidden,true);
 t.el('rc14-search').value='fictional case 27';
 t.el('rc14-search').handlers.input();
 assert.equal(t.el('rc14-list').children.length,1);
 assert.equal(t.calls.length,2,'local search never fetches');
 t.app.toggle();assert.equal(t.calls.length,2);assert.equal(t.documentRef.documentElement.lang,'en');
});
test('RC15 denies unrelated/bad further cursor and does not expose existing server data',async()=>{
 let count=0;const t=setup(async()=>ok(count++===0?first:{...second,has_more:true,next_cursor:cursor}));
 await t.app.load();await t.app.loadMore();
 assert.equal(t.el('rc14-list').children.length,25);
 assert.match(t.el('rc14-limit').textContent,/تعذر تحميل/);
 assert.equal(t.el('rc15-more').hidden,false);
});
test('RC15 first-page refresh resets cursor, list and stale pending load-more',async()=>{
 let complete;
 let count=0;
 const t=setup(async()=>{
  count++;
  if(count===1)return ok(first);
  if(count===2)return new Promise(resolve=>{complete=resolve});
  return ok({cases:[],has_more:false,next_cursor:null});
 });
 await t.app.load();
 const pending=t.app.loadMore();
 assert.equal(t.calls.length,2);
 const pendingSignal=t.calls[1][1].signal;
 await t.app.load();
 assert.equal(pendingSignal.aborted,true);
 assert.equal(t.el('rc14-list').children.length,0);
 complete(ok(second));await pending;
 assert.equal(t.el('rc14-list').children.length,0);
 assert.equal(t.el('rc15-more').hidden,true);
});
test('RC15 expired Founder cookie during continuation erases even first-page client names',async()=>{
 let n=0;
 const t=setup(async()=>n++===0?ok(first):{status:401,headers:{get:()=>null},async text(){throw Error('never read auth error body')}});
 await t.app.load();
 assert.equal(t.el('rc14-list').children.length,25);
 await t.app.loadMore();
 assert.equal(t.el('rc14-list').children.length,0);
 assert.equal(t.el('rc14-count').textContent,'');
 assert.match(t.el('rc14-status').textContent,/انتهت الجلسة/);
});
test('RC15 continuation failure keeps existing authorized cases and permits manual retry',async()=>{
 let n=0;
 const t=setup(async()=>{n++;if(n===1)return ok(first);if(n===2)throw Error('network timeout');return ok(second)});
 await t.app.load();await t.app.loadMore();
 assert.equal(t.el('rc14-list').children.length,25);
 assert.match(t.el('rc14-limit').textContent,/تعذر تحميل/);
 await t.app.loadMore();
 assert.equal(t.el('rc14-list').children.length,27);
});
test('RC15 markup adds keyboard-operable manual pagination without autosave or AI',()=>{
 assert.match(html,/id="rc15-more" type="button"/);
 assert.doesNotMatch(html,/<form\b|onclick=|onload=/);
});
