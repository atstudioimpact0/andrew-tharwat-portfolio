'use strict';
/**
 * RC10 pure synthetic tests — never invokes a paid provider or external URL.
 * These exercises use real V2 opaque-session code and session revocation.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {issueStaffSession,revokeStaffSession}=require('../server/access-v2/session.cjs');
const {createReleaseAAiControl,GENERATION_ENABLED_IN_RELEASE_A}=
 require('../server/access-v2/ai-control-rc10.cjs');
const {createStagingAuthRuntime}=require('../server/access-v2/staging-runtime-rc8.cjs');

const host='https://staging.atstudioimpact.com';
const caseId='a4d55e24-42ac-473b-96aa-f88de8c27001';
const all=['diagnosis','blueprint','playbook'];
function harness(role='founder'){
 const sessions=new Map();
 const staff={verified:true,active:true,id:'staff-01',role,tenantId:'ats-01',
  issuer:'https://accounts.zoho.com',subject:'staff-subject'};
 const store={
  async create(hash,record){sessions.set(hash,record)},
  async get(hash){return sessions.get(hash)||null},
  async delete(hash){sessions.delete(hash)}
 };
 const lookupStaff=async({issuer,subject})=>
  issuer===staff.issuer&&subject===staff.subject?{...staff}:null;
 const gate=createReleaseAAiControl({sessionStore:store,lookupStaff});
 const url=(kind='diagnosis')=>host+'/api/v2/founder/cases/'+caseId+'/ai/'+kind;
 const req=({kind='diagnosis',cookie='',origin=host,method='POST',urlValue,
    body,extraHeaders={}}={})=>({
    url:urlValue||url(kind),method,headers:{origin,cookie,...extraHeaders},body
 });
 const login=async()=>{const result=await issueStaffSession({principal:staff,store});
  return result.setCookie.split(';')[0]};
 return {gate,req,login,url,staff,sessions,store};
}
test('RC10 Release A server kill switch is immutable and default OFF',()=>{
 assert.equal(GENERATION_ENABLED_IN_RELEASE_A,false);
 const s=fs.readFileSync(path.join(__dirname,'../server/access-v2/ai-control-rc10.cjs'),'utf8');
 assert.doesNotMatch(s,/functions\.invoke|generateContent|fetch\(/);
});
test('Unauthenticated AI call denied before any AI provider is available',async()=>{
 const h=harness();
 for(const kind of all){
  const r=await h.gate(h.req({kind}));
  assert.equal(r.status,401);assert.equal(r.body.error,'unauthenticated');
 }
});
test('A truly verified Founder still cannot trigger any paid generator in Release A',async()=>{
 const h=harness(),cookie=await h.login();
 for(const kind of all){
  const r=await h.gate(h.req({kind,cookie,
   body:{force:true,consent:true,approved:true,manual:true,amount_usd:1000},
   extraHeaders:{'x-ai-enabled':'true','x-role':'founder','x-studio-budget':'unlimited'}}));
  assert.equal(r.status,423);assert.equal(r.body.error,'ai_paused_release_a');
  assert.equal(r.headers['Cache-Control'],'no-store, max-age=0');
 }
});
test('Studio admin, reviewer and contributor cannot impersonate Founder',async()=>{
 for(const role of ['studio_admin','reviewer','contributor']){
  const h=harness(role),cookie=await h.login();
  const r=await h.gate(h.req({cookie,extraHeaders:{role:'founder',verified:'true'}}));
  assert.equal(r.status,403);
 }
});
test('Cross-origin POST and missing origin fail even with valid Founder cookie',async()=>{
 const h=harness(),cookie=await h.login();
 for(const origin of ['https://evil.example',undefined,'https://atstudioimpact.com']){
  const r=await h.gate(h.req({cookie,origin:origin||''}));
  assert.equal(r.status,403);
 }
});
test('GET/OPTIONS/PUT never launch an AI mutation',async()=>{
 const h=harness(),cookie=await h.login();
 for(const method of ['GET','OPTIONS','PUT','DELETE']){
  const r=await h.gate(h.req({cookie,method}));
  assert.equal(r.status,405);
 }
});
test('Wrong host, query string, hash, invalid UUID, and unknown route denied',async()=>{
 const h=harness(),cookie=await h.login();
 for(const urlValue of [
  'https://atstudioimpact.com/api/v2/founder/cases/'+caseId+'/ai/diagnosis',
  h.url()+'?force=true',h.url()+'#fragment',
  host+'/api/v2/founder/cases/notuuid/ai/diagnosis',
  host+'/api/v2/founder/cases/'+caseId+'/ai/unbounded-operation'
 ]){
  const r=await h.gate(h.req({cookie,urlValue}));
  assert.equal(r.status,404);
 }
});
test('Replay of revoked cookie cannot run generator',async()=>{
 const h=harness(),cookie=await h.login();
 const gone=await revokeStaffSession({cookieHeader:cookie,store:h.store});
 assert.match(gone,/Max-Age=0/);
 assert.equal(h.sessions.size,0);
 assert.equal((await h.gate(h.req({cookie}))).status,401);
});
test('Offboarding or role downgrade is checked on each AI request',async()=>{
 const h=harness(),cookie=await h.login();
 h.staff.active=false;
 assert.equal((await h.gate(h.req({cookie}))).status,401);
 h.staff.active=true;
 const second=await h.login();h.staff.role='reviewer';
 assert.equal((await h.gate(h.req({cookie:second}))).status,401);
});
test('Forged role, email, tenant, headers, approvals, and authorization do not create a server session',async()=>{
 const h=harness();
 const r=await h.gate(h.req({
  body:{role:'founder',tenantId:'ats-01',approved:true,consent:true,email:'owner@fake.example'},
  extraHeaders:{Authorization:'Bearer fabricated', 'x-staff-role':'founder',
   'x-authorized':'true','x-portfolio-device-id':'trusted','x-portfolio-device-secret':'fake'}
 }));
 assert.equal(r.status,401);
 assert.equal(h.sessions.size,0);
});
test('Runtime RC8 dispatches AI requests through RC10 before passive case read',async()=>{
 let calls=0;
 const pool={query:async()=>{calls++;throw Error('no connection in this test')}};
 const runtime=createStagingAuthRuntime({
  pool,encryptionKey:crypto.randomBytes(32),
  settings:{issuer:'https://accounts.zoho.com',
   clientId:'test-client',callbackUrl:host+'/api/v2/auth/zoho/callback'},
  oidc:{},oidcConfig:{}
 });
 const r=await runtime.handle({
  url:host+'/api/v2/founder/cases/'+caseId+'/ai/diagnosis',
  method:'POST',headers:{origin:host,cookie:''}
 });
 assert.equal(r.status,401);
 assert.equal(calls,0);
});
test('Malformed request and missing store fail closed',async()=>{
 assert.throws(()=>createReleaseAAiControl({sessionStore:{},lookupStaff:()=>{}}));
 const h=harness();
 assert.equal((await h.gate({method:'POST',url:'not a url',headers:{origin:host}})).status,404);
});
