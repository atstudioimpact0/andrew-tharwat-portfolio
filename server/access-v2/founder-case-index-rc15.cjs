'use strict';
/**
 * ATS Control Room Release A RC15 — signed-keyset pagination.
 * No listener, writes, AI, production DB, or client credentials.
 * Browser parameter is a short-lived cursor; it is never authorization.
 * EVERY page re-checks the active Founder staff session and tenant.
 */
const crypto=require('node:crypto');
const {authenticateStaffSession}=require('./session.cjs');
const ORIGIN='https://staging.atstudioimpact.com';
const PATH='/api/v2/founder/cases',SIZE=25,TTL=5*60*1000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MICRO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const HEADERS=Object.freeze({'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store, max-age=0','Pragma':'no-cache',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});
const ERROR={400:'invalid_cursor',401:'unauthenticated',403:'forbidden',
 404:'not_found',405:'method_not_allowed',503:'temporarily_unavailable'};
const response=(status,body)=>Object.freeze({status,headers:HEADERS,body});
const fail=status=>response(status,{error:ERROR[status]||'temporarily_unavailable'});
function safeText(v,max){return typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):''}
function identity(p){
 if(typeof p?.tenantId!=='string'||typeof p?.id!=='string'||typeof p?.issuer!=='string'||
   typeof p?.subject!=='string')throw Error('no trusted identity');
 return crypto.createHash('sha256').update(JSON.stringify([p.tenantId,p.id,p.issuer,p.subject])).digest('hex');
}
function signature(secret,encoded){
 return crypto.createHmac('sha256',secret).update(encoded,'utf8').digest();
}
function encodeCursor(secret,principal,ts,id,now){
 if(!MICRO.test(ts)||!UUID.test(id))throw Error('invalid boundary');
 const p={v:1,x:now+TTL,s:identity(principal),t:ts,i:id.toLowerCase()};
 const encoded=Buffer.from(JSON.stringify(p),'utf8').toString('base64url');
 return encoded+'.'+signature(secret,encoded).toString('base64url');
}
function decodeCursor(secret,token,principal,now){
 if(typeof token!=='string'||token.length<40||token.length>700||
   !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))return null;
 const [encoded,mac]=token.split('.');
 let claimed;
 try{claimed=Buffer.from(mac,'base64url')}catch{return null}
 const expected=signature(secret,encoded);
 if(claimed.length!==expected.length||!crypto.timingSafeEqual(claimed,expected))return null;
 try{
  const json=Buffer.from(encoded,'base64url').toString('utf8');
  if(Buffer.from(json,'utf8').toString('base64url')!==encoded)return null;
  const data=JSON.parse(json);
  if(data?.v!==1||!Number.isSafeInteger(data.x)||data.x<now||
    data.x>now+TTL||data.s!==identity(principal)||
    !MICRO.test(data.t||'')||!Number.isFinite(Date.parse(data.t))||
    !UUID.test(data.i||''))return null;
  return {ts:data.t,id:data.i.toLowerCase()};
 }catch{return null}
}
function project(row){
 if(!row||!UUID.test(row.case_id||''))return null;
 const stamp=row.cursor_updated;
 if(!MICRO.test(stamp||'')||!Number.isFinite(Date.parse(stamp)))return null;
 return Object.freeze({
  case_id:row.case_id.toLowerCase(),
  label:safeText(row.label,120)||'Case',
  service:safeText(row.service,120),
  problem_preview:safeText(row.project_goal,180),
  analysis_state:safeText(row.analysis_state,40),
  updated_at:stamp
 });
}
function createFounderCaseIndexRc15({pool,sessionStore,lookupStaff,cursorKey,now=()=>Date.now()}){
 if(!pool||typeof pool.query!=='function'||!sessionStore||
    typeof lookupStaff!=='function'||!Buffer.isBuffer(cursorKey)||cursorKey.length!==32||
    typeof now!=='function')throw Error('RC15 trusted server dependencies unavailable');
 const secret=Buffer.from(cursorKey);
 return async function list(req){
  let url;
  try{url=new URL(req?.url)}catch{return fail(404)}
  if(url.origin!==ORIGIN||url.protocol!=='https:'||url.username||url.password||
     url.pathname!==PATH||url.hash)return fail(404);
  if(req.method!=='GET')return fail(405);
  if(url.searchParams.size>1||
    [...url.searchParams.keys()].some(k=>k!=='cursor'))return fail(404);
  if(url.search && (!url.searchParams.has('cursor')||
     url.searchParams.getAll('cursor').length!==1))return fail(400);
  let principal;
  try{
   principal=await authenticateStaffSession({
     cookieHeader:req.headers?.cookie||'',store:sessionStore,lookupStaff
   });
  }catch{return fail(401)}
  if(!principal||principal.role!=='founder')return fail(403);
  const current=now();
  if(!Number.isSafeInteger(current)||current<0)return fail(503);
  let boundary=null;
  if(url.search){
   boundary=decodeCursor(secret,url.searchParams.get('cursor'),principal,current);
   if(!boundary)return fail(400);
  }
  const sql='SELECT c.id AS case_id, '+
    "to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cursor_updated, "+
    'c.analysis_state, '+
    "COALESCE(NULLIF(btrim(l.company_name),''), NULLIF(btrim(l.full_name),''), 'Case') AS label, "+
    'l.service, l.project_goal '+
    'FROM ats_core.studio_case_tenant_scope sc '+
    'JOIN ats_core.studio_discovery_cases c ON c.id=sc.case_id '+
    'JOIN ats_core.studio_leads l ON l.id=c.lead_id '+
    'WHERE sc.tenant_id=$1 '+
    (boundary?'AND (c.updated_at,c.id)<($2::timestamptz,$3::uuid) ':'')+
    'ORDER BY c.updated_at DESC,c.id DESC LIMIT 26';
  const values=boundary?[principal.tenantId,boundary.ts,boundary.id]:[principal.tenantId];
  try{
   const result=await pool.query(sql,values);
   if(!Array.isArray(result?.rows)||result.rows.length>26)throw Error('bad pg result');
   const items=result.rows.slice(0,SIZE).map(project);
   if(items.some(x=>!x))throw Error('invalid row');
   const hasMore=result.rows.length>SIZE;
   const last=hasMore?result.rows[SIZE-1]:null;
   const next=last?encodeCursor(secret,principal,last.cursor_updated,last.case_id,current):null;
   return response(200,{cases:items,has_more:hasMore,next_cursor:next});
  }catch{return fail(503)}
 };
}
module.exports={createFounderCaseIndexRc15,encodeCursor,decodeCursor};
