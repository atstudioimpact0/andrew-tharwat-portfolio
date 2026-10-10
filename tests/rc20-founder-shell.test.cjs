'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {create}=require('../control-v2-preview/founder-shell-rc20.js');
const root=path.join(__dirname,'../control-v2-preview');
const page=name=>fs.readFileSync(path.join(root,name),'utf8');
function node(id){
 const attrs={},events={};
 return {id,attrs,events,textContent:'',hidden:true,focused:false,
  setAttribute(k,v){attrs[k]=v},
  addEventListener(k,fn){events[k]=fn},
  querySelectorAll(){return [{addEventListener(){}}]},
  focus(){this.focused=true},
  classList:{value:new Set(),toggle(k,enable){if(enable)this.value.add(k);else this.value.delete(k)},
   remove(k){this.value.delete(k)},contains(k){return this.value.has(k)}}
 };
}
function fixture(){
 const ids=['rc20-layout','rc20-rail','rc20-overlay','rc20-menu','rc20-dismiss',
   'rc20-rail-kicker','rc20-brand-line','rc20-philosophy','rc20-subtitle',
   'rc20-nav-clients','rc20-statusline'];
 const nodes=new Map(ids.map(k=>[k,node(k)]));
 const listeners={};
 const view={innerWidth:390,
  addEventListener(k,fn){listeners[k]=fn},
  removeEventListener(k){delete listeners[k]}};
 const doc={
  documentElement:{lang:'ar',dir:'rtl'},defaultView:view,
  getElementById:k=>nodes.get(k),
  addEventListener(k,fn){listeners[k]=fn},
  removeEventListener(k){delete listeners[k]}
 };
 return {nodes,doc,view,listeners,get:k=>nodes.get(k)};
}
test('RC20 adds one canonical ATS workspace shell to the existing real-data Founder index and case',()=>{
 for(const name of ['founder-clients-rc14.html','founder-staging-rc13.html']){
  const html=page(name);
  assert.match(html,/id="rc20-layout"/);
  assert.match(html,/id="rc20-rail"/);
  assert.match(html,/id="rc20-menu"/);
  assert.match(html,/id="rc20-overlay"/);
  assert.match(html,/src="\/control-v2\/assets\/logo-mark-official\.png"/);
  assert.match(html,/founder-shell-rc20\.css/);
  assert.match(html,/founder-shell-rc20\.js/);
  assert.match(html,/connect-src 'self'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/frame-ancestors 'none'/);
  assert.doesNotMatch(html,/<form\b|onload=|onclick=|<script(?![^>]*\bsrc=)/i);
 }
 const index=page('founder-clients-rc14.html'),detail=page('founder-staging-rc13.html');
 assert.match(index,/id="rc14-list"/);
 assert.match(index,/id="rc15-more"/);
 assert.match(detail,/id="rc13-problem"/);
 assert.match(detail,/id="rc13-known"/);
 assert.match(detail,/id="rc13-missing"/);
 assert.match(detail,/id="rc13-next"/);
});
test('RC20 mobile nav opens and closes on request, overlay and Escape, no inert menu',()=>{
 const f=fixture(),app=create({documentRef:f.doc});
 assert.equal(f.get('rc20-menu').attrs['aria-expanded'],'false');
 assert.equal(f.get('rc20-overlay').hidden,true);
 f.get('rc20-menu').events.click();
 assert.equal(f.get('rc20-layout').classList.contains('rc20-nav-open'),true);
 assert.equal(f.get('rc20-overlay').hidden,false);
 assert.equal(f.get('rc20-menu').attrs['aria-expanded'],'true');
 assert.equal(f.get('rc20-dismiss').focused,true);
 f.listeners.keydown({key:'Escape'});
 assert.equal(f.get('rc20-layout').classList.contains('rc20-nav-open'),false);
 assert.equal(f.get('rc20-overlay').hidden,true);
 f.get('rc20-menu').events.click();
 f.get('rc20-overlay').events.click();
 assert.equal(f.get('rc20-overlay').hidden,true);
 app.dispose();
 assert.equal(f.get('rc20-layout').classList.contains('rc20-nav-open'),false);
});
test('RC20 translates shell without contacting backend or persisting state',()=>{
 const f=fixture(),app=create({documentRef:f.doc});
 assert.equal(f.get('rc20-nav-clients').textContent,'العملاء');
 assert.match(f.get('rc20-philosophy').textContent,/عقول مختلفة/);
 f.doc.documentElement.lang='en';f.doc.documentElement.dir='ltr';
 app.translate();
 assert.equal(f.get('rc20-nav-clients').textContent,'Clients');
 assert.match(f.get('rc20-philosophy').textContent,/Different minds/);
 assert.equal(f.get('rc20-menu').attrs['aria-label'],'Open menu');
 app.dispose();
});
test('RC20 CSS is responsive, RTL-friendly and honors reduced-motion preferences',()=>{
 const css=page('founder-shell-rc20.css');
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/html\[dir=ltr\]/);
 assert.match(css,/html\[dir=rtl\]/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const js=page('founder-shell-rc20.js');
 assert.doesNotMatch(js,/\bfetch\s*\(|localStorage\s*\.|sessionStorage\s*\.|XMLHttpRequest|authorizationCodeGrant\s*\(/);
});
