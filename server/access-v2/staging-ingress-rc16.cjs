'use strict';
/**
 * AT STUDIO RC16 — trusted HTTPS staging ingress (COMPOSITION ONLY).
 *
 * This adapter is NOT a web listener, deploy, Vercel handler, or replacement
 * for real TLS / proxy trust. Its caller MUST obtain the raw path+query from a
 * trusted HTTPS serving layer, not any Host, X-Forwarded-* or Origin header.
 *
 * Never derive origin from client headers; the sole accepted runtime origin is
 * hardcoded and matches the approved Zoho callback for Staging.
 */
const {authenticateStaffSession}=require('./session.cjs');
const ORIGIN='https://staging.atstudioimpact.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT={
 'founder-clients-rc14.html':'text/html; charset=utf-8',
 'founder-staging-rc13.html':'text/html; charset=utf-8',
 'control-v2.css':'text/css; charset=utf-8',
 'premium.css':'text/css; charset=utf-8',
 'ultra.css':'text/css; charset=utf-8',
 'founder-case-rc11.css':'text/css; charset=utf-8',
 'founder-staging-rc13.css':'text/css; charset=utf-8',
 'founder-clients-rc14.css':'text/css; charset=utf-8',
 'founder-case-contract-rc12.js':'text/javascript; charset=utf-8',
 'founder-staging-rc13.js':'text/javascript; charset=utf-8',
 'founder-staging-rc13-init.js':'text/javascript; charset=utf-8',
 'founder-clients-rc14.js':'text/javascript; charset=utf-8',
 'founder-clients-rc14-init.js':'text/javascript; charset=utf-8'
};
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; "+
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; "+
  "base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";
const staticHeaders=type=>({
 'Content-Type':type,'Cache-Control':'no-store, max-age=0','Pragma':'no-cache',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':CSP,
 'Cross-Origin-Resource-Policy':'same-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
});
const respond=(status,body,type='application/json; charset=utf-8')=>({
 status,headers:staticHeaders(type),body
});
function rawTarget(value){
 if(typeof value!=='string'||value.length>8192||value.length===0||
    value[0]!=='/'||value.startsWith('//')||/[\\\u0000-\u0020\u007f#]/.test(value))
    return null;
 const question=value.indexOf('?');
 const path=question===-1?value:value.slice(0,question);
 if(!path||path.includes('%')||path.includes('//')||path.includes('..'))
   return null;
 let u;
 try{u=new URL(ORIGIN+value)}catch{return null}
 if(u.origin!==ORIGIN||u.protocol!=='https:'||u.pathname!==path||
    u.username||u.password||u.hash)return null;
 return u;
}
function createTrustedIngressRc16({runtime,sessionStore,lookupStaff,readStatic}){
 if(!runtime||typeof runtime.handle!=='function'||!sessionStore||
    typeof lookupStaff!=='function'||typeof readStatic!=='function')
   throw Error('Trusted staging integration unavailable');
 return async function handle(incoming){
  const u=rawTarget(incoming?.requestTarget);
  if(!u)return respond(404,{error:'not_found'});
  if(!['GET','POST'].includes(incoming?.method))return respond(405,{error:'method_not_allowed'});
  const h=incoming?.headers||{};
  // No HTTP Host, Forwarded, X-Forwarded-Host, X-Forwarded-Proto, X-Role,
  // X-Tenant, Authorization or browser-supplied staff identity is trusted.
  const req={
   url:u.href,method:incoming.method,
   headers:{
    cookie:typeof h.cookie==='string'?h.cookie:'',
    origin:typeof h.origin==='string'?h.origin:''
   }
  };
  if(u.pathname.startsWith('/api/v2/')){
   // Authentication routes + encrypted pending state + R15 index + R10
   // default-deny AI all stay inside existing verified staging composition.
   return runtime.handle(req);
  }
  if(incoming.method!=='GET'||u.search)return respond(404,{error:'not_found'});
  const isHome=u.pathname==='/control-v2/'||u.pathname==='/control-v2';
  const isIndex=u.pathname==='/control-v2/clients';
  const caseMatch=/^\/control-v2\/cases\/([0-9a-f-]{36})$/i.exec(u.pathname);
  const isCase=!!caseMatch&&UUID.test(caseMatch[1]);
  let file=null;
  if(isIndex)file='founder-clients-rc14.html';
  else if(isCase)file='founder-staging-rc13.html';
  else if(u.pathname.startsWith('/control-v2-preview/')){
   const part=u.pathname.slice('/control-v2-preview/'.length);
   if(Object.hasOwn(CONTENT,part)&&!part.endsWith('.html'))file=part;
  }
  if(!isHome&&!file)return respond(404,{error:'not_found'});
  // Protect all privileged HTML and safe static assets as defense-in-depth.
  // Do not send a Founder screen or script to a revoked/offboarded session.
  let principal;
  try{
   principal=await authenticateStaffSession({
    cookieHeader:req.headers.cookie,store:sessionStore,lookupStaff
   });
  }catch{return respond(401,{error:'unauthenticated'})}
  if(!principal||principal.role!=='founder')
   return respond(403,{error:'forbidden'});
  if(isHome)return {
   status:303,
   headers:{...staticHeaders('text/plain; charset=utf-8'),Location:'/control-v2/clients'},
   body:''
  };
  try{
   // readStatic receives a literal allowlisted filename, never a raw user
   // path. Production must ensure this resolves to bundled, immutable bytes.
   const content=await readStatic(file);
   if(typeof content!=='string'||content.length>300000||content.length===0)
    throw Error('unavailable static asset');
   return respond(200,content,CONTENT[file]);
  }catch{return respond(503,{error:'temporarily_unavailable'})}
 };
}
module.exports={createTrustedIngressRc16,rawTarget};
