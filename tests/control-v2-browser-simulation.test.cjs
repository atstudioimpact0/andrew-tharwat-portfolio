'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..','control-v2-preview');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'control-v2.js'),'utf8');

class NodeMock{
  constructor(){this.children=[];this.listeners={};this.dataset={};this.attributes={};this.value='';this.hidden=false;this.open=false;this.textContent='';this.className='';this.classList={
    add:()=>{},remove:()=>{},toggle:()=>{}
  };}
  replaceChildren(...children){this.children=[...children]}
  append(...nodes){this.children.push(...nodes)}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)}
  setAttribute(name,val){this.attributes[name]=String(val)}
  removeAttribute(name){delete this.attributes[name]}
  getAttribute(name){return this.attributes[name]??null}
  showModal(){this.open=true}
  close(){this.open=false}
  focus(){}
  scrollIntoView(){}
  fire(type,event={}){for(const callback of this.listeners[type]||[])callback({target:this,...event})}
}
function boot(){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const map=new Map(ids.map(id=>[id,new NodeMock()]));
  const tagged=(pattern,key)=>{
    const list=[];
    for(const match of html.matchAll(pattern)){
      const node=new NodeMock();node.dataset[key]=match[1];list.push(node);
    }
    return list;
  };
  const nav=tagged(/<button class="nav-btn[^"]*"[^>]*data-view="([^"]+)"/g,'view');
  const pages=tagged(/<section class="page[^"]*"[^>]*data-page="([^"]+)"/g,'page');
  const filters=tagged(/<button class="case-filter[^"]*"[^>]*data-case-filter="([^"]+)"/g,'caseFilter');
  const documentEvents={};
  const doc={
    documentElement:{lang:'ar',dir:'rtl'},
    body:{classList:{add:()=>{},remove:()=>{},toggle:()=>false}},
    createElement:()=>new NodeMock(),
    querySelector(selector){
      if(selector.startsWith('#'))return map.get(selector.slice(1))||null;
      throw Error('Unexpected selector '+selector);
    },
    querySelectorAll(selector){
      if(selector==='[data-i18n]')return [];
      if(selector==='.nav-btn')return nav;
      if(selector==='.page')return pages;
      if(selector==='.case-filter')return filters;
      if(selector==='.command-option')return map.get('command-results').children;
      throw Error('Unexpected list selector '+selector);
    },
    addEventListener(name,callback){(documentEvents[name]??=[]).push(callback)},
    fire(type,event={}){for(const cb of documentEvents[type]||[])cb(event)}
  };
  const ctx={
    document:doc,window:{scrollTo:()=>{}},
    setTimeout:()=>1,clearTimeout:()=>{},console
  };
  vm.runInNewContext(script,ctx,{filename:'control-v2.js',timeout:1000});
  const at=id=>{const node=map.get(id);assert.ok(node,'Missing DOM #'+id);return node};
  return {at,doc,nav,pages,filters};
}

test('page initializes without uncaught errors and all case filter controls receive a handler',()=>{
  const {at,filters}=boot();
  assert.equal(at('case-list').children.length,3);
  assert.equal(filters.length,4);
  for(const filter of filters)assert.equal(filter.listeners.click.length,1);
  filters.find(f=>f.dataset.caseFilter==='needs').fire('click');
  assert.equal(at('case-list').children.length,1);
  filters.find(f=>f.dataset.caseFilter==='review').fire('click');
  assert.equal(at('case-list').children.length,2);
});

test('executive command palette opens by keyboard, filters and selects a case without requests',()=>{
  const {at,doc,nav}=boot();
  let prevented=false;
  doc.fire('keydown',{ctrlKey:true,metaKey:false,key:'k',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(at('command-dialog').open,true);
  assert.equal(at('command-results').children.length,8);
  at('command-search').value='GreenSite';
  at('command-search').fire('input');
  assert.equal(at('command-results').children.length,1);
  let stop=false;
  at('command-search').fire('keydown',{key:'Enter',preventDefault(){stop=true}});
  assert.equal(stop,true);
  assert.equal(at('command-dialog').open,false);
  assert.equal(at('case-title').textContent,'GreenSite Learning');
  assert.equal(nav.find(n=>n.dataset.view==='clients').attributes['aria-current'],'page');
});

test('simulated information request changes next-state, never closes a case',()=>{
  const {at,filters}=boot();
  filters.find(f=>f.dataset.caseFilter==='needs').fire('click');
  assert.equal(at('case-title').textContent,'Eastline Operations');
  at('request-context').fire('click');
  assert.equal(at('action-dialog').open,true);
  at('dialog-text').value='Need one documented follow-up example';
  at('simulate-action').fire('click');
  assert.equal(at('action-dialog').open,false);
  assert.equal(at('case-list').children.length,1);
  assert.equal(at('case-status').textContent,'بانتظار رد (تجريبي)');
  assert.equal(at('case-journal-list').children.length,3);
  assert.equal(at('today-metrics').children[0].children[1].textContent,'2');
});

test('command results remain usable in English mode and allow section switching',()=>{
  const {at,nav}=boot();
  at('toggle-language').fire('click');
  at('command-open').fire('click');
  at('command-search').value='Studio';
  at('command-search').fire('input');
  assert.equal(at('command-results').children.length>=1,true);
  at('command-search').fire('keydown',{key:'Enter',preventDefault(){}});
  assert.equal(nav.find(n=>n.dataset.view==='studio').attributes['aria-current'],'page');
});
