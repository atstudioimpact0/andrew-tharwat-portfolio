'use strict';
/**
 * RC8 staging runtime acceptance-contract tests.
 * Node-only, 100% synthetic PG/OIDC; no network, no real user, no paid AI.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createStagingAuthRuntime}=require('../server/access-v2/staging-runtime-rc8.cjs');
const host='https://staging.atstudioimpact.com';
const provider='https://accounts.zoho.com';
const callbackUrl=host+'/api/v2/auth/zoho/callback';
const caseId='c03bf916-c954-4766-8735-311df2210001';
const settings={issuer:provider,callbackUrl,clientId:'synthetic-client-1000'};
const token=()=>crypto.randomBytes(32).toString('base64url');

function createFixture(){
 const pending=new Map(),sessions=new Map(),queries=[];
 const staff={id:'founder-test-rc8',tenant_id:'ats-tenant-01',role:'founder',
   issuer:provider,subject:'zoho-subject-verified',active:true};
 const data={
   case_id:caseId,input_version:1,analysis_state:'collecting',
   intake_brief:{source:'unconfirmed_client_intake',service:'Design',project_goal:'Need help',
     current_assets:['brief'],timeline:'soon'},
   known:{current_state:'Unclear flow',impact:'delays',desired_outcome:'single next action',evidence:null},
   missing_fields:['evidence'],supporting_upload_count:0,
   next_action:{kind:'collect_evidence',text:'Ask for evidence',task_hint:null},
   review_pending_count:0,active_work_count:0,private_internal_column:'not-for-browser'
 };
 const pool={async query(sql,values){
   queries.push({sql,values});
   if(sql.startsWith('INSERT INTO ats_access_v2.oidc_pending')){
     const row={verifier:values[1],nonce:values[2],browser_binding_hash:values[3],issuer:values[4],
       client_id:values[5],callback_url:values[6],expires_at:new Date(Date.now()+290000)};
     pending.set(values[0],row);return {rowCount:1,rows:[]};
   }
   if(sql.startsWith('DELETE FROM ats_access_v2.oidc_pending')){
     const row=pending.get(values[0]);pending.delete(values[0]);
     return {rows:row?[row]:[],rowCount:row?1:0};
   }
   if(sql.startsWith('SELECT id,tenant_id,role,issuer,subject,active FROM ats_access_v2.staff')){
     return {rows:(values[0]===staff.issuer&&values[1]===staff.subject)?[{...staff}]:[]};
   }
   if(sql.startsWith('INSERT INTO ats_access_v2.sessions')){
     if(!staff.active||values[1]!==staff.id||values[2]!==staff.tenant_id||values[3]!==staff.role)return {rowCount:0,rows:[]};
     sessions.set(values[0],{staff_id:staff.id,tenant_id:staff.tenant_id,role:staff.role,
       issuer:staff.issuer,subject:staff.subject,issued_at:new Date(values[6]),expires_at:new Date(values[7])});
     return {rowCount:1,rows:[{token_hash:values[0]}]};
   }
   if(sql.startsWith('SELECT staff_id,tenant_id,role,issuer,subject,issued_at,expires_at')){
     const row=sessions.get(values[0]);
     return {rows:row?[{...row}]:[]};
   }
   if(sql.startsWith('DELETE FROM ats_access_v2.sessions')){
     sessions.delete(values[0]);return {rowCount:1,rows:[]};
   }
   if(sql.includes('ats_core.ats_read_scoped_workspace_v1')){
     return {rows:[{workspace:values[0]===caseId&&values[1]==='ats-tenant-01'?data:null}]};
   }
   throw new Error('Unsupported synthetic SQL');
 }};
 const oidc={
   randomPKCECodeVerifier:token,
   calculatePKCECodeChallenge:async()=>'pkce-'+token(),
   buildAuthorizationUrl:(_cfg,p)=>new URL(provider+'/oauth/v2/auth?'+new URLSearchParams({...p,response_type:'code'})),
   authorizationCodeGrant:async(_cfg,_url,p)=>({claims:()=>({
     iss:provider,aud:settings.clientId,sub:staff.subject,nonce:p.expectedNonce
   })})
 };
 const runtime=createStagingAuthRuntime({
   pool,encryptionKey:crypto.randomBytes(32),settings,oidc,oidcConfig:{verifiedMetadata:true}
 });
 const req=(path,method='GET',headers={})=>({
    method,url:host+path,headers
 });
 async function auth(){
   const start=await runtime.handle(req('/api/v2/auth/zoho/start'));
   assert.equal(start.status,302);
   const state=new URL(start.headers.Location).searchParams.get('state');
   const browserCookie=start.headers['Set-Cookie'][0].split(';')[0];
   const cb=await runtime.handle(req('/api/v2/auth/zoho/callback?code=synthetic&state='+state,'GET',{cookie:browserCookie}));
   assert.equal(cb.status,302);
   return {state,browserCookie,session:cb.headers['Set-Cookie'][0].split(';')[0],cb};
 }
 return {runtime,req,auth,pool,staff,pending,sessions,queries};
}
test('RC8 all components: start, callback, encrypted PG state, approved Founder, scoped GET, logout',async()=>{
 const f=createFixture();
 const a=await f.auth();
 const p=f.queries.find(x=>x.sql.startsWith('INSERT INTO ats_access_v2.oidc_pending'));
 assert.ok(p && p.values[1].startsWith('v1.') && p.values[2].startsWith('v1.'));
 assert.equal(f.pending.size,0);
 assert.equal(f.sessions.size,1);
 const r=await f.runtime.handle(f.req('/api/v2/founder/cases/'+caseId+'/workspace','GET',{cookie:a.session}));
 assert.equal(r.status,200);
 assert.equal(r.body.next_action.kind,'collect_evidence');
 assert.equal(r.body.known.current_state,'Unclear flow');
 assert.ok(!JSON.stringify(r.body).includes('not-for-browser'));
 assert.deepEqual(f.queries.at(-1).values,[caseId,'ats-tenant-01']);
 const out=await f.runtime.handle(f.req('/api/v2/auth/logout','POST',{cookie:a.session,origin:host}));
 assert.equal(out.status,204);assert.equal(f.sessions.size,0);
 assert.equal((await f.runtime.handle(f.req('/api/v2/founder/cases/'+caseId+'/workspace','GET',{cookie:a.session}))).status,401);
});
test('RFC anti-replay: callback cannot be used twice, no duplicate session',async()=>{
 const f=createFixture();
 const a=await f.auth();
 assert.equal((await f.runtime.handle(f.req('/api/v2/auth/zoho/callback?code=x&state='+a.state,'GET',{cookie:a.browserCookie}))).status,401);
 assert.equal(f.sessions.size,1);
});
test('RC8 unapproved and disabled staff never receive or keep privileges',async()=>{
 const f=createFixture();
 const a=await f.auth();
 f.staff.active=false;
 assert.equal((await f.runtime.handle(f.req('/api/v2/founder/cases/'+caseId+'/workspace','GET',{cookie:a.session}))).status,401);
 assert.equal(f.sessions.size,0);
});
test('RC8 forbids cross-site logout, public role spoofing and diagnostic auto invoke',async()=>{
 const f=createFixture();
 const a=await f.auth();
 assert.equal((await f.runtime.handle(f.req('/api/v2/auth/logout','POST',{cookie:a.session,origin:'https://evil.invalid'}))).status,403);
 assert.equal(f.sessions.size,1);
 assert.equal((await f.runtime.handle(f.req('/api/v2/founder/cases/'+caseId+'/workspace','GET',{role:'founder',tenantId:'ats-tenant-01'}))).status,401);
 assert.equal((await f.runtime.handle(f.req('/api/v2/diagnostic/start','POST',{cookie:a.session,origin:host}))).status,404);
 assert.equal((await f.runtime.handle({method:'GET',url:'https://atstudioimpact.com/api/v2/auth/zoho/start',headers:{}})).status,404);
});
test('RC8 refuses other callback domain and missing critical configuration at construction',()=>{
 const key=crypto.randomBytes(32), pool={query:async()=>({rows:[]})};
 const oidc={},cfg={};
 assert.throws(()=>createStagingAuthRuntime({pool,encryptionKey:key,
   settings:{...settings,callbackUrl:'https://atstudioimpact.com/api/v2/auth/zoho/callback'},
   oidc,oidcConfig:cfg}));
 assert.throws(()=>createStagingAuthRuntime({pool,encryptionKey:Buffer.alloc(0),settings,oidc,oidcConfig:cfg}));
});
