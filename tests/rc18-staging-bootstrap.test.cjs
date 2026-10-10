'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createStagingCandidateRc18,checkPrivateDatabaseRc18,StageNotReady}=
 require('../server/access-v2/staging-bootstrap-rc18.cjs');
const {issueStaffSession}=require('../server/access-v2/session.cjs');
const {createPgStaffStore}=require('../server/access-v2/pg-staff-store-rc8.cjs');
const host='https://staging.atstudioimpact.com';
const config=()=>({
 zohoIssuer:'https://accounts.zoho.com',
 zohoClientId:'RC18_SAFE_FAKE_CLIENT_ID',
 zohoClientSecret:'RC18_SYNTHETIC_SECRET_NEVER_DEPLOY',
 zohoCallback:host+'/api/v2/auth/zoho/callback',
 oidcKeyBase64Url:crypto.randomBytes(32).toString('base64url')
});
const approved=()=>({
 secretRotatedVerified:true,callbackRegisteredVerified:true,
 trustedTlsVerified:true,founderIdentityVerified:true,
 scopedIndexRpcVerified:true
});
const databaseRow=()=>({
 private_index_exists:true,private_index_service_exec:true,
 private_index_anon_exec:false,private_index_authenticated_exec:false,
 workspace_service_exec:true,workspace_anon_exec:false,
 workspace_authenticated_exec:false,founder_exists:true
});
const token=()=>crypto.randomBytes(32).toString('base64url');
const provider={
 discovery:async()=>({
  serverMetadata:()=>({
   issuer:'https://accounts.zoho.com',
   authorization_endpoint:'https://accounts.zoho.com/oauth/v2/auth',
   token_endpoint:'https://accounts.zoho.com/oauth/v2/token',
   jwks_uri:'https://accounts.zoho.com/oauth/v2/keys'
  })
 }),
 ClientSecretPost:()=>({}),
 randomPKCECodeVerifier:token,
 calculatePKCECodeChallenge:async()=>token(),
 buildAuthorizationUrl:(_cfg,p)=>new URL('https://accounts.zoho.com/oauth/v2/auth?'+new URLSearchParams(p)),
 authorizationCodeGrant:async(_cfg,_url,checks)=>({claims:()=>({
  iss:'https://accounts.zoho.com',aud:'RC18_SAFE_FAKE_CLIENT_ID',
  sub:'synthetic-founder-sub',nonce:checks.expectedNonce
 })})
};
function fixture(rows=databaseRow()){
 const sql=[],sessions=new Map(),pending=new Map(),assets=[];
 const founder={id:'rc18-founder',tenant_id:'rc18-tenant',
  role:'founder',issuer:'https://accounts.zoho.com',
  subject:'synthetic-founder-sub',active:true};
 const pool={async query(statement,args=[]){
  sql.push({statement,args});
  if(statement.includes('WITH f AS (SELECT to_regprocedure'))return {rows:[rows]};
  if(statement.startsWith('SELECT id,tenant_id,role,issuer,subject,active FROM ats_access_v2.staff'))
   return {rows:founder.active&&args[0]===founder.issuer&&args[1]===founder.subject?[{...founder}]:[]};
  if(statement.startsWith('INSERT INTO ats_access_v2.sessions')){
   if(args[1]!==founder.id||args[2]!==founder.tenant_id||!founder.active)return {rows:[],rowCount:0};
   sessions.set(args[0],{staff_id:args[1],tenant_id:args[2],role:args[3],
    issuer:args[4],subject:args[5],issued_at:new Date(args[6]),
    expires_at:new Date(args[7])});
   return {rowCount:1,rows:[{token_hash:args[0]}]};
  }
  if(statement.startsWith('SELECT staff_id,tenant_id,role,issuer,subject,issued_at,expires_at')){
   const row=sessions.get(args[0]);
   return {rows:row?[row]:[]};
  }
  if(statement.startsWith('DELETE FROM ats_access_v2.sessions')){
   sessions.delete(args[0]);return {rowCount:1,rows:[]};
  }
  if(statement.startsWith('INSERT INTO ats_access_v2.oidc_pending')){
   pending.set(args[0],{verifier:args[1],nonce:args[2],browser_binding_hash:args[3],
    issuer:args[4],client_id:args[5],callback_url:args[6],
    expires_at:new Date(Date.now()+200000)});
   return {rowCount:1,rows:[]};
  }
  if(statement.startsWith('DELETE FROM ats_access_v2.oidc_pending')){
   const row=pending.get(args[0]);pending.delete(args[0]);
   return {rows:row?[row]:[]};
  }
  if(statement.includes('ats_core.ats_list_scoped_case_index_v1')){
   return {rows:args[0]==='rc18-tenant'?[
    {case_id:'83b5d6ae-73c4-42de-9f78-78c2c5100001',
     cursor_updated:'2026-10-10T12:00:00.000001Z',analysis_state:'collecting',
     label:'Fictional only',service:'Digital',project_goal:'Understand client'}
   ]:[]};
  }
  throw new Error('PRIVATE SQL DB ERROR should never escape response');
 }};
 const readAsset=async file=>{assets.push(file);return 'READ_ONLY_MOCK_ASSET:'+file};
 return {pool,sql,sessions,pending,assets,founder,readAsset};
}
async function boot(f,overrides={}){
 return createStagingCandidateRc18({
  configuration:config(),approval:approved(),
  pool:f.pool,openidClient:provider,readAsset:f.readAsset,...overrides
 });
}
const expectDenied=async promise=>{
 try{await promise;assert.fail('must have rejected stage startup')}
 catch(e){assert.ok(e instanceof StageNotReady,e?.message);assert.equal(e.message,'ATS Staging candidate cannot initialize');}
};
test('RC18 requires explicit release prerequisites and rejects absent config before provider calls',async()=>{
 const f=fixture();
 await expectDenied(createStagingCandidateRc18({}));
 await expectDenied(boot(f,{approval:{...approved(),trustedTlsVerified:false}}));
 await expectDenied(boot(f,{approval:{...approved(),secretRotatedVerified:false}}));
 assert.equal(f.sql.length,0,'no connection touched with invalid gates');
});
test('RC18 refuses an incorrect callback, issuer, encryption key, fake OIDC module',async()=>{
 const f=fixture();
 await expectDenied(boot(f,{configuration:{...config(),zohoCallback:'https://atstudioimpact.com/callback'}}));
 await expectDenied(boot(f,{configuration:{...config(),zohoIssuer:'https://evil.invalid'}}));
 await expectDenied(boot(f,{configuration:{...config(),oidcKeyBase64Url:'fake-key'}}));
 await expectDenied(boot(f,{openidClient:{discovery:async()=>{throw Error('MYSECRET')}}}));
});
test('RC18 fails when any private index grant, denied public role, Founder scope or RPC is absent',async()=>{
 for(const [key,value] of [
  ['private_index_exists',false],['private_index_service_exec',false],
  ['private_index_anon_exec',true],['private_index_authenticated_exec',true],
  ['workspace_service_exec',false],['workspace_anon_exec',true],
  ['founder_exists',false]
 ]){
  const f=fixture({...databaseRow(),[key]:value});
  await expectDenied(boot(f));
  assert.equal(f.sql.length,1,key);
  assert.match(f.sql[0].statement,/to_regprocedure/);
  assert.match(f.sql[0].statement,/ats_access_v2.staff/);
  assert.deepEqual(f.sql[0].args,['https://accounts.zoho.com']);
 }
});
test('RC18 refuses database transport failure and never exposes error or credentials',async()=>{
 const f=fixture();
 f.pool.query=async()=>{throw Error('PRIVATE_DB_PASSWORD_RC18')};
 await expectDenied(boot(f));
});
test('RC18 controlled synthetic provider initialization produces ingress without secrets',async()=>{
 const f=fixture();const r=await boot(f);
 assert.equal(r.release,'RC18');
 assert.equal(r.target,'trusted_staging_only');
 assert.equal(r.productionEnabled,false);
 assert.equal(r.aiGenerationEnabled,false);
 const exposed=JSON.stringify(r);
 assert.doesNotMatch(exposed,/SYNTHETIC_SECRET|CLIENT_ID|oidcKey|DATABASE_URL/);
 assert.equal(Object.keys(r).includes('handle'),true);
 assert.equal((await r.handle({requestTarget:'/control-v2/clients',method:'GET',headers:{}})).status,401);
 assert.equal((await r.handle({requestTarget:'/api/v2/founder/cases',method:'GET',headers:{}})).status,401);
 assert.equal(f.assets.length,0);
});
test('RC18 composes real session / Founder case list and preserves server AI default deny',async()=>{
 const f=fixture(),app=await boot(f);
 const store=createPgStaffStore({pool:f.pool});
 const principal={verified:true,id:f.founder.id,tenantId:f.founder.tenant_id,
  role:f.founder.role,issuer:f.founder.issuer,subject:f.founder.subject};
 const cookie=(await issueStaffSession({principal,store})).setCookie.split(';')[0];
 const req=(target,method='GET',headers={})=>app.handle({
  requestTarget:target,method,headers:{cookie,...headers}
 });
 const home=await req('/control-v2/clients');
 assert.equal(home.status,200);
 assert.match(home.body,/READ_ONLY_MOCK_ASSET/);
 const list=await req('/api/v2/founder/cases');
 assert.equal(list.status,200);assert.equal(list.body.cases.length,1);
 assert.equal(list.body.cases[0].label,'Fictional only');
 const ai=await req('/api/v2/founder/cases/83b5d6ae-73c4-42de-9f78-78c2c5100001/ai/diagnosis','POST',{origin:host});
 assert.equal(ai.status,423);assert.equal(ai.body.error,'ai_paused_release_a');
 const leaks=JSON.stringify([home,list,ai]);
 assert.doesNotMatch(leaks,/SYNTHETIC_SECRET|PRIVATE_DB_PASSWORD|RC18_SAFE_FAKE_CLIENT_ID/);
});
test('RC18 provider discovery mismatch fails closed, without fallback to untrusted origin',async()=>{
 const f=fixture();
 const swapped={...provider,discovery:async()=>({serverMetadata:()=>({
  issuer:'https://evil.invalid',
  authorization_endpoint:'https://evil.invalid/auth',
  token_endpoint:'https://evil.invalid/token',
  jwks_uri:'https://evil.invalid/key'
 })})};
 await expectDenied(boot(f,{openidClient:swapped}));
 assert.equal(f.sql.length,1,'private database check occurs before provider discovery');
});
