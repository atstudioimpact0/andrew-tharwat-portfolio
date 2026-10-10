'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('admin/admin-unified.js');
const ID_A='11111111-1111-4111-8111-111111111111';
const ID_B='22222222-2222-4222-8222-222222222222';
function section(start,end){
 const a=app.indexOf(start);const b=app.indexOf(end,a+start.length);
 assert.ok(a!==-1&&b!==-1,'function source boundaries: '+start);
 return app.slice(a,b);
}
const loadSource=section('  async function loadProjectWorkspace(project=state.currentProject){','  function domainLeadName(');
const bootSource=section('  async function boot(){','  async function count(');

function harness(){
 const state={currentProject:null,loaded:{},projectMessages:[],projectFiles:[],projectReviews:[],projectRevisions:[],projectDomains:[],projectTasks:[],teamMembers:[],teamSkills:[]};
 const nodes=new Map();
 const el=s=>{
  if(!nodes.has(s))nodes.set(s,{open:true,innerHTML:'',textContent:'',attrs:{},setAttribute(name,value){this.attrs[name]=value}});
  return nodes.get(s);
 };
 const pending=[],writes=[],renders=[],errors=[];
 let batch=0;
 function from(table){
  if(table==='studio_messages')batch++;
  const id=batch,criteria={},write={};
  let kind='read';
  const q={
   select(){return this},
   eq(key,value){criteria[key]=value;return this},
   order(){return this},
   limit(){return this},
   update(value){kind='write';write.payload=value;return this},
   in(key,value){write[key]=value;return this},
   then(done,fail){
    if(kind==='write'){
     writes.push({batch:id,table,criteria:{...criteria},write});
     return Promise.resolve({data:[],error:null}).then(done,fail);
    }
    return new Promise(resolve=>pending.push({batch:id,table,criteria:{...criteria},resolve})).then(done,fail);
   }
  };
  return q;
 }
 const load=new Function('state','document','sb','notify','renderProjectWorkspace',
  'let projectWorkspaceSeq=0;const $=s=>document.querySelector(s);'+loadSource+';return loadProjectWorkspace;')
  (state,{querySelector:el},()=>({from}), (...args)=>errors.push(args),
   ()=>renders.push({project:state.currentProject?.id,messages:state.projectMessages.map(x=>x.id)}));
 const project=id=>({id,title:id,internal_action:'Review'});
 async function ready(){await Promise.resolve();await Promise.resolve();}
 function finish(batchId,opts={}){
  const queue=pending.filter(q=>q.batch===batchId);
  assert.equal(queue.length,8,'all eight authorized tables loaded');
  for(const q of queue){
   let data=[];
   if(q.table==='studio_messages')data=opts.messages||[];
   if(q.table==='studio_project_workstreams')data=[{id:'domain-'+batchId,project_id:opts.projectId}];
   if(q.table==='studio_project_tasks')data=[{id:'task-'+batchId,project_id:opts.projectId}];
   q.resolve(q.table===opts.failTable?{data:null,error:{message:'fetch failed'}}:{data,error:null});
  }
 }
 return {state,el,load,pending,writes,renders,errors,ready,finish,project};
}

test('RC21: out-of-order loads never display nor acknowledge a different project',async()=>{
 const h=harness();
 const a=h.project(ID_A),b=h.project(ID_B);
 h.state.currentProject=a;const requestA=h.load(a);await h.ready();
 h.state.currentProject=b;const requestB=h.load(b);await h.ready();
 h.finish(2,{projectId:ID_B,messages:[{id:'message-b',project_id:ID_B,sender_type:'client',is_read_by_admin:false}]});
 await requestB;
 assert.deepEqual(h.renders,[{project:ID_B,messages:['message-b']}]);
 assert.equal(h.writes.length,1);
 assert.deepEqual(h.writes[0].write.id,['message-b']);
 h.finish(1,{projectId:ID_A,messages:[{id:'message-a',project_id:ID_A,sender_type:'client',is_read_by_admin:false}]});
 await requestA;
 assert.deepEqual(h.renders,[{project:ID_B,messages:['message-b']}]);
 assert.equal(h.writes.length,1,'unseen A message was NOT marked read');
 assert.equal(h.el('#ats-project-pulse').attrs['aria-busy'],'false');
});
test('RC21: closing a project during its load must not acknowledge unseen messages',async()=>{
 const h=harness(),a=h.project(ID_A);h.state.currentProject=a;
 const work=h.load(a);await h.ready();
 h.el('#studio-project-dialog').open=false;
 h.finish(1,{projectId:ID_A,messages:[{id:'unseen',project_id:ID_A,sender_type:'client',is_read_by_admin:false}]});
 await work;
 assert.equal(h.renders.length,0);
 assert.equal(h.writes.length,0);
});
test('RC21: failed fetch reports error without showing stale counts or writing',async()=>{
 const h=harness(),a=h.project(ID_A);h.state.currentProject=a;
 const work=h.load(a);await h.ready();
 h.finish(1,{projectId:ID_A,failTable:'studio_files'});
 await work;
 assert.equal(h.writes.length,0);
 assert.equal(h.renders.length,0);
 assert.match(h.el('#ats-project-pulse').textContent,/unavailable/);
 assert.equal(h.el('#ats-project-pulse').attrs['aria-busy'],'false');
});
function bootHarness(target,authorized=[]){
 const state={booted:false,projects:[]},calls=[];
 const location={search:'?resume_project='+target,hash:'#studio-projects',pathname:'/admin/'};
 const history={replaceState(...x){calls.push(['replace',...x])}};
 const window={ATS_ADMIN:{switchTab(tab){calls.push(['tab',tab])}}};
 const boot=new Function('sb','state','loadDashboard','loadProjects','openStudioProject','notify','location','window','history','loadPanel',
  bootSource+';return boot;')(()=>({}),state,
  async()=>{calls.push(['dashboard'])},
  async()=>{state.projects=authorized.map(id=>({id}));calls.push(['projects'])},
  async id=>{calls.push(['open',id])},
  (msg,type)=>calls.push(['notify',type]),
  location,window,history,
  tab=>calls.push(['loadPanel',tab]));
 return {boot,calls,state};
}
test('RC21: returning to an authorized project resumes the same project after access load',async()=>{
 const h=bootHarness(ID_A,[ID_A]);await h.boot();
 assert.deepEqual(h.calls.slice(0,3).map(x=>x[0]),['dashboard','tab','projects']);
 assert.ok(h.calls.some(x=>x[0]==='open'&&x[1]===ID_A));
 assert.ok(h.calls.some(x=>x[0]==='replace'),'consume one-time URL');
});
test('RC21: a valid-looking ID not on the approved list never opens any project',async()=>{
 const h=bootHarness(ID_B,[ID_A]);await h.boot();
 assert.equal(h.calls.some(x=>x[0]==='open'),false);
 assert.ok(h.calls.some(x=>x[0]==='notify'));
 assert.ok(h.calls.some(x=>x[0]==='replace'));
});
test('RC21: malformed project ID never triggers direct project lookup',async()=>{
 const h=bootHarness('not-an-authorized-id',[ID_A]);await h.boot();
 assert.equal(h.calls.some(x=>x[0]==='open'),false);
 assert.equal(h.calls.some(x=>x[0]==='projects'),false);
});
test('RC21: Project-to-Team link remains scoped, hash-activated and governed by trusted device',()=>{
 const team=read('team-v9/engine.js');
 const gate=read('admin/team-access.js');
 const html=read('admin/team-tasks.html');
 assert.match(app,/'\/admin\/team-tasks\?project='\+encodeURIComponent\(state\.currentProject\.id\)\+'#team'/);
 assert.match(app,/'&domain='\+encodeURIComponent\(domainTeam\.dataset\.domainOpenTeam\)\+'#team'/);
 assert.match(team,/validProjectForReturn=admin&&/);
 assert.match(team,/return to this project/i);
 assert.match(team,/location\.hash!=='#team'/);
 assert.match(gate,/data\.status==='approved'/);
 assert.match(gate,/if\(!location\.hash\)location\.hash='team'/);
 assert.match(html,/team-v9\/engine\.js/);
 assert.match(read('vercel.json'),/"cleanUrls": true/);
});
test('RC21: branch operational sources remain valid JS with no new backend/wallet mutation',()=>{
 for(const p of ['admin/admin-unified.js','team-v9/engine.js','admin/project-continuity-rc21.js']){
  const x=cp.spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});
  assert.equal(x.status,0,p+': '+x.stderr);
 }
 const pure=read('admin/project-continuity-rc21.js');
 assert.doesNotMatch(pure,/studio_token_ledger|\.rpc\(|fetch\(|\.insert\(|\.update\(/);
});
