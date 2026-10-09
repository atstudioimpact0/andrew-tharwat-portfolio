'use strict';

/**
 * ATS Release A / RC10 — SERVER-SIDE GENERATIVE AI KILL SWITCH.
 *
 * This module is a default-DENY contract for the ISOLATED Staging V2 runtime.
 * There is deliberately NO capability for an environment variable, browser
 * header, force=true, role spoof, approval token, or caller injection to enable
 * generation in Release A. Later Release B requires reviewed separate code,
 * trusted human approval, durable atomic budgets, usage audit and cost limits.
 *
 * IMPORTANT: Does not affect existing deployed legacy Supabase Edge Functions,
 * which have independent URLs and authorization. No provider/network SDK here.
 */
const {authenticateStaffSession}=require('./session.cjs');
const STAGING_ORIGIN='https://staging.atstudioimpact.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AI_ROUTE=/^\/api\/v2\/founder\/cases\/([0-9a-f-]{36})\/ai\/(diagnosis|blueprint|playbook)$/;
const GENERATION_ENABLED_IN_RELEASE_A=false;

function reply(status,code){
 return Object.freeze({
  status,headers:Object.freeze({
   'Cache-Control':'no-store, max-age=0',
   'Pragma':'no-cache',
   'Content-Type':'application/json; charset=utf-8',
   'X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer',
   'X-Robots-Tag':'noindex, nofollow',
   'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
  }),body:Object.freeze({error:code})
 });
}
function createReleaseAAiControl({sessionStore,lookupStaff}){
 if(!sessionStore||typeof sessionStore.get!=='function'||
   typeof sessionStore.delete!=='function'||typeof lookupStaff!=='function')
  throw new Error('Release A server identity unavailable');

 return async function handleAi(req){
  let u;
  try{u=new URL(req?.url)}catch{return reply(404,'not_found')}
  if(u.origin!==STAGING_ORIGIN||u.protocol!=='https:'||u.username||
     u.password||u.hash||u.search)return reply(404,'not_found');
  const m=AI_ROUTE.exec(u.pathname);
  if(!m||!UUID.test(m[1]))return reply(404,'not_found');
  if(req.method!=='POST')return reply(405,'method_not_allowed');
  // Browser writes must be same-origin. Never take browser-supplied email,
  // role, tenant, client ID, "manual" flag or approval boolean as authority.
  if(req.headers?.origin!==STAGING_ORIGIN)return reply(403,'forbidden');
  let principal;
  try{
   principal=await authenticateStaffSession({
    cookieHeader:req.headers?.cookie||'',
    store:sessionStore,lookupStaff
   });
  }catch{return reply(401,'unauthenticated')}
  if(!principal||principal.role!=='founder')return reply(403,'forbidden');

  // A verified Founder is necessary but NOT sufficient: no paid action
  // is authorized in Release A. Do not parse the payload or query a case;
  // even a valid session and plausible case UUID must not start generation.
  if(!GENERATION_ENABLED_IN_RELEASE_A)
    return reply(423,'ai_paused_release_a');

  // Deliberately no execution path in this release.
  return reply(423,'ai_paused_release_a');
 };
}
module.exports={createReleaseAAiControl,GENERATION_ENABLED_IN_RELEASE_A};
