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

test('RC24 selects a real assigned, unblocked pilot task even with zero new assignments ready',()=>{
 const assigned=task('live-first','data / research','worker-content','assigned');
 assigned.owner_id='worker-ai';
 const items=[
   assigned,
   task('blocked-root','software development','worker-software'),
   task('blocked-second','ai / automation','worker-ai')
 ];
 const r=model({tasks:items,dependencies:[{task_id:'blocked-second',depends_on:'blocked-root'}]});
 assert.equal(r.canAssign,0,'all new assignments blocked');
 assert.equal(r.nextStep.kind,'assigned');
 assert.equal(r.nextStep.taskId,'live-first');
 assert.equal(r.nextStep.action,'details','never impersonate an employee');
 assert.match(r.nextStep.instruction,/assigned employee can start/);
});
test('RC24 reviewer decision takes precedence, but never auto-accepts or sends notifications',()=>{
 const inReview={...task('submitted','data / research','worker-content','review'),owner_id:'worker-ai'};
 const inProgress={...task('underway','ai / automation','worker-content','in_progress'),owner_id:'worker-ai'};
 const r=model({tasks:[inProgress,inReview]});
 assert.equal(r.nextStep.kind,'review');
 assert.equal(r.nextStep.taskId,'submitted');
 assert.equal(r.nextStep.action,'details');
});
test('RC24 highlights the reviewer-separation fix when there is no work in progress',()=>{
 const r=model({tasks:[task('root-software','software development','worker-software')]});
 assert.equal(r.nextStep.kind,'reviewer_setup');
 assert.equal(r.nextStep.action,'task','opens existing founder task editor, not a new RPC');
});
test('RC24 never suggests an assigned task whose dependencies are not yet accepted',()=>{
 const assigned={...task('not-open','ai / automation','worker-content','assigned'),owner_id:'worker-ai'};
 const prior=task('blocking','software development','worker-software','available');
 const r=model({tasks:[assigned,prior],dependencies:[{task_id:'not-open',depends_on:'blocking'}]});
 assert.equal(r.nextStep.kind,'reviewer_setup');
 assert.equal(r.nextStep.taskId,'blocking');
});
test('RC24 renders next action as a safe button delegated to existing Team task UI',()=>{
 const active={...task('start-1','data / research','worker-content','assigned'),owner_id:'worker-ai'};
 const m=model({tasks:[active]});
 const root=new Element('section'),doc={createElement:tag=>new Element(tag)};
 render(root,m,doc);
 const all=[];function visit(x){all.push(x);x.children.forEach(visit)}visit(root);
 const buttons=all.filter(x=>x.tagName==='BUTTON'&&x.dataset.teamAction);
 assert.equal(buttons.length,1);
 assert.equal(buttons[0].dataset.teamAction,'details');
 assert.equal(buttons[0].dataset.id,'start-1');
 assert.equal(all.filter(x=>x.tagName==='FORM').length,0);
 const engine=read('team-v9/engine.js');
 assert.match(engine,/const b=e.target.closest\('\[data-team-action\]'\)/);
 assert.match(engine,/if\(a==='task'\)return taskForm\(id\)/);
 assert.match(engine,/taskAction\(a,id\)/);
});
