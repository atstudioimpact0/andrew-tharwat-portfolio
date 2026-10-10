'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../team-v9/engine.js'),'utf8');
const start=script.indexOf('  function render() {'),end=script.indexOf('  function projectTitleForDomain(',start);
assert.ok(start>=0&&end>start,'real Team render function exists');
const renderSource=script.slice(start,end);
const linkStart=script.indexOf('  function updateReturnLink(){');
const linkEnd=script.indexOf('  async function refresh()',linkStart);
assert.ok(linkStart>=0&&linkEnd>linkStart,'return-link gating exists');
const linkSource=script.slice(linkStart,linkEnd);
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
function renderHarness(tab='tasks',requestedProject=A){
 const els=Object.create(null), root={},admin=true,me=null;
 const rows={
  projects:[{id:A,title:'Pilot A'},{id:B,title:'Pilot B'}],
  tasks:[
   {id:'a1',project_id:A,status:'available',owner_id:null,due_at:'2030-01-01T00:00:00Z'},
   {id:'b1',project_id:B,status:'available',owner_id:null,due_at:'2030-01-01T00:00:00Z'},
   {id:'b2',project_id:B,status:'review',owner_id:'member2',due_at:'2030-01-01T00:00:00Z'}
  ],
  streams:[{id:'dA',project_id:A,status:'active'},{id:'dB',project_id:B,status:'review'}],
  members:[],skills:[],ledger:[],events:[]
 };
 const $=sel=>(els[sel]??=(Object.assign({innerHTML:'',textContent:'',style:{}},{dataset:{}})));
 const metric=(name,n)=>'<span>'+name+': '+n+'</span>';
 const taskCard=t=>'<task>'+t.id+'</task>';
 const render=new Function('admin','requestedProject','rows','root','$','tab','me','myDomains','metric','openStates','overdue','escalated','load','taskCard','renderDomains','renderTaskBoard','renderWallet','context','name',
 renderSource+';return render;')(admin,requestedProject,rows,root,$,tab,me,()=>[],metric,['assigned','in_progress','review'],
 ()=>false,()=>false,()=>0,taskCard,()=>{},()=>{},()=>{},()=>({}),()=>'-');
 render();
 return els;
}
test('RC21: founder-scoped All tasks tab excludes other-project tasks',()=>{
 const e=renderHarness('tasks');
 assert.match(e['#team-content'].innerHTML,/<task>a1<\/task>/);
 assert.doesNotMatch(e['#team-content'].innerHTML,/<task>b[12]<\/task>/);
 assert.match(e['#team-metrics'].innerHTML,/Unassigned: 1/);
 assert.doesNotMatch(e['#team-overview'].innerHTML,/1 domain outcomes/);
});
test('RC21: founder-scoped Needs attention tab excludes other project tasks',()=>{
 const e=renderHarness('attention');
 assert.match(e['#team-content'].innerHTML,/<task>a1<\/task>/);
 assert.doesNotMatch(e['#team-content'].innerHTML,/<task>b[12]<\/task>/);
 assert.match(e['#team-metrics'].innerHTML,/Awaiting review: 0/);
});
test('RC21: Team metrics on unscoped dashboard can still show authorized global totals',()=>{
 const e=renderHarness('tasks',null);
 assert.match(e['#team-content'].innerHTML,/<task>a1<\/task>/);
 assert.match(e['#team-content'].innerHTML,/<task>b1<\/task>/);
 assert.match(e['#team-metrics'].innerHTML,/Unassigned: 2/);
 assert.match(e['#team-metrics'].innerHTML,/Awaiting review: 1/);
});
function returnHarness(authorized,validProjectForReturn=true,requestedProject=A){
 const created=[], toolbar={
  links:[],
  querySelector(){return this.links[0]||null},
  prepend(link){this.links.unshift(link)}
 };
 const root={querySelector:s=>s==='.team-toolbar > .team-actions'?toolbar:null};
 const document={createElement(tag){const x={tag,dataset:{},href:'',textContent:'',remove(){toolbar.links=toolbar.links.filter(l=>l!==x)}};created.push(x);return x;}};
 const rows={projects:authorized.map(id=>({id}))};
 const update=new Function('admin','root','validProjectForReturn','rows','requestedProject','document',
 linkSource+';return updateReturnLink;')(true,root,validProjectForReturn,rows,requestedProject,document);
 update();
 return {toolbar,created,update};
}
test('RC21: malformed/unauthorized project never displays Founder return link',()=>{
 assert.equal(returnHarness([],true).toolbar.links.length,0);
 assert.equal(returnHarness([B],true).toolbar.links.length,0);
 assert.equal(returnHarness([A],false).toolbar.links.length,0);
});
test('RC21: approved project shows one safe return link (and no duplicate after refresh)',()=>{
 const h=returnHarness([A]);assert.equal(h.toolbar.links.length,1);
 assert.equal(h.toolbar.links[0].href,'/admin/?resume_project='+A+'#studio-projects');
 h.update();assert.equal(h.toolbar.links.length,1,'refresh does not create duplicate links');
});
test('RC21: production server data APIs remain unchanged',()=>{
 assert.match(script,/studio_team_command/);
 assert.match(script,/studio_domain_command/);
 assert.match(script,/studio_token_ledger/);
 assert.match(script,/studio_task_events/);
 assert.match(script,/studio_task_dependencies/);
});
