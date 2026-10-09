'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {issueStaffSession,revokeStaffSession}=require('../server/access-v2/session.cjs');
const {createFounderCaseIndex}=require('../server/access-v2/founder-case-index-rc14.cjs');
const {createStagingAuthRuntime}=require('../server/access-v2/staging-runtime-rc8.cjs');
const crypto=require('node:crypto');
const host='https://staging.atstudioimpact.com',endpoint=host+'/api/v2/founder/cases';
const a='83b5d6ae-73c4-42de-9f78-78c2c5100001';
const b='83b5d6ae-73c4-42de-9f78-78c2c5100002';
function fixture(role='founder'){
 const staff={id:'founder-test',tenantId:'tenant-ATST',role,subject:'zoho-sub-staging',
  issuer:'https://accounts.zoho.com',active:true,verified:true};
 const sessions=new Map(),queries=[];
 const store={
  async create(h,r){sessions.set(h,r)},
  async get(h){return sessions.get(h)||null},
  async delete(h){sessions.delete(h)}
 };
 const lookupStaff=async({issuer,subject})=>issuer===staff.issuer&&subject===staff.subject?{...staff}:null;
 let mode='normal';
 const validRow=(id,label)=>({case_id:id,updated_at:new Date('2026-10-09T18:00:00.000Z'),
  analysis_state:'collecting',label,service:'Digital',project_goal:'The client journey is unclear'});
 const pool={async query(sql,args){
  queries.push({sql,args});
  if(mode==='fail')throw Error('server private error');
  if(!sql.includes('FROM ats_core.studio_case_tenant_scope'))throw Error('unexpected SQL');
  assert.ok(sql.includes('WHERE sc.tenant_id=$1'));
  assert.ok(sql.includes('LIMIT 26'));
  const rows=mode==='empty'?[]:
    mode==='invalid'?[{...validRow(a,'Test'),case_id:'bad-uuid'}]:
    mode==='many'?Array.from({length:26},(_,i)=>validRow(
      '83b5d6ae-73c4-42de-9f78-'+String(i+1).padStart(12,'0'),'Case '+i)):
    [validRow(a,'ATS Demo'),validRow(b,'Second Demo')];
  return {rows:args[0]==='tenant-ATST'?rows:[]};
 }};
 const index=createFounderCaseIndex({pool,sessionStore:store,lookupStaff});
 const req=(cookie='',url=endpoint,method='GET',headers={})=>({url,method,headers:{cookie,...headers}});
 const login=async()=>{const x=await issueStaffSession({principal:staff,store});return x.setCookie.split(';')[0]};
 return {staff,sessions,queries,pool,store,index,req,login,setMode:v=>mode=v};
}
test('RC14 no session cannot enumerate cases; no SQL query',async()=>{
 const f=fixture();const r=await f.index(f.req());
 assert.equal(r.status,401);assert.equal(f.queries.length,0);
 assert.equal(r.body.error,'unauthenticated');
});
test('RC14 verifies Founder; reviewer, contributor and studio_admin cannot enumerate',async()=>{
 for(const role of ['reviewer','contributor','studio_admin']){
  const f=fixture(role),cookie=await f.login(),r=await f.index(f.req(cookie));
  assert.equal(r.status,403);assert.equal(f.queries.length,0);
 }
});
test('RC14 filters by tenant from VERIFIED SESSION only and projects limited client fields',async()=>{
 const f=fixture(),cookie=await f.login();
 const r=await f.index(f.req(cookie,endpoint,'GET',{role:'founder',tenantId:'evil'}));
 assert.equal(r.status,200);assert.equal(r.body.cases.length,2);
 assert.equal(f.queries.length,1);
 assert.deepEqual(f.queries[0].args,['tenant-ATST']);
 assert.ok(!f.queries[0].sql.includes('email'));
 assert.ok(!f.queries[0].sql.includes('phone'));
 assert.ok(!f.queries[0].sql.includes('internal_notes'));
 assert.equal(r.body.cases[0].label,'ATS Demo');
 assert.equal(r.body.cases[0].case_id,a);
 assert.equal(r.body.has_more,false);
 assert.deepEqual(Object.keys(r.body.cases[0]),
  ['case_id','label','service','problem_preview','analysis_state','updated_at']);
 assert.match(r.headers['Cache-Control'],/no-store/);
 assert.match(r.headers['X-Robots-Tag'],/noindex/);
});
test('RC14 has safe empty state when scope mapping has no approved cases',async()=>{
 const f=fixture(),cookie=await f.login();f.setMode('empty');
 const r=await f.index(f.req(cookie));
 assert.equal(r.status,200);assert.deepEqual(r.body,{cases:[],has_more:false});
});
test('RC14 no public filter, numeric limit, page, encoded search or other origin',async()=>{
 const f=fixture(),cookie=await f.login();
 for(const url of [endpoint+'?tenant_id=other',endpoint+'?limit=10000',
   endpoint+'?search=private',endpoint+'#fragment',
   'https://evil.invalid/api/v2/founder/cases',
   'https://atstudioimpact.com/api/v2/founder/cases']){
  assert.equal((await f.index(f.req(cookie,url))).status,404);
 }
 assert.equal(f.queries.length,0);
 assert.equal((await f.index(f.req(cookie,endpoint,'POST'))).status,405);
});
test('RC14 session revoked/offboarded/role-changed denies next read',async()=>{
 const f=fixture(),cookie=await f.login();
 await revokeStaffSession({cookieHeader:cookie,store:f.store});
 assert.equal((await f.index(f.req(cookie))).status,401);
 const cookie2=await f.login();f.staff.active=false;
 assert.equal((await f.index(f.req(cookie2))).status,401);
 f.staff.active=true;const cookie3=await f.login();f.staff.role='reviewer';
 assert.equal((await f.index(f.req(cookie3))).status,401);
 assert.equal(f.queries.length,0);
});
test('RC14 response cap and deterministic has_more',async()=>{
 const f=fixture(),cookie=await f.login();f.setMode('many');
 const r=await f.index(f.req(cookie));
 assert.equal(r.status,200);assert.equal(r.body.cases.length,25);
 assert.equal(r.body.has_more,true);
});
test('RC14 query failure and corrupt database UUID fail closed without leaking details',async()=>{
 const f=fixture(),cookie=await f.login();
 f.setMode('fail');const x=await f.index(f.req(cookie));
 assert.equal(x.status,503);assert.doesNotMatch(JSON.stringify(x),/server private error/);
 f.setMode('invalid');assert.equal((await f.index(f.req(cookie))).status,503);
});
test('RC14 runtime routes list before the single-case reader; no session no queries',async()=>{
 let calls=0;const pool={query:async()=>{calls++;throw Error('Should not query unauthorized requests')}};
 const runtime=createStagingAuthRuntime({pool,encryptionKey:crypto.randomBytes(32),
  settings:{issuer:'https://accounts.zoho.com',clientId:'synthetic',
    callbackUrl:host+'/api/v2/auth/zoho/callback'},
  oidc:{},oidcConfig:{}});
 const r=await runtime.handle({url:endpoint,method:'GET',headers:{}});
 assert.equal(r.status,401);assert.equal(calls,0);
});
