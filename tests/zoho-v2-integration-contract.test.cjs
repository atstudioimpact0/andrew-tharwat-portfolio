'use strict';
// Uses REAL PR #16 V2 auth/session modules; synthetic OIDC provider and storage only.
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createZohoAccountsOidcAdapter}=require('../server/access-v2/zoho-accounts-oidc-adapter.cjs');
const {beginStaffLogin,finishStaffLogin}=require('../server/access-v2/zoho-directory-flow.cjs');
const {issueStaffSession,authenticateStaffSession,revokeStaffSession}=require('../server/access-v2/session.cjs');
const issuer='https://accounts.zoho.com';
const callbackUrl='https://staging.atstudioimpact.com/api/v2/auth/zoho/callback';
const settings={issuer,callbackUrl,clientId:'1000.synthetic'};
const uuid=()=>crypto.randomBytes(32).toString('base64url');
function harness({verifiedSub='zoho-sub-01',active=true}={}){
  const pendingRecords=new Map(),sessions=new Map();
  let staffActive=active;
  const staff={id:'founder-01',issuer,subject:'zoho-sub-01',role:'founder',tenantId:'ats-staging',active:true};
  const metadata={issuer,authorization_endpoint:issuer+'/oauth/v2/auth',token_endpoint:issuer+'/oauth/v2/token',jwks_uri:issuer+'/oauth/v2/keys'};
  const client={
    discovery:async()=>({serverMetadata:()=>metadata}),ClientSecretPost:()=>({}),
    randomPKCECodeVerifier:uuid,calculatePKCECodeChallenge:async()=>uuid(),
    buildAuthorizationUrl:(_config,params)=>new URL(issuer+'/oauth/v2/auth?'+new URLSearchParams(params)),
    authorizationCodeGrant:async(_config,_url,checks)=>({claims:()=>({iss:issuer,aud:settings.clientId,sub:verifiedSub,nonce:checks.expectedNonce})})
  };
  const pending={
    async create(state,data){if(pendingRecords.has(state))throw Error('duplicate');pendingRecords.set(state,data)},
    async consume(state){const value=pendingRecords.get(state)||null;pendingRecords.delete(state);return value}
  };
  const store={
    async create(hash,record){sessions.set(hash,record)},
    async get(hash){return sessions.get(hash)||null},
    async delete(hash){sessions.delete(hash)}
  };
  const lookupStaff=async ({issuer:identityIssuer,subject})=>
    identityIssuer===staff.issuer&&subject===staff.subject?{...staff,active:staffActive}:null;
  return {client,pending,store,lookupStaff,pendingRecords,sessions,setStaffActive(v){staffActive=v}};
}
async function begin(h){
  const {oidc,oidcConfig}=await createZohoAccountsOidcAdapter({issuer,clientId:settings.clientId,
    clientSecret:'synthetic-not-real-secret',openidClient:h.client});
  return {oidc,oidcConfig,started:await beginStaffLogin({settings,oidc,oidcConfig,pending:h.pending})};
}
async function finish(h,auth){
  return finishStaffLogin({settings,oidc:auth.oidc,oidcConfig:auth.oidcConfig,pending:h.pending,
    callbackRequestUrl:callbackUrl+'?code=synthetic-code&state='+auth.started.state,
    browserBinding:auth.started.browserBinding,lookupStaff:h.lookupStaff});
}
test('real V2 code + RC6 provider adapter: begin → identity → session → logout',async()=>{
  const h=harness(),auth=await begin(h);
  const redirect=new URL(auth.started.authorizationUrl);
  assert.equal(redirect.searchParams.get('response_type'),'code');
  assert.ok(redirect.searchParams.has('nonce'));
  assert.ok(redirect.searchParams.has('code_challenge'));
  const principal=await finish(h,auth);
  assert.equal(principal.role,'founder');
  const issued=await issueStaffSession({principal,store:h.store});
  assert.match(issued.setCookie,/HttpOnly/);
  const found=await authenticateStaffSession({cookieHeader:issued.setCookie.split(';')[0],store:h.store,lookupStaff:h.lookupStaff});
  assert.equal(found.tenantId,'ats-staging');
  const expired=await revokeStaffSession({cookieHeader:issued.setCookie.split(';')[0],store:h.store});
  assert.match(expired,/Max-Age=0/);
  await assert.rejects(authenticateStaffSession({cookieHeader:issued.setCookie.split(';')[0],store:h.store,lookupStaff:h.lookupStaff}));
});
test('real V2 provider callback replay fails closed after one-time consume',async()=>{
  const h=harness(),auth=await begin(h);
  await finish(h,auth);
  await assert.rejects(finish(h,auth));
});
test('real V2 refuses verified but unapproved Zoho subject',async()=>{
  const h=harness({verifiedSub:'not-approved'}),auth=await begin(h);
  await assert.rejects(finish(h,auth));
  assert.equal(h.sessions.size,0);
});
test('real V2 session rejects removed founder after active staff recheck',async()=>{
  const h=harness(),auth=await begin(h),principal=await finish(h,auth);
  const issued=await issueStaffSession({principal,store:h.store});
  h.setStaffActive(false);
  await assert.rejects(authenticateStaffSession({cookieHeader:issued.setCookie.split(';')[0],store:h.store,lookupStaff:h.lookupStaff}));
  assert.equal(h.sessions.size,0);
});
