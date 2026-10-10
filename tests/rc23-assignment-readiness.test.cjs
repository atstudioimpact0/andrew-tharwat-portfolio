'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {derive,render}=require('../team-v9/readiness-rc23.js');
const A='project-a',B='project-b';
const members=[
 {id:'worker-software',active:true,available:true,capacity:2},
 {id:'worker-content',active:true,available:true,capacity:2},
 {id:'worker-ai',active:true,available:true,capacity:2}
];
const skills=[
 {member_id:'worker-software',skill:'software development',level:5},
 {member_id:'worker-content',skill:'content writing',level:3},
 {member_id:'worker-content',skill:'ai / automation',level:2},
 {member_id:'worker-ai',skill:'ai / automation',level:5},
 {member_id:'worker-ai',skill:'data / research',level:5}
];
function task(id,skill,reviewer,status='available',projectId=A){
 return {id,project_id:projectId,title:'Task '+id,status,required_skill:skill,required_level:1,reviewer_id:reviewer};
}
const tasks=[
 task('root-software','software development','worker-software'),
 task('root-content','content writing','worker-content'),
 task('root-research','data / research','worker-content','assigned'),
 task('ready-ai','ai / automation','worker-content'),
 task('waiting-ai','ai / automation','worker-content'),
 task('other-project','ai / automation','worker-content','available',B)
];
const dependencies=[{task_id:'waiting-ai',depends_on:'root-research'},
 {task_id:'other-project',depends_on:'root-research'}];
function model(overrides={}){
 return derive({projectId:A,tasks,members,skills,dependencies,...overrides});
}
test('RC23 correctly identifies reviewer-as-only-expert root blockers',()=>{
 const r=model();
 assert.equal(r.available,4);
 assert.equal(r.needsReviewSeparation,2);
 assert.equal(r.waitingOnPrerequisites,1);
 assert.equal(r.canAssign,1);
 assert.deepEqual(r.items.find(x=>x.id==='root-software').reasons,['reviewer']);
 assert.deepEqual(r.items.find(x=>x.id==='root-content').reasons,['reviewer']);
 assert.equal(r.items.some(x=>x.id==='other-project'),false);
});
test('RC23 detects dependency blocker independently of matching skill',()=>{
 const r=model();
 const t=r.items.find(x=>x.id==='waiting-ai');
 assert.deepEqual(t.reasons,['prereq']);
 assert.equal(t.unmet,1);
 assert.equal(t.candidates,1);
});
test('RC23 never counts an inactive or at-capacity specialist as ready',()=>{
 const capacityMembers=members.map(m=>m.id==='worker-ai'?{...m,capacity:0}:m);
 let r=model({members:capacityMembers});
 assert.deepEqual(r.items.find(x=>x.id==='ready-ai').reasons,['capacity']);
 assert.equal(r.capacityBlocked,2,'both ready and dependent AI tasks have capacity constraints');
 const disabled=members.map(m=>m.id==='worker-ai'?{...m,available:false}:m);
 r=model({members:disabled});
 assert.deepEqual(r.items.find(x=>x.id==='ready-ai').reasons,['reviewer']);
});
test('RC23 does not mutate input rows, invent tokens or make API calls',()=>{
 const input={projectId:A,tasks,members,skills,dependencies};
 const before=JSON.stringify(input);
 const m=derive(input);
 assert.equal(JSON.stringify(input),before);
 assert.ok(Object.isFrozen(m));
 const source=read('team-v9/readiness-rc23.js');
 assert.doesNotMatch(source,/\bfetch\s*\(|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|studio_token_ledger/);
});
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.textContent='';this.className='';this.dataset={};}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(){this.children=[]}
}
test('RC23 uses textContent, never parses client or task titles as HTML',()=>{
 const bad=model({tasks:tasks.map(t=>t.id==='root-software'?{...t,title:'<img src=x onerror=alert(1)>'}:t)});
 const rootNode=new Element('section'),doc={createElement:tag=>new Element(tag)};
 render(rootNode,bad,doc);
 const all=[];function visit(x){all.push(x);x.children.forEach(visit)}visit(rootNode);
 assert.equal(all.filter(x=>x.tagName==='IMG').length,0);
 assert.equal(all.some(x=>x.textContent==='<img src=x onerror=alert(1)>'),true);
});
test('RC23 is wired only to existing Trusted Device founder Team, not member login',()=>{
 const html=read('admin/team-tasks.html'),member=read('team-v9/index.html'),engine=read('team-v9/engine.js');
 assert.match(html,/readiness-rc23\.css\?v=1/);
 assert.ok(html.indexOf('readiness-rc23.js')>=0&&html.indexOf('readiness-rc23.js')<html.indexOf('engine.js?v=3'));
 assert.doesNotMatch(member,/readiness-rc23\.js/);
 assert.match(engine,/id="team-readiness"/);
 assert.match(engine,/function renderReadiness\(\)/);
 assert.match(engine,/bridge\.derive\(\{projectId:requestedProject/);
 assert.match(engine,/if\(!admin\|\|!requestedProject\|\|!bridge/);
 assert.match(engine,/renderReadiness\(\)/);
 assert.match(engine,/studio_team_command/);
 assert.match(engine,/studio_token_ledger/);
});
test('RC23 feature source syntax passes node parser',()=>{
 for(const f of ['team-v9/readiness-rc23.js','team-v9/engine.js']){
  const result=cp.spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||f);
 }
});
