'use strict';

/**
 * ATS Intelligence — RC8 Founder passive workspace GET, STAGING ONLY.
 * No listener/route registration, no implicit login, no AI, no writes.
 *
 * IMPORTANT: HTTP ingress MUST pass a trusted absolute URL built from a fixed
 * HTTPS staging origin (never from untrusted Host or X-Forwarded-* headers).
 * The DB connection must be server-only and authorized to EXECUTE just the
 * private scoped read RPC. No service-role key is exposed in the browser.
 */
const {authenticateStaffSession,SessionDenied}=require('./session.cjs');
const {can}=require('./authorize.cjs');

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASE_URL=/^\/api\/v2\/founder\/cases\/([0-9a-f-]{36})\/workspace$/i;
const DEFAULT_ORIGIN='https://staging.atstudioimpact.com';
function headers(){return Object.freeze({
  'Cache-Control':'no-store, max-age=0','Pragma':'no-cache',
  'Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
});}
function response(status,body){return Object.freeze({status,headers:headers(),body});}
function bodyError(status){
 const code=({400:'invalid_request',401:'unauthenticated',403:'forbidden',
   404:'not_found',405:'method_not_allowed',503:'temporarily_unavailable'})[status]||'temporarily_unavailable';
 return response(status,{error:code});
}
function trimmed(value,max=1800){
 return typeof value==='string'?value.slice(0,max):null;
}
function count(value){return Number.isSafeInteger(value)&&value>=0?value:0}
function safeWorkspace(w,id){
 if(!w||typeof w!=='object'||Array.isArray(w)||
   typeof w.case_id!=='string'||w.case_id.toLowerCase()!==id.toLowerCase())return null;
 const next=w.next_action;
 if(!next || typeof next!=='object' || typeof next.kind!=='string')return null;
 const intake=w.intake_brief||{},known=w.known||{};
 return {
   case_id:w.case_id,
   input_version:Number.isSafeInteger(w.input_version)?w.input_version:null,
   analysis_state:trimmed(w.analysis_state,60),
   intake_brief:{
     service:trimmed(intake.service,160),
     project_goal:trimmed(intake.project_goal,1800),
     current_assets:Array.isArray(intake.current_assets)?intake.current_assets.slice(0,30).map(x=>trimmed(x,300)).filter(x=>x!==null):[],
     timeline:trimmed(intake.timeline,160),
     source:'unconfirmed_client_intake'
   },
   known:{
     current_state:trimmed(known.current_state),
     impact:trimmed(known.impact),
     desired_outcome:trimmed(known.desired_outcome),
     evidence:trimmed(known.evidence)
   },
   missing_fields:Array.isArray(w.missing_fields)?
     w.missing_fields.filter(x=>['current_state','desired_outcome','evidence'].includes(x)):[],
   supporting_upload_count:count(w.supporting_upload_count),
   next_action:{
     kind:trimmed(next.kind,50),
     text:trimmed(next.text,400),
     task_hint:trimmed(next.task_hint,160)
   },
   review_pending_count:count(w.review_pending_count),
   active_work_count:count(w.active_work_count)
 };
}
function createFounderWorkspaceRead({pool,sessionStore,lookupStaff,origin=DEFAULT_ORIGIN}){
 if(!pool||typeof pool.query!=='function'||!sessionStore||
    typeof lookupStaff!=='function'||origin!==DEFAULT_ORIGIN)
   throw new Error('Invalid private staging workspace wiring');
 return async function readWorkspace(req){
   if(!req||req.method!=='GET'){
     if(req?.method && req.method!=='GET')return bodyError(405);
     return bodyError(400);
   }
   let parsed;
   try{parsed=new URL(req.url)}catch{return bodyError(400)}
   if(parsed.origin!==origin || parsed.protocol!=='https:'||parsed.username||
      parsed.password||parsed.hash||parsed.search)return bodyError(400);
   const match=CASE_URL.exec(parsed.pathname);
   if(!match || !UUID.test(match[1]))return bodyError(404);
   const caseId=match[1];
   let principal;
   try{
     principal=await authenticateStaffSession({
       cookieHeader:req.headers?.cookie||'',store:sessionStore,lookupStaff
     });
   }catch{return bodyError(401);}
   if(!principal||principal.role!=='founder'||
      !can(principal,'case:read',{kind:'case',id:caseId,tenantId:principal.tenantId}))
     return bodyError(403);
   // The SECURITY DEFINER RPC enforces its own tenant/case mapping.
   // $2 is ONLY sourced from the verified, server-side session.
   try{
     const r=await pool.query(
       'SELECT ats_core.ats_read_scoped_workspace_v1($1::uuid,$2::text) AS workspace',
       [caseId,principal.tenantId]);
     const raw=r?.rows?.[0]?.workspace;
     if(raw==null)return bodyError(404);
     const safe=safeWorkspace(raw,caseId);
     if(!safe)return bodyError(503);
     return response(200,safe);
   }catch{return bodyError(503);}
 };
}
module.exports={createFounderWorkspaceRead};
