'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {issueStaffSession,revokeStaffSession}=require('../server/access-v2/session.cjs');
const {createPgStaffStore}=require('../server/access-v2/pg-staff-store-rc8.cjs');
const {createFounderWorkspaceRead}=require('../server/access-v2/founder-workspace-rc8.cjs');

const origin='https://staging.atstudioimpact.com';
const cid='31b019c8-1e73-4689-92fa-03a140000001';
const otherCid='31b019c8-1e73-4689-92fa-03a140000002';
const issuer='https://accounts.zoho.com';

function harness(){
 const staff=[
  {id:'ats-founder',tenant_id:'ats-tenant-01',role:'founder',issuer,subject:'subject-founder',active:true},
  {id:'ats-reviewer',tenant_id:'ats-tenant-01',role:'reviewer',issuer,subject:'subject-reviewer',active:true},
  {id:'other-founder',tenant_id:'other-tenant-02',role:'founder',issuer,subject:'subject-other',active:true}
 ];
 const sessions=new Map(),queries=[],cases=new Map();
 cases.set('ats-tenant-01/'+cid,{
  case_id:cid,input_version:2,analysis_state:'collecting',
  intake_brief:{service:'Website',project_goal:'Need clarity',current_assets:['logo'],timeline:'soon',source:'unconfirmed_client_intake'},
  known:{current_state:'Old website',impact:'confusing',desired_outcome:'clear path',evidence:null},
  missing_fields:['evidence'],supporting_upload_count:0,
  next_action:{kind:'collect_evidence',text:'Add an example',task_hint:null},
  review_pending_count:0,active_work_count:0,
  email:'must-not-leak@example.com',sensitive_internal_secret:'do-not-return'
 });
 cases.set('other-tenant-02/'+otherCid,{
  case_id:otherCid,input_version:1,analysis_state:'collecting',
  intake_brief:{service:'Private',project_goal:'unrelated',current_assets:[],timeline:null},
  known:{},missing_fields:['evidence'],
  next_action:{kind:'collect_evidence',text:'Ask',task_hint:null},
  review_pending_count:0,active_work_count:0
 });
 let dbBreak=false;
 const pool={async query(sql,values){
  queries.push({sql,values});
  if(dbBreak)throw new Error('private db failure');
  if(sql.startsWith('SELECT id,tenant_id')){
   const row=staff.find(s=>s.issuer===values[0]&&s.subject===values[1]);
   return {rows:row?[{...row}]:[],rowCount:row?1:0};
  }
  if(sql.startsWith('INSERT INTO ats_access_v2.sessions')){
   const match=staff.find(s=>s.active&&s.id===values[1]&&s.tenant_id===values[2]&&
        s.role===values[3]&&s.issuer===values[4]&&s.subject===values[5]);
   if(!match||sessions.has(values[0]))return {rowCount:0,rows:[]};
   sessions.set(values[0],{
    staff_id:match.id,tenant_id:match.tenant_id,role:match.role,issuer:match.issuer,
    subject:match.subject,issued_at:new Date(values[6]),expires_at:new Date(values[7])
   });
   return {rowCount:1,rows:[{token_hash:values[0]}]};
  }
  if(sql.startsWith('SELECT staff_id,tenant_id')){
   const row=sessions.get(values[0]);return {rows:row?[{...row}]:[],rowCount:row?1:0};
  }
  if(sql.startsWith('DELETE FROM ats_access_v2.sessions')){
   sessions.delete(values[0]);return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('SELECT ats_core.ats_read_scoped_workspace_v1')){
   assert.match(sql,/\$1::uuid,\$2::text/);
   const workspace=cases.get(values[1]+'/'+values[0])||null;
   return {rows:[{workspace}]};
  }
  throw new Error('Unexpected SQL');
 }};
 const sessionStore=createPgStaffStore({pool});
 const handler=createFounderWorkspaceRead({pool,sessionStore,lookupStaff:sessionStore.lookupStaff});
 async function login(row=staff[0]){
  const p={verified:true,id:row.id,tenantId:row.tenant_id,role:row.role,issuer:row.issuer,subject:row.subject};
  const result=await issueStaffSession({principal:p,store:sessionStore});
  return result.setCookie.split(';')[0];
 }
 const url=(id=cid)=>origin+'/api/v2/founder/cases/'+id+'/workspace';
 const req=(cookie,urlValue=url(),method='GET',extra={})=>({
   method,url:urlValue,headers:{cookie,...extra}
 });
 return {staff,sessions,queries,cases,sessionStore,handler,login,req,url,setDbBreak(v){dbBreak=v}};
}

test('RC8 real V2 session persists only token hash, reads scoped case and returns one next action',async()=>{
 const t=harness(),cookie=await t.login();
 assert.equal(t.sessions.size,1);
 assert.ok([...t.sessions.keys()][0].match(/^[a-f0-9]{64}$/));
 assert.ok(!JSON.stringify([...t.sessions.values()]).includes(cookie.split('=')[1]));
 const r=await t.handler(t.req(cookie));
 assert.equal(r.status,200);
 assert.deepEqual(r.body.missing_fields,['evidence']);
 assert.equal(r.body.next_action.kind,'collect_evidence');
 assert.equal(r.body.intake_brief.source,'unconfirmed_client_intake');
 assert.equal(r.headers['Cache-Control'],'no-store, max-age=0');
 assert.ok(!JSON.stringify(r.body).includes('must-not-leak@example.com'));
 assert.ok(!JSON.stringify(r.body).includes('do-not-return'));
 const sql=t.queries.find(x=>x.sql.includes('ats_read_scoped_workspace_v1'));
 assert.deepEqual(sql.values,[cid,'ats-tenant-01']);
});
test('no cookie and forged browser verified-role headers are rejected',async()=>{
 const t=harness(),r=await t.handler(t.req('','',undefined,{role:'founder',verified:'true',tenantId:'ats-tenant-01'}));
 assert.notEqual(r.status,200);
 const rr=await t.handler(t.req('not-a-session',t.url(),'GET',{role:'founder',tenantId:'ats-tenant-01'}));
 assert.equal(rr.status,401);
 assert.equal(t.queries.filter(q=>q.sql.includes('ats_read_scoped_workspace_v1')).length,0);
});
test('reviewer cannot read Founder case despite valid verified staff session',async()=>{
 const t=harness(),cookie=await t.login(t.staff[1]);
 assert.equal((await t.handler(t.req(cookie))).status,403);
});
test('cross-tenant founder cannot read target client case',async()=>{
 const t=harness(),cookie=await t.login(t.staff[2]);
 assert.equal((await t.handler(t.req(cookie))).status,404);
 const q=t.queries.find(x=>x.sql.includes('ats_read_scoped_workspace_v1'));
 assert.deepEqual(q.values,[cid,'other-tenant-02']);
});
test('revoke invalidates the session, staff offboarding denies next read',async()=>{
 const t=harness(),cookie=await t.login();
 assert.equal((await t.handler(t.req(cookie))).status,200);
 await revokeStaffSession({cookieHeader:cookie,store:t.sessionStore});
 assert.equal((await t.handler(t.req(cookie))).status,401);
 const cookie2=await t.login();
 t.staff[0].active=false;
 assert.equal((await t.handler(t.req(cookie2))).status,401);
 assert.equal(t.sessions.size,0);
});
test('staff role change revokes old session immediately',async()=>{
 const t=harness(),cookie=await t.login();
 t.staff[0].role='reviewer';
 assert.equal((await t.handler(t.req(cookie))).status,401);
});
test('tenant cannot be overridden by query, Host or request body',async()=>{
 const t=harness(),cookie=await t.login();
 assert.equal((await t.handler(t.req(cookie,t.url()+'?tenant_id=other-tenant-02'))).status,400);
 const q=await t.handler({...t.req(cookie),body:{tenantId:'other-tenant-02'},headers:{cookie,host:'evil.invalid'}});
 assert.equal(q.status,200);
 assert.equal(t.queries.filter(x=>x.sql.includes('ats_read_scoped_workspace_v1')).at(-1).values[1],'ats-tenant-01');
});
test('POST, malicious origin, malformed UUID and unknown case fail closed',async()=>{
 const t=harness(),cookie=await t.login();
 assert.equal((await t.handler(t.req(cookie,t.url(),'POST'))).status,405);
 assert.equal((await t.handler(t.req(cookie,'https://evil.example/api/v2/founder/cases/'+cid+'/workspace'))).status,400);
 assert.equal((await t.handler(t.req(cookie,t.url('not-a-uuid')))).status,404);
 assert.equal((await t.handler(t.req(cookie,t.url(otherCid)))).status,404);
});
test('DB exception is not leaked and malformed RPC workspace fails closed',async()=>{
 const t=harness(),cookie=await t.login();
 t.setDbBreak(true);
 const x=await t.handler(t.req(cookie));
 // session revalidation queries fail before workspace access
 assert.equal(x.status,401);
 assert.ok(!JSON.stringify(x).includes('private db failure'));
 t.setDbBreak(false);
 t.cases.set('ats-tenant-01/'+cid,{case_id:cid,unexpected:'private'});
 const y=await t.handler(t.req(cookie));
 assert.equal(y.status,503);
});
test('unapproved staff subject cannot issue a server session',async()=>{
 const t=harness(),unknown={verified:true,id:'not-approved',tenantId:'ats-tenant-01',
   role:'founder',issuer,subject:'unknown'};
 await assert.rejects(issueStaffSession({principal:unknown,store:t.sessionStore}));
 assert.equal(t.sessions.size,0);
});
