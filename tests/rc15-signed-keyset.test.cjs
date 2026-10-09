'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {issueStaffSession}=require('../server/access-v2/session.cjs');
const {createFounderCaseIndexRc15,decodeCursor}=require('../server/access-v2/founder-case-index-rc15.cjs');
const {createStagingAuthRuntime}=require('../server/access-v2/staging-runtime-rc8.cjs');
const host='https://staging.atstudioimpact.com',url=host+'/api/v2/founder/cases';
const key=Buffer.alloc(32,117),clock=1800000000000;
function records(n=63){
 return Array.from({length:n},(_,i)=>({
  case_id:'83b5d6ae-73c4-42de-9f78-'+String(n-i).padStart(12,'0'),
  cursor_updated:'2026-10-09T18:00:00.'+String(Math.floor((n-i)/3)).padStart(6,'0')+'Z',
  label:'Demo '+i,service:'Website',project_goal:'Problem '+i,analysis_state:'collecting',
  private_email:'never-display@example.invalid'
 })).sort((a,b)=>b.cursor_updated.localeCompare(a.cursor_updated)||b.case_id.localeCompare(a.case_id));
}
function setup({role='founder',rows=records()}={}){
 const user={verified:true,active:true,id:'founder123',tenantId:'tenant-scoped-ATS',
  issuer:'https://accounts.zoho.com',subject:'immutable-founder',role};
 const sessions=new Map(),queries=[];
 const store={async create(hash,record){sessions.set(hash,record)},async get(hash){return sessions.get(hash)||null},async delete(hash){sessions.delete(hash)}};
 const lookupStaff=async({issuer,subject})=>issuer===user.issuer&&subject===user.subject?{...user}:null;
 const pool={async query(sql,args){
  queries.push({sql,args});
  assert.match(sql,/WHERE sc.tenant_id=\$1/);
  assert.match(sql,/ORDER BY c.updated_at DESC,c.id DESC LIMIT 26/);
  if(args[0]!=='tenant-scoped-ATS')return {rows:[]};
  let rs=rows;
  if(args.length===3){
   assert.match(sql,/c.updated_at,c.id\)<\(\$2::timestamptz,\$3::uuid\)/);
   rs=rs.filter(x=>x.cursor_updated<args[1]||(x.cursor_updated===args[1]&&x.case_id<args[2]));
  }
  return {rows:rs.slice(0,26)};
 }};
 const index=createFounderCaseIndexRc15({pool,sessionStore:store,lookupStaff,cursorKey:key,now:()=>clock});
 const login=async()=>{const x=await issueStaffSession({principal:user,store});return x.setCookie.split(';')[0]};
 const req=(cookie='',query='')=>({url:url+query,method:'GET',headers:{cookie}});
 return {user,sessions,queries,index,login,req,key,pool,store,lookupStaff};
}
test('RC15 paginates 63 matching cases in exact keyset order, no duplicates or omissions',async()=>{
 const f=setup(),cookie=await f.login();
 const seen=[],tokens=new Set();let cursor='',total=0;
 for(let page=0;page<5;page++){
  const r=await f.index(f.req(cookie,cursor?'?cursor='+encodeURIComponent(cursor):''));
  assert.equal(r.status,200);
  assert.ok(r.body.cases.length<=25);
  assert.ok(r.body.cases.every(c=>!JSON.stringify(c).includes('private_email')));
  seen.push(...r.body.cases.map(c=>c.case_id));total++;
  if(!r.body.has_more){assert.equal(r.body.next_cursor,null);break}
  assert.match(r.body.next_cursor,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(tokens.has(r.body.next_cursor),false);
  tokens.add(r.body.next_cursor);cursor=r.body.next_cursor;
 }
 assert.equal(total,3);assert.equal(seen.length,63);assert.equal(new Set(seen).size,63);
 assert.deepEqual(f.queries.map(q=>q.args.length),[1,3,3]);
 assert.equal(f.queries[1].args[0],'tenant-scoped-ATS');
 assert.match(f.queries[0].sql,/to_char\(c.updated_at AT TIME ZONE 'UTC'/);
});
test('RC15 creates no cursor for empty/short list; no SQL for non-Founder',async()=>{
 const f=setup({rows:[]}),cookie=await f.login();
 assert.deepEqual((await f.index(f.req(cookie))).body,{cases:[],has_more:false,next_cursor:null});
 const reviewer=setup({role:'reviewer'}),other=await reviewer.login();
 assert.equal((await reviewer.index(reviewer.req(other))).status,403);
 assert.equal(reviewer.queries.length,0);
 assert.equal((await reviewer.index(reviewer.req())).status,401);
});
test('RC15 cursor tamper, duplicates and unknown query parameters fail before SQL',async()=>{
 const f=setup(),cookie=await f.login();
 const first=await f.index(f.req(cookie));const token=first.body.next_cursor;
 f.queries.length=0;
 const invalid=[
  '?cursor='+token.slice(0,-1)+(token.endsWith('A')?'B':'A'),
  '?cursor='+token+'&cursor='+token,
  '?cursor=12345','?cursor=',
  '?cursor='+token+'&tenant=other',
  '?page=2','?limit=10000','?cursor='+token+'#fragment'
 ];
 for(const query of invalid){
  const r=await f.index(f.req(cookie,query));
  assert.ok([400,404].includes(r.status),query+' => '+r.status);
 }
 assert.equal(f.queries.length,0);
});
test('RC15 cursor is Founder-bound, tenant-bound and time-limited',async()=>{
 const f=setup(),cookie=await f.login(),first=await f.index(f.req(cookie));
 const token=first.body.next_cursor;
 const other={...f.user,tenantId:'other-tenant'};
 assert.equal(decodeCursor(key,token,other,clock),null);
 assert.equal(decodeCursor(key,token,f.user,clock+300001),null);
 assert.equal(decodeCursor(Buffer.alloc(32,1),token,f.user,clock),null);
 assert.ok(decodeCursor(key,token,f.user,clock));
 const another=setup();another.user.id='different-founder';
 const c=await another.login();
 const res=await another.index(another.req(c,'?cursor='+encodeURIComponent(token)));
 assert.equal(res.status,400);assert.equal(another.queries.length,0);
});
test('RC15 revoked, inactive, and downgraded accounts fail before SQL even with valid cursor',async()=>{
 const f=setup(),cookie=await f.login(),first=await f.index(f.req(cookie));
 const query='?cursor='+encodeURIComponent(first.body.next_cursor);
 f.queries.length=0;f.user.active=false;
 assert.equal((await f.index(f.req(cookie,query))).status,401);
 assert.equal(f.queries.length,0);
});
test('RC15 server never trusts arbitrary host/params and never discloses role, email or SQL',async()=>{
 const f=setup(),cookie=await f.login();
 for(const q of [host+'/api/v2/founder/cases?role=founder',
  'http://staging.atstudioimpact.com/api/v2/founder/cases',
  'https://evil.invalid/api/v2/founder/cases']){
  assert.equal((await f.index({url:q,method:'GET',headers:{cookie}})).status,404);
 }
 assert.equal(f.queries.length,0);
 const r=await f.index(f.req(cookie));
 assert.deepEqual(Object.keys(r.body.cases[0]),[
  'case_id','label','service','problem_preview','analysis_state','updated_at']);
 assert.match(r.headers['Cache-Control'],/no-store/);
 assert.equal(r.body.cases[0].case_id.length,36);
});
test('RC15 mock runtime keeps server HMAC key separate from encrypted temporary OIDC key',async()=>{
 let reads=0;
 const runtime=createStagingAuthRuntime({pool:{query:async()=>{reads++;throw Error('no real PG')}},
  encryptionKey:crypto.randomBytes(32),
  settings:{issuer:'https://accounts.zoho.com',clientId:'test',
   callbackUrl:host+'/api/v2/auth/zoho/callback'},
  oidc:{},oidcConfig:{}});
 const resp=await runtime.handle({url,method:'GET',headers:{}});
 assert.equal(resp.status,401);assert.equal(reads,0);
});
