'use strict';

/**
 * Zoho Directory OIDC staff-login transaction orchestration — STAGING MODULE ONLY.
 *
 * Requires an injected, maintained, signature-validating OIDC implementation
 * (e.g. openid-client v6) plus a durable one-time pending-transaction store.
 * NO routes, secrets, sessions, DNS, database writes, or production wiring here.
 * Never accept browser-provided "verified", "role", "tenantId" or "clientId".
 */
const crypto=require('node:crypto');

class OidcDenied extends Error {
  constructor(message='Authentication unavailable') {
    super(message);this.name='OidcDenied';this.status=401;this.code='OIDC_DENIED';
  }
}
const validId=value=>typeof value==='string' && value.length>0 && value.length<=300;
function strictHttpsUrl(input) {
  if(typeof input!=='string')throw new OidcDenied('Invalid OIDC configuration');
  let url;try{url=new URL(input)}catch{throw new OidcDenied('Invalid OIDC configuration')}
  if(url.protocol!=='https:' || url.username || url.password || url.hash || url.hostname==='localhost')
    throw new OidcDenied('Production-like HTTPS required');
  return url;
}
function configCheck(settings){
  if(!settings || typeof settings!=='object' || !validId(settings.clientId))
    throw new OidcDenied('Missing OIDC settings');
  const issuer=strictHttpsUrl(settings.issuer);
  const callback=strictHttpsUrl(settings.callbackUrl);
  if(issuer.search || callback.search || issuer.pathname.startsWith('//'))
    throw new OidcDenied('Issuer/callback must be exact');
  return {issuer:issuer.href.replace(/\/$/,''),clientId:settings.clientId,callbackUrl:callback.href};
}
function assertAdapter(oidc){
  for(const name of ['randomPKCECodeVerifier','calculatePKCECodeChallenge','buildAuthorizationUrl','authorizationCodeGrant'])
    if(!oidc || typeof oidc[name]!=='function')throw new OidcDenied('Validated OIDC client missing');
}
const stateToken=()=>crypto.randomBytes(32).toString('base64url');
const isClaimsAud=(claims,clientId)=>claims.aud===clientId ||
  (Array.isArray(claims.aud)&&claims.aud.includes(clientId));

/** Configure once from verified tenant-specific Directory metadata, NOT guessed Zoho endpoints. */
async function beginStaffLogin({settings,oidc,oidcConfig,pending,now=Date.now()}){
  const cfg=configCheck(settings);assertAdapter(oidc);
  if(!pending || typeof pending.create!=='function')throw new OidcDenied('Pending store missing');
  if(!Number.isFinite(now))throw new OidcDenied('Invalid time');
  const verifier=oidc.randomPKCECodeVerifier();
  if(!validId(verifier))throw new OidcDenied('PKCE unavailable');
  const challenge=await oidc.calculatePKCECodeChallenge(verifier);
  if(!validId(challenge))throw new OidcDenied('PKCE unavailable');
  const state=stateToken(),nonce=stateToken();
  const authorizeUrl=oidc.buildAuthorizationUrl(oidcConfig,{
    redirect_uri:cfg.callbackUrl,scope:'openid email',state,nonce,
    code_challenge:challenge,code_challenge_method:'S256'
  });
  const location=new URL(String(authorizeUrl));
  if(location.protocol!=='https:' || !location.searchParams.has('state') ||
     location.searchParams.get('state')!==state)throw new OidcDenied('Invalid provider redirect');
  // Atomic create, unique state, TTL with a durable server-only store.
  await pending.create(state,{verifier,nonce,issuer:cfg.issuer,clientId:cfg.clientId,callbackUrl:cfg.callbackUrl,expiresAt:now+300_000});
  return {authorizationUrl:location.href,state}; // state is *not* a bearer login token
}

/** Consume pending state atomically before token exchange. Caller issues secure session separately. */
async function finishStaffLogin({settings,oidc,oidcConfig,pending,callbackRequestUrl,lookupStaff,now=Date.now()}){
  const cfg=configCheck(settings);assertAdapter(oidc);
  if(!pending || typeof pending.consume!=='function' || typeof lookupStaff!=='function')
    throw new OidcDenied('Protected integration unavailable');
  const url=strictHttpsUrl(callbackRequestUrl);
  if(url.origin!==new URL(cfg.callbackUrl).origin || url.pathname!==new URL(cfg.callbackUrl).pathname ||
     url.searchParams.getAll('state').length!==1 || url.searchParams.getAll('code').length!==1 ||
     url.searchParams.has('error'))
    throw new OidcDenied('Untrusted callback');
  const transaction=await pending.consume(url.searchParams.get('state')); // MUST be atomic, one-time.
  if(!transaction || transaction.expiresAt<=now || transaction.issuer!==cfg.issuer ||
    transaction.clientId!==cfg.clientId || transaction.callbackUrl!==cfg.callbackUrl ||
    !validId(transaction.verifier)||!validId(transaction.nonce))
    throw new OidcDenied('Expired or reused login');
  // Maintained OIDC adapter must validate signatures, issuer, audience, nonce and state.
  const result=await oidc.authorizationCodeGrant(oidcConfig,url,{
    pkceCodeVerifier:transaction.verifier,
    expectedState:url.searchParams.get('state'),
    expectedNonce:transaction.nonce,
    idTokenExpected:true
  });
  const claims=result && typeof result.claims==='function' ? result.claims():null;
  if(!claims || claims.iss!==cfg.issuer || !isClaimsAud(claims,cfg.clientId) ||
    !validId(claims.sub) || claims.nonce!==transaction.nonce)
    throw new OidcDenied('Unverified identity claims');
  // Lookup from ATS trusted staff table keyed by the immutable OIDC (issuer,sub).
  // Never assign privileges from user-controlled email, domains, groups or JWT metadata.
  const staff=await lookupStaff({issuer:cfg.issuer,subject:claims.sub});
  if(!staff || staff.active!==true || staff.issuer!==cfg.issuer || staff.subject!==claims.sub ||
    !validId(staff.tenantId) || !validId(staff.id) ||
    !['founder','studio_admin','reviewer','contributor'].includes(staff.role))
    throw new OidcDenied('No approved staff assignment');
  return Object.freeze({verified:true,id:staff.id,tenantId:staff.tenantId,role:staff.role,issuer:cfg.issuer,subject:claims.sub});
}

module.exports={beginStaffLogin,finishStaffLogin,configCheck,OidcDenied};
