'use strict';
/**
 * AT STUDIO — Release A / RC5. Staging-only HTTP boundary candidate.
 * Adapter for EXISTING V2 begin/finish, session and RC4 pending store.
 * No network listener, runtime secrets, database credentials or deploy config.
 * The HTTPS ingress MUST construct request.url from verified configuration,
 * never from attacker-supplied X-Forwarded-* or Host headers.
 */
const { timingSafeEqual } = require('node:crypto');
const BINDING_COOKIE='__Host-ats_oidc_binding';
const BINDING_RE=/^[A-Za-z0-9_-]{43}$/;
const DEFAULT_LOGIN='/api/v2/auth/zoho/start';
const DEFAULT_CALLBACK='/api/v2/auth/zoho/callback';
const DEFAULT_LOGOUT='/api/v2/auth/logout';
const DEFAULT_WORKSPACE='/control-v2/';

function denied(){return Object.assign(new Error('Authentication unavailable'),{code:'AUTH_UNAVAILABLE'});}
function urlAt(s){try{const u=new URL(s);if(u.protocol!=='https:' || u.username || u.password || u.hash)return null;return u;}catch{return null;}}
function same(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length && timingSafeEqual(x,y);}
function cookies(raw,name){
 if(typeof raw!=='string'||raw.length>8192)return [];
 return raw.split(';').map(s=>s.trim()).filter(p=>p.startsWith(name+'=')).map(p=>p.slice(name.length+1));
}
function cookieBinding(v){if(!BINDING_RE.test(v))throw denied();return BINDING_COOKIE+'='+v+'; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=Lax';}
function cookieClear(){return BINDING_COOKIE+'=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax';}
function noCache(headers={}){return {'Cache-Control':'no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers};}
function safeResponse(status=401){return {status,headers:noCache({'Content-Type':'application/json; charset=utf-8'}),body:{error:status===405?'method_not_allowed':'authentication_unavailable'}};}
function goodPath(p){return typeof p==='string' && p.startsWith('/')&&!p.startsWith('//')&&!/[?#\\\r\n]/.test(p);}

function createRc5AuthBoundary({settings,oidc,oidcConfig,pending,beginStaffLogin,finishStaffLogin,
 issueSession,revokeSession,authenticate,sessionStore,lookupStaff,workspacePath=DEFAULT_WORKSPACE}){
 const expected=urlAt(settings?.callbackUrl);
 if(!expected||expected.search||expected.pathname!==DEFAULT_CALLBACK || !goodPath(workspacePath) ||
   !settings?.issuer || !settings?.clientId || !pending ||
   typeof beginStaffLogin!=='function'||typeof finishStaffLogin!=='function'||
   typeof issueSession!=='function'||typeof revokeSession!=='function'||typeof authenticate!=='function'||
   typeof lookupStaff!=='function'||!sessionStore) throw denied();
 const origin=expected.origin;
 const issuer=urlAt(settings.issuer);
 if(!issuer || issuer.search || issuer.hash)throw denied();
 function route(req){
  const u=urlAt(req?.url), method=req?.method;
  if(!u||u.origin!==origin||!['GET','POST'].includes(method)||u.hash) return null;
  return {u,method};
 }
 function ensureReq(req,path,method){
  const r=route(req);if(!r||r.u.pathname!==path)return false;
  if(r.method!==method)return 'method';
  if(path!==DEFAULT_CALLBACK && r.u.search)return false;
  return true;
 }
 async function start(req){
  const check=ensureReq(req,DEFAULT_LOGIN,'GET');
  if(check!==true)return safeResponse(check==='method'?405:401);
  try{
   const result=await beginStaffLogin({settings,oidc,oidcConfig,pending});
   const dest=urlAt(result?.authorizationUrl);
   if(!dest||dest.origin!==issuer.origin||
      dest.searchParams.getAll('state').length!==1||
      !same(dest.searchParams.get('state'),result?.state)||
      !BINDING_RE.test(result?.browserBinding||''))throw denied();
   return {status:302,headers:noCache({Location:dest.href,'Set-Cookie':[cookieBinding(result.browserBinding)]}),body:null};
  }catch{return safeResponse();}
 }
 async function callback(req){
  const check=ensureReq(req,DEFAULT_CALLBACK,'GET');
  if(check!==true)return safeResponse(check==='method'?405:401);
  const matches=cookies(req.headers?.cookie,BINDING_COOKIE);
  if(matches.length!==1||!BINDING_RE.test(matches[0])) return {...safeResponse(),headers:noCache({'Set-Cookie':[cookieClear()]})};
  try{
   const principal=await finishStaffLogin({settings,oidc,oidcConfig,pending,callbackRequestUrl:req.url,
    browserBinding:matches[0],lookupStaff});
   const issued=await issueSession({principal,store:sessionStore});
   if(typeof issued?.setCookie!=='string'|| !issued.setCookie.startsWith('__Host-ats_v2=') ||
     !issued.setCookie.includes('; HttpOnly;') || !issued.setCookie.includes('; Secure;') ||
     !issued.setCookie.includes('; Path=/;') || !issued.setCookie.includes('; SameSite=Lax') ||
     /[\r\n]/.test(issued.setCookie) || /;\s*Domain=/i.test(issued.setCookie))throw denied();
   return {status:302,headers:noCache({Location:workspacePath,'Set-Cookie':[issued.setCookie,cookieClear()]}),body:null};
  }catch{return {...safeResponse(),headers:noCache({'Set-Cookie':[cookieClear()]})};}
 }
 async function logout(req){
  const check=ensureReq(req,DEFAULT_LOGOUT,'POST');
  if(check!==true)return safeResponse(check==='method'?405:401);
  if(!same(req.headers?.origin,origin))return safeResponse(403);
  try{
   const expired=await revokeSession({cookieHeader:req.headers?.cookie||'',store:sessionStore});
   if(typeof expired!=='string'||!expired.startsWith('__Host-ats_v2='))throw denied();
   return {status:204,headers:noCache({'Set-Cookie':[expired,cookieClear()]}),body:null};
  }catch{return safeResponse();}
 }
 async function requireFounder(req){
  const r=route(req);
  if(!r||r.method!=='GET')throw denied();
  const p=await authenticate({cookieHeader:req.headers?.cookie||'',store:sessionStore,lookupStaff});
  if(!p||p.verified!==true||p.role!=='founder')throw denied();
  return p;
 }
 return Object.freeze({start,callback,logout,requireFounder});
}
module.exports={createRc5AuthBoundary,BINDING_COOKIE};
