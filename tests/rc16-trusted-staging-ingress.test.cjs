'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const http=require('node:http');
const {once}=require('node:events');
const {createTrustedIngressRc16,rawTarget}=require('../server/access-v2/staging-ingress-rc16.cjs');
const {createStagingAuthRuntime}=require('../server/access-v2/staging-runtime-rc8.cjs');
const {createPgStaffStore}=require('../server/access-v2/pg-staff-store-rc8.cjs');
const {issueStaffSession}=require('../server/access-v2/session.cjs');
const origin='https://staging.atstudioimpact.com';
const caseId='83b5d6ae-73c4-42de-9f78-78c2c5100001';
const another='83b5d6ae-73c4-42de-9f78-78c2c5100002';
function harness(){
 const staff={id:'rc16-founder',tenantId:'rc16-private-tenant',role:'founder',
  issuer:'https://accounts.zoho.com',subject:'immutable-rc16-founder',active:true,verified:true};
 const sessions=new Map(),sqlLog=[],assets=[];
 const pool={async query(sql,args=[]){
  sqlLog.push({sql,args});
  if(sql.startsWith('SELECT id,tenant_id,role,issuer,subject,active FROM ats_access_v2.staff ')){
   return {rows:[{id:staff.id,tenant_id:staff.tenantId,role:staff.role,
     issuer:staff.issuer,subject:staff.subject,active:staff.active}]};
  }
  if(sql.startsWith('INSERT INTO ats_access_v2.sessions ')){
   const [hash,identity,tenant,role,iss,subject,issued,expiry]=args;
   if(!staff.active||staff.id!==identity||staff.tenantId!==tenant||staff.role!==role||
      staff.issuer!==iss||staff.subject!==subject)return {rowCount:0,rows:[]};
   sessions.set(hash,{staff_id:identity,tenant_id:tenant,role,issuer:iss,
    subject,issued_at:issued,expires_at:expiry});
   return {rowCount:1,rows:[{token_hash:hash}]};
  }
  if(sql.startsWith('SELECT staff_id,tenant_id,role,issuer,subject,issued_at,expires_at')){
   return {rows:sessions.has(args[0])?[sessions.get(args[0])]:[]};
  }
  if(sql.startsWith('DELETE FROM ats_access_v2.sessions')){
   sessions.delete(args[0]);return {rowCount:1,rows:[]};
  }
  if(sql.includes('ats_core.ats_read_scoped_workspace_v1')){
   assert.equal(args[1],staff.tenantId);
   return {rows:[{workspace:args[0]===caseId?{
    case_id:caseId,input_version:1,analysis_state:'collecting',
    intake_brief:{service:'Digital',project_goal:'A fictional case need',source:'unconfirmed_client_intake'},
    known:{current_state:'inquiry not followed',impact:null,desired_outcome:null,evidence:null},
    missing_fields:['evidence'],supporting_upload_count:0,
    next_action:{kind:'collect_evidence',text:'Ask for a sample'},
    review_pending_count:0,active_work_count:0
   }:null}]};
  }
  if(sql.includes('FROM ats_core.studio_case_tenant_scope sc')){
   assert.equal(args[0],staff.tenantId);
   return {rows:[{case_id:caseId,cursor_updated:'2026-10-10T08:01:07.000001Z',
    label:'FAKE Demo Client',service:'Digital',project_goal:'Clarify request',analysis_state:'collecting'}]};
  }
  throw Error('Unrecognized SQL in RC16 mock');
 }};
 const store=createPgStaffStore({pool});
 const runtime=createStagingAuthRuntime({pool,encryptionKey:crypto.randomBytes(32),
  settings:{issuer:staff.issuer,clientId:'test-client',callbackUrl:origin+'/api/v2/auth/zoho/callback'},
  oidc:{},oidcConfig:{}});
 const readStatic=async file=>{assets.push(file);return '<mock>'+file+'</mock>'};
 const ingress=createTrustedIngressRc16({runtime,sessionStore:store,
   lookupStaff:store.lookupStaff,readStatic});
 const login=async()=>{const r=await issueStaffSession({principal:staff,store});
  return r.setCookie.split(';')[0];};
 const req=(path, cookie='', extra={})=>({requestTarget:path,method:'GET',
   headers:{cookie,...extra}});
 return {staff,sessions,sqlLog,assets,ingress,login,req};
}
test('RC16 rejects absolute targets, //, ../, encoded traversal, query hash, malicious normalization',()=>{
 for(const path of ['https://evil.invalid/control-v2/clients','//evil.invalid',
  '/control-v2/../admin','/control-v2/%2e%2e/admin',
  '/control-v2%2Fclients','/control-v2\\clients',
  '/control-v2/clients#fragment','/control-v2/clients\r\nx:1',
  ' /control-v2/clients','']){
  assert.equal(rawTarget(path),null,String(path));
 }
 assert.equal(rawTarget('/control-v2/clients')?.href,origin+'/control-v2/clients');
 assert.equal(rawTarget('/api/v2/auth/zoho/callback?code=example%2Bstate&state=abc')?.pathname,
  '/api/v2/auth/zoho/callback');
});
test('RC16 constructor requires injected trusted assets, sessions and runtime',()=>{
 assert.throws(()=>createTrustedIngressRc16({runtime:{handle(){}}}),/unavailable/);
});
test('RC16 unauthenticated requests cannot load a protected Founder page or JS asset',async()=>{
 const t=harness();
 for(const p of ['/control-v2/','/control-v2/clients',
  '/control-v2/cases/'+caseId,'/control-v2-preview/founder-clients-rc14.js']){
  const result=await t.ingress(t.req(p));
  assert.equal(result.status,401,p);
  assert.doesNotMatch(JSON.stringify(result),/FAKE Demo Client/);
 }
 assert.equal(t.assets.length,0);
});
test('RC16 actual V2 opaque session shows Founder HTML and only allowlisted assets',async()=>{
 const t=harness(),cookie=await t.login();
 for(const [route,file] of [['/control-v2/clients','founder-clients-rc14.html'],
   ['/control-v2/cases/'+caseId,'founder-staging-rc13.html'],
   ['/control-v2-preview/founder-clients-rc14.js','founder-clients-rc14.js'],
   ['/control-v2-preview/founder-case-rc11.css','founder-case-rc11.css']]){
  const r=await t.ingress(t.req(route,cookie));
  assert.equal(r.status,200,route);
  assert.equal(r.body,'<mock>'+file+'</mock>');
  assert.match(r.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.match(r.headers['Cache-Control'],/no-store/);
  assert.equal(r.headers['X-Robots-Tag'],'noindex, nofollow');
 }
 assert.deepEqual(t.assets,['founder-clients-rc14.html','founder-staging-rc13.html',
  'founder-clients-rc14.js','founder-case-rc11.css']);
});
test('RC16 protected root redirects only after verified Founder session',async()=>{
 const t=harness(),cookie=await t.login();
 const r=await t.ingress(t.req('/control-v2/',cookie));
 assert.equal(r.status,303);assert.equal(r.headers.Location,'/control-v2/clients');
 assert.equal((await t.ingress(t.req('/control-v2/'))).status,401);
});
test('RC16 real runtime handles Founder index and server-scoped RC8 case read',async()=>{
 const t=harness(),cookie=await t.login();
 const list=await t.ingress(t.req('/api/v2/founder/cases',cookie));
 assert.equal(list.status,200);
 assert.equal(list.body.cases[0].label,'FAKE Demo Client');
 assert.equal(list.body.cases[0].case_id,caseId);
 const read=await t.ingress(t.req('/api/v2/founder/cases/'+caseId+'/workspace',cookie));
 assert.equal(read.status,200);
 assert.equal(read.body.case_id,caseId);
 assert.equal(read.body.next_action.kind,'collect_evidence');
 assert.ok(!JSON.stringify(read.body).includes('rc16-private-tenant'));
 assert.equal((await t.ingress(t.req('/api/v2/founder/cases/'+another+'/workspace',cookie))).status,404);
});
test('RC16 ignores spoofed Host/Forwarded/role/tenant and enforces session-derived tenant',async()=>{
 const t=harness(),cookie=await t.login();
 const headers={host:'evil.invalid','x-forwarded-proto':'http','x-forwarded-host':'evil.invalid',
   'x-role':'founder','x-tenant-id':'victim','authorization':'Bearer forged'};
 const r=await t.ingress(t.req('/api/v2/founder/cases',cookie,headers));
 assert.equal(r.status,200);
 const sql=t.sqlLog.find(q=>q.sql.includes('FROM ats_core.studio_case_tenant_scope sc'));
 assert.deepEqual(sql.args,['rc16-private-tenant']);
});
test('RC16 staff downgrade or offboarding removes access on the NEXT web request',async()=>{
 const t=harness(),cookie=await t.login();
 assert.equal((await t.ingress(t.req('/control-v2/clients',cookie))).status,200);
 t.staff.role='reviewer';
 assert.equal((await t.ingress(t.req('/control-v2/clients',cookie))).status,401);
 t.staff.role='founder';const second=await t.login();t.staff.active=false;
 assert.equal((await t.ingress(t.req('/control-v2/clients',second))).status,401);
});
test('RC16 rejects arbitrary filenames, missing resource, query parameters and method misuse',async()=>{
 const t=harness(),cookie=await t.login();
 for(const p of ['/control-v2-preview/package.json','/control-v2-preview/.env',
  '/control-v2-preview/founder-clients-rc14.html',
  '/control-v2/clients?tenant=other','/control-v2/cases/not-a-uuid']){
  assert.equal((await t.ingress(t.req(p,cookie))).status,404,p);
 }
 assert.equal((await t.ingress({...t.req('/control-v2/clients',cookie),method:'POST'})).status,404);
 assert.equal((await t.ingress({...t.req('/control-v2/clients',cookie),method:'DELETE'})).status,405);
 assert.equal(t.assets.length,0);
});
test('RC16 server static loader failure does not expose details',async()=>{
 const t=harness(),cookie=await t.login();
 const r=await createTrustedIngressRc16({runtime:{handle:async()=>({status:200,body:{}})},
  sessionStore:{get:()=>t.sessions,delete:()=>{}},lookupStaff:()=>null,
  readStatic:()=>{throw Error('private path /etc/secret')}})(t.req('/control-v2/clients',cookie));
 assert.equal(r.status,401);
});
test('RC16 immutable Release A server AI denial stays enforced behind ingress',async()=>{
 const t=harness(),cookie=await t.login();
 const r=await t.ingress({requestTarget:'/api/v2/founder/cases/'+caseId+'/ai/diagnosis',
   method:'POST',headers:{cookie,origin}});
 assert.equal(r.status,423);
 assert.equal(r.body.error,'ai_paused_release_a');
});
test('RC16 no-external-network local HTTP adapter checks real Cookie header and page guard',async()=>{
 const t=harness(),cookie=await t.login();
 const server=http.createServer(async(req,res)=>{
  try{
   const out=await t.ingress({requestTarget:req.url,method:req.method,headers:req.headers});
   res.writeHead(out.status,out.headers);
   res.end(typeof out.body==='string'?out.body:JSON.stringify(out.body));
  }catch{res.writeHead(500);res.end('test failed')}
 });
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 try{
  const address='http://127.0.0.1:'+server.address().port;
  const denied=await fetch(address+'/control-v2/clients');
  assert.equal(denied.status,401);
  const allowed=await fetch(address+'/control-v2/clients',{
    headers:{Cookie:cookie,Host:'evil.invalid','X-Forwarded-Proto':'https'}
  });
  assert.equal(allowed.status,200);
  assert.match(await allowed.text(),/founder-clients-rc14.html/);
  const data=await fetch(address+'/api/v2/founder/cases',{headers:{Cookie:cookie}});
  assert.equal(data.status,200);assert.equal((await data.json()).cases[0].case_id,caseId);
 }finally{
  server.close();
  await once(server,'close');
 }
});
