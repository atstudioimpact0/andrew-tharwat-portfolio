'use strict';
/**
 * AT Studio — RC14 server-side Founder case index.
 * PRIVATE Staging V2 only; no HTTP listener/deployment.
 * Uses verified RC8 opaque staff session and server-derived tenant.
 * Returns no emails/phones/notes, no AI, no mutations; capped at 25.
 */
const {authenticateStaffSession}=require('./session.cjs');
const ORIGIN='https://staging.atstudioimpact.com';
const PATH='/api/v2/founder/cases';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX=25;
const HEADERS=Object.freeze({
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0',
  'Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow',
  'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
});
const message=code=>({
  401:'unauthenticated',403:'forbidden',404:'not_found',405:'method_not_allowed',
  503:'temporarily_unavailable'
})[code]||'temporarily_unavailable';
const answer=(status,body)=>Object.freeze({status,headers:HEADERS,body});
const reject=status=>answer(status,{error:message(status)});
function clean(v,max){return typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):''}
function normalize(row){
  if(!row||typeof row!=='object'||!UUID.test(row.case_id||''))return null;
  const date=row.updated_at instanceof Date?row.updated_at.toISOString():
    typeof row.updated_at==='string'?row.updated_at:null;
  if(!date||!Number.isFinite(Date.parse(date)))return null;
  return Object.freeze({
    case_id:row.case_id.toLowerCase(),
    label:clean(row.label,120)||'Case',
    service:clean(row.service,120),
    problem_preview:clean(row.project_goal,180),
    analysis_state:clean(row.analysis_state,40),
    updated_at:date
  });
}
function createFounderCaseIndex({pool,sessionStore,lookupStaff}){
  if(!pool||typeof pool.query!=='function'||!sessionStore||
    typeof lookupStaff!=='function')throw Error('RC14 private dependencies missing');
  return async function handle(req){
    let u;try{u=new URL(req?.url)}catch{return reject(404)}
    if(u.protocol!=='https:'||u.origin!==ORIGIN||u.username||u.password||
      u.pathname!==PATH||u.search||u.hash)return reject(404);
    if(req.method!=='GET')return reject(405);
    let principal;
    try{
      principal=await authenticateStaffSession({
        cookieHeader:req.headers?.cookie||'',
        store:sessionStore,lookupStaff
      });
    }catch{return reject(401)}
    if(!principal||principal.role!=='founder')return reject(403);
    // $1 is exclusively the verified SERVER session tenant. Never accept
    // tenant, staff ID, sort, "all", page or limit from a browser parameter.
    try{
      const result=await pool.query(
        'SELECT c.id AS case_id, c.updated_at, c.analysis_state, '+
        "COALESCE(NULLIF(btrim(l.company_name),''), NULLIF(btrim(l.full_name),''), 'Case') AS label, "+
        'l.service, l.project_goal '+
        'FROM ats_core.studio_case_tenant_scope sc '+
        'JOIN ats_core.studio_discovery_cases c ON c.id=sc.case_id '+
        'JOIN ats_core.studio_leads l ON l.id=c.lead_id '+
        'WHERE sc.tenant_id=$1 ORDER BY c.updated_at DESC,c.id DESC LIMIT 26',
        [principal.tenantId]
      );
      if(!Array.isArray(result?.rows)||result.rows.length>MAX+1)throw Error('bad_result');
      const items=result.rows.slice(0,MAX).map(normalize);
      if(items.some(row=>row===null))throw Error('invalid_case');
      return answer(200,{cases:items,has_more:result.rows.length>MAX});
    }catch{return reject(503)}
  };
}
module.exports={createFounderCaseIndex};
