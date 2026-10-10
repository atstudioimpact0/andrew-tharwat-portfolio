'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const derive=require('../admin/project-continuity-rc21.js').derive;
const render=require('../admin/project-continuity-rc21.js').render;
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const project={id:'p1',title:'ATS Demo Project',internal_action:'Review delivery'};
const domain=(id,status='active',lead=null,pid='p1')=>
  ({id,project_id:pid,status,lead_member_id:lead});
const task=(id,status='available',pid='p1',owner=null,due='2026-09-20T00:00:00Z')=>
  ({id,project_id:pid,status,owner_id:owner,due_at:due});
const message=(sender,when='2026-10-10T10:00:00Z',pid='p1')=>
  ({project_id:pid,sender_type:sender,created_at:when});
const now=Date.parse('2026-10-10T12:00:00Z');
function snapshot(other={}){
 return {project,domains:[domain('d1','active','member1')],tasks:[
  task('t1','accepted','p1','member1'),
  task('t2','in_progress','p1','member2','2026-10-20T00:00:00Z')
 ],messages:[message('admin')],reviews:[],...other};
}
test('RC21 returns no stale confidence before authorized project records load',()=>{
 assert.deepEqual(derive({}),{ready:false,reason:'Project details are not loaded yet.'});
 assert.deepEqual(derive({project:{id:''}}),{ready:false,reason:'Project details are not loaded yet.'});
});
test('RC21 preserves actual team totals and never creates tasks or token amounts',()=>{
 const state=snapshot();
 const before=JSON.stringify(state);
 const r=derive(state,now);
 assert.equal(r.counts.domains,1);
 assert.equal(r.counts.tasks,2);
 assert.equal(r.counts.accepted,1);
 assert.equal(r.counts.reviews,0);
 assert.equal(r.counts.overdue,0);
 assert.equal(r.action.key,'nextInternal');
 assert.equal(r.action.text,'Review delivery');
 assert.equal(r.tokens,'Existing Team Wallet (no new balance calculation)');
 assert.equal(r.projectId,'p1');
 assert.equal(JSON.stringify(state),before,'read-only, never mutates state');
});
test('RC21 ignores records from another project for every operational entity',()=>{
 const mixed=snapshot({domains:[domain('wrong','review',null,'p2')],
  tasks:[task('wrong','review','p2')],
  reviews:[{project_id:'p2',status:'awaiting_review'}],
  messages:[message('client',undefined,'p2')]});
 const r=derive(mixed,now);
 assert.deepEqual(r.counts,{domains:0,tasks:0,accepted:0,reviews:0,
  unassigned:0,overdue:0,messages:0,publishedReviews:0});
 assert.equal(r.action.key,'nextInternal');
});
test('RC21 prioritizes the current client response over delivery review, without sending a message',()=>{
 const r=derive(snapshot({messages:[message('admin','2026-10-09T12:00:00Z'),
  message('client','2026-10-10T11:00:00Z')],
  domains:[domain('d1','review','member1')],
  tasks:[task('t1','review')]}),now);
 assert.equal(r.action.key,'clientReply');
 assert.equal(r.action.target,'project-message-input');
});
test('RC21 founder receives domain outcome then a missing accountable lead',()=>{
 let r=derive(snapshot({domains:[domain('d1','review','m1'),domain('d2','active',null)]}),now);
 assert.equal(r.action.key,'reviewDomain');
 r=derive(snapshot({domains:[domain('d1','active',null)]}),now);
 assert.equal(r.action.key,'noLead');
 assert.equal(r.action.target,'project-domain-list');
});
test('RC21 reviews and overdue work use EXISTING Team Workspace',()=>{
 let r=derive(snapshot({tasks:[task('t1','review')]}),now);
 assert.equal(r.action.key,'taskReview');
 assert.equal(r.action.target,'team');
 r=derive(snapshot({tasks:[task('t1','in_progress','p1','m1')]}),now);
 assert.equal(r.action.key,'overdue');
 assert.equal(r.action.target,'team');
 r=derive(snapshot({tasks:[task('t1','available','p1',null,'2026-11-20T00:00:00Z')]}),now);
 assert.equal(r.action.key,'unassigned');
});
test('RC21 tracks pending client reviews, no fake approvals, no paid balance',()=>{
 const r=derive(snapshot({project:{id:'p1',title:'Demo'},
   reviews:[{project_id:'p1',status:'awaiting_review'}],
   tasks:[task('a','accepted','p1','m1')]}),now);
 assert.equal(r.action.key,'pendingClient');
 assert.equal(r.action.target,'project-review-list');
});
test('RC21 no-domain condition does not click build automatically',()=>{
 const r=derive({project:{id:'p1'},domains:[],tasks:[],messages:[],reviews:[]},now);
 assert.equal(r.action.key,'noDomains');
 assert.equal(r.action.target,'project-domain-list');
});
class El{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.textContent='';this.className='';}
 append(...els){this.children.push(...els)}
 appendChild(el){this.children.push(el);return el}
 replaceChildren(...els){this.children=els}
 setAttribute(k,v){this.attrs[k]=String(v)}
}
test('RC21 renders using safe DOM text nodes (including untrusted internal-action text)',()=>{
 const state=snapshot({project:{id:'p1',title:'Hi',internal_action:'<script>bad()</script>'}});
 const model=derive(state,now);
 const node=new El('section'),doc={createElement:tag=>new El(tag)};
 render(node,model,doc);
 const flatten=(e)=>[e,...e.children.flatMap(flatten)];
 const all=flatten(node);
 assert.equal(all.filter(x=>x.tagName==='SCRIPT').length,0);
 assert.equal(all.some(x=>x.textContent.includes('<script>bad()</script>')),true);
 assert.equal(all.filter(x=>x.tagName==='BUTTON').length,1);
 assert.equal(all.find(x=>x.tagName==='BUTTON').dataset.atsPulseTarget,'open-project-team-tasks');
});
test('RC21 integrated inside real project dialog without disabling existing operations',()=>{
 const html=read('admin/index.html');
 const app=read('admin/admin-unified.js');
 assert.match(html,/id="ats-project-pulse"/);
 assert.match(html,/project-continuity-rc21\.css/);
 assert.match(html,/project-continuity-rc21\.js/);
 assert.ok(html.indexOf('project-continuity-rc21.js')<html.indexOf('admin-unified.js'));
 for(const id of ['project-domain-list','open-project-team-tasks','project-message-thread',
 'project-review-list','project-file-list','build-project-delivery','send-project-message',
 'upload-project-file','save-studio-project']){
  assert.ok(html.includes('id="'+id+'"'),'preserve '+id);
 }
 assert.match(app,/ATS_PROJECT_CONTINUITY/);
 assert.match(app,/projectWorkspaceSeq/);
 assert.match(app,/requestId!==projectWorkspaceSeq/);
 assert.match(app,/ats-project-pulse/);
 assert.match(app,/state\.projectTasks/);
 assert.match(app,/state\.projectDomains/);
 assert.match(app,/state\.projectReviews/);
 assert.match(app,/open-project-team-tasks/);
 assert.doesNotMatch(read('admin/project-continuity-rc21.js'),
  /\bfetch\s*\(|\.rpc\s*\(|localStorage|sessionStorage|XMLHttpRequest|supabase|studio_token_ledger/);
});
test('RC21 changed actual operational scripts are syntactically valid',()=>{
 for(const p of ['admin/admin-unified.js','admin/project-continuity-rc21.js']){
  assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path.join(root,p)],{stdio:'pipe'}),p);
 }
});


test('RC21 round trip Project → Team → same authorized Project keeps existing permissions',()=>{
 const admin=read('admin/admin-unified.js');
 const team=read('team-v9/engine.js');
 assert.match(team,/validProjectForReturn=admin&&/);
 assert.match(team,/resume_project/);
 assert.match(team,/← Return to this project/);
 assert.match(admin,/new URLSearchParams\(location\.search\)\.get\('resume_project'\)/);
 assert.match(admin,/state\.projects\.some\(p=>p\.id===resume\)/);
 assert.match(admin,/window\.ATS_ADMIN\?\.switchTab\?\.\('studio-projects'\)/);
 assert.match(admin,/history\.replaceState\(null,''\,location\.pathname\+'#studio-projects'\)/);
 // No project ID entered in a URL can bypass the existing Trusted Device
 // browser gate or approved database project list.
 assert.ok(admin.indexOf("if(state.booted||!sb())return;")<
  admin.indexOf("const resume=new URLSearchParams(location.search)"));
 assert.doesNotMatch(team,/studio_token_ledger.*(?:insert|update|delete)/);
 assert.doesNotMatch(read('admin/project-continuity-rc21.js'),/studio_team_command/);
});
test('RC21 both operational screens compile, and existing wallet/member tasks remain intact',()=>{
 const team=read('team-v9/engine.js');
 for(const token of ['studio_token_ledger','studio_team_command',
  'studio_domain_command','studio_task_events','studio_task_dependencies',
  "tab==='wallet'","tab==='reviews'","tab==='history'"]){
  assert.ok(team.includes(token),token);
 }
 for(const p of ['team-v9/engine.js','admin/admin-unified.js']){
  assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path.join(root,p)],{stdio:'pipe'}),p);
 }
});
