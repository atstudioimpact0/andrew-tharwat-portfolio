'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'team-v9/engine.js'),'utf8');
const start=source.indexOf('  function renderWallet(content) {');
const end=source.indexOf('  function modal(',start);
assert.ok(start>=0&&end>start,'existing production wallet renderer found');
const walletSource=source.slice(start,end);
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const m1='member-1',m2='member-2';
const ledger=[
 {id:'a-reserve',project_id:A,member_id:m1,event_type:'RESERVED',tokens:20,reason:'Task assigned',created_at:'2026-10-01T00:00:00Z'},
 {id:'a-release',project_id:A,member_id:m1,event_type:'RELEASED',tokens:20,reason:'Task accepted',created_at:'2026-10-02T00:00:00Z'},
 {id:'a-earned',project_id:A,member_id:m1,event_type:'EARNED',tokens:20,reason:'Accepted evidence',created_at:'2026-10-03T00:00:00Z'},
 {id:'b-reserve',project_id:B,member_id:m2,event_type:'RESERVED',tokens:300,reason:'Other client',created_at:'2026-10-04T00:00:00Z'},
 {id:'b-earned',project_id:B,member_id:m2,event_type:'EARNED',tokens:300,reason:'Do not disclose',created_at:'2026-10-05T00:00:00Z'}
];
function wallet({admin,requestedProject=null,me=null,projects=[A,B],entries=ledger}){
 const rows={projects:projects.map(id=>({id})),ledger:entries,tasks:[]};
 const metric=(label,n)=>'<div>'+label+' = '+n+'</div>';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fn=new Function('rows','admin','requestedProject','me','metric','esc','name','date',walletSource+';return renderWallet;')
    (rows,admin,requestedProject,me,metric,esc,x=>x,d=>d);
 const node={innerHTML:''};const before=JSON.stringify(rows);fn(node);
 assert.equal(JSON.stringify(rows),before,'read-only - never mutates source records');
 return node.innerHTML;
}
test('RC25 founder wallet stays scoped to an authorized selected client project',()=>{
 const html=wallet({admin:true,requestedProject:A});
 assert.match(html,/Project-scoped wallet/);
 assert.match(html,/Reserved tokens = 0/);
 assert.match(html,/Earned \/ lifetime tokens = 20/);
 assert.match(html,/Accepted evidence/);
 assert.doesNotMatch(html,/Other client|Do not disclose|300 tokens/);
});
test('RC25 invalid / unauthorized project deep link renders no ledger events',()=>{
 const html=wallet({admin:true,requestedProject:B,projects:[A]});
 assert.match(html,/Project not available/);
 assert.match(html,/Reserved tokens = 0/);
 assert.match(html,/Earned \/ lifetime tokens = 0/);
 assert.doesNotMatch(html,/Other client|Do not disclose|Accepted evidence/);
});
test('RC25 founder can still inspect all authorized ledger entries in the global team view',()=>{
 const html=wallet({admin:true});
 assert.match(html,/All projects/);
 assert.match(html,/Reserved tokens = 300/);
 assert.match(html,/Earned \/ lifetime tokens = 320/);
 assert.match(html,/Other client/);
});
test('RC25 member wallet never shows another member token record even if a client mistakenly provides it',()=>{
 const html=wallet({admin:false,me:m1});
 assert.match(html,/My contribution ledger/);
 assert.match(html,/Earned \/ lifetime tokens = 20/);
 assert.doesNotMatch(html,/Do not disclose|Other client|300 tokens/);
});
test('RC25 signed-out member cannot display any token ledger',()=>{
 const html=wallet({admin:false,me:null});
 assert.match(html,/Earned \/ lifetime tokens = 0/);
 assert.doesNotMatch(html,/Accepted evidence|Other client|Do not disclose/);
});
test('RC25 does not change server RPCs, event schema, or production contribution policy',()=>{
 assert.match(source,/studio_team_command/);
 assert.match(source,/studio_token_ledger/);
 assert.match(source,/event_type==='RESERVED'/);
 assert.match(source,/event_type==='RELEASED'/);
 assert.match(source,/\\['EARNED','BONUS'\\]/);
 const x=cp.spawnSync(process.execPath,['--check',path.join(root,'team-v9/engine.js')],{encoding:'utf8'});
 assert.equal(x.status,0,x.stderr);
});
