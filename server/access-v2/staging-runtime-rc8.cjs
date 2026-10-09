'use strict';
/**
 * ATS Release A — RC8 staging-only runtime COMPOSITION, NOT DEPLOYED.
 * Explicitly no HTTP listener, Vercel function, prod route, real DB credentials,
 * provider token/secret, or browser role controls.
 * The trusted HTTPS ingress must provide an absolute fixed-origin req.url;
 * never reconstruct the origin from untrusted request Host/Forwarded headers.
 */
const {createPgStaffStore}=require('./pg-staff-store-rc8.cjs');
const {createPgOidcPendingEncrypted}=require('./pg-oidc-pending-encrypted.cjs');
const {createRc5AuthBoundary}=require('./rc5-auth-boundary.cjs');
const {createFounderWorkspaceRead}=require('./founder-workspace-rc8.cjs');
const {createFounderCaseIndex}=require('./founder-case-index-rc14.cjs');
const {createReleaseAAiControl}=require('./ai-control-rc10.cjs');
const {beginStaffLogin,finishStaffLogin}=require('./zoho-directory-flow.cjs');
const {issueStaffSession,authenticateStaffSession,revokeStaffSession}=require('./session.cjs');

const STAGING_ORIGIN='https://staging.atstudioimpact.com';
const CALLBACK=STAGING_ORIGIN+'/api/v2/auth/zoho/callback';
const PATHS=new Set(['/api/v2/auth/zoho/start','/api/v2/auth/zoho/callback','/api/v2/auth/logout']);

const safeHeaders=()=>({
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store, max-age=0',
 'Pragma':'no-cache',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'X-Robots-Tag':'noindex, nofollow'
});
const error=(status)=>({status,headers:safeHeaders(),body:{
 error:status===404?'not_found':'authentication_unavailable'}});

function createStagingAuthRuntime({pool,encryptionKey,settings,oidc,oidcConfig}){
 if(!pool || typeof pool.query!=='function' || !Buffer.isBuffer(encryptionKey) ||
   encryptionKey.length!==32 || settings?.callbackUrl!==CALLBACK ||
   !settings?.clientId || !settings?.issuer || !oidc || !oidcConfig)
  throw new Error('Staging auth configuration invalid');
 const staff=createPgStaffStore({pool});
 const pending=createPgOidcPendingEncrypted({pool,encryptionKey});
 const auth=createRc5AuthBoundary({
  settings,oidc,oidcConfig,pending,
  beginStaffLogin,finishStaffLogin,
  issueSession:issueStaffSession,revokeSession:revokeStaffSession,
  authenticate:authenticateStaffSession,
  sessionStore:staff,lookupStaff:staff.lookupStaff,
  workspacePath:'/control-v2/'
 });
 const readCase=createFounderWorkspaceRead({
  pool,sessionStore:staff,lookupStaff:staff.lookupStaff,
  origin:STAGING_ORIGIN
 });
 const listCases=createFounderCaseIndex({pool,sessionStore:staff,lookupStaff:staff.lookupStaff});
 const rejectAi=createReleaseAAiControl({
  sessionStore:staff,lookupStaff:staff.lookupStaff
 });
 async function handle(req){
  let url;
  try{url=new URL(req?.url)}catch{return error(404)}
  if(url.origin!==STAGING_ORIGIN||url.protocol!=='https:'||
      url.username||url.password||url.hash)return error(404);
  if(PATHS.has(url.pathname)){
   if(url.pathname==='/api/v2/auth/zoho/start')return auth.start(req);
   if(url.pathname==='/api/v2/auth/zoho/callback')return auth.callback(req);
   return auth.logout(req);
  }
  if(url.pathname==='/api/v2/founder/cases')return listCases(req);
  // Route AI mutations to the server-side RC10 kill switch BEFORE any read dispatch.
  if(/^\/api\/v2\/founder\/cases\/[^/]+\/ai\//.test(url.pathname))return rejectAi(req);
  if(/^\/api\/v2\/founder\/cases\//.test(url.pathname))return readCase(req);
  return error(404);
 }
 return Object.freeze({handle});
}
module.exports={createStagingAuthRuntime};
