'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {beginStaffLogin,finishStaffLogin,configCheck,OidcDenied}=require('../server/access-v2/zoho-directory-flow.cjs');

const settings={issuer:'https://directory.example.test',clientId:'ats-staging-only',callbackUrl:'https://preview.example.test/oidc/callback'};
const now=1720000000000;
function env(opts={}){
 const store=new Map(); const calls=[];
 const pending={
  async create(state,entry){if(store.has(state))throw Error('duplicate');store.set(state,entry);},
  async consume(state){const value=store.get(state);store.delete(state);return value;}
 };
 const claimsOverride=opts.claimsOverride||{};
 const oidc={
  randomPKCECodeVerifier(){return 'local-test-verifier-0123456789';},
  async calculatePKCECodeChallenge(value){assert.equal(value,'local-test-verifier-0123456789');return 'TEST_CHALLENGE';},
  buildAuthorizationUrl(_,params){
   calls.push(params);
   const url=new URL('https://directory.example.test/oauth/authorize');
   for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
   return url;
  },
  async authorizationCodeGrant(_conf,url,options){
   calls.push({grant:url.href,options});
   const state=url.searchParams.get('state'),entry=opts.selectedEntry||previous;
   return {claims:()=>({
    iss:settings.issuer,aud:settings.clientId,sub:'zoho-user-1',
    nonce:entry.nonce, email:'spoofed-other-person@example.test',role:'founder',
    ...claimsOverride
   })};
  }
 };
 let previous;
 async function start(){
  const init=await beginStaffLogin({settings,oidc,oidcConfig:{},pending,now});
  previous=store.get(init.state);
  const callback=settings.callbackUrl+'?code=TEST_AUTH_CODE&state='+encodeURIComponent(init.state);
  return {init,callback};
 }
 const approved=Object.freeze({active:true,id:'ats-team-1',tenantId:'ats-org',role:'reviewer',issuer:settings.issuer,subject:'zoho-user-1'});
 const lookupStaff=opts.lookupStaff || (async()=>approved);
 const finish=callback=>finishStaffLogin({settings,oidc,oidcConfig:{},pending,callbackRequestUrl:callback,lookupStaff,now:now+1000});
 return {start,finish,store,calls,pending,oidc};
}
test('OIDC staging config allows only exact secure HTTPS endpoints',()=>{
 assert.equal(configCheck(settings).callbackUrl,settings.callbackUrl);
 for(const bad of [
  {...settings,issuer:'http://directory.example.test'},
  {...settings,callbackUrl:'http://preview.example.test/callback'},
  {...settings,callbackUrl:'https://attacker@preview.example.test/callback'},
  {...settings,callbackUrl:'https://localhost/callback'},
  {...settings,clientId:''},
  {...settings,issuer:'https://directory.example.test/path?state=x'}
 ])assert.throws(()=>configCheck(bad),OidcDenied);
});
test('begin creates one-time PKCE transaction and returns redirect without credential exposure',async()=>{
 const e=env(),{init}=await e.start();
 const url=new URL(init.authorizationUrl);
 assert.equal(url.origin,settings.issuer);
 assert.equal(url.searchParams.get('redirect_uri'),settings.callbackUrl);
 assert.equal(url.searchParams.get('scope'),'openid email');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('code_challenge'),'TEST_CHALLENGE');
 assert.equal(e.store.get(init.state).expiresAt,now+300000);
 assert.equal(e.store.get(init.state).nonce.length>10,true);
});
test('verified OIDC claims map only to explicitly active, assigned ATS staff identity',async()=>{
 const e=env(); const {callback}=await e.start();
 const principal=await e.finish(callback);
 assert.deepEqual({...principal},{verified:true,id:'ats-team-1',tenantId:'ats-org',role:'reviewer',issuer:settings.issuer,subject:'zoho-user-1'});
 assert.notEqual(principal.role,'founder'); // Ignored forged role/email in provider claims.
 assert.equal(e.store.size,0);
 const options=e.calls.find(x=>x.options).options;
 assert.equal(options.idTokenExpected,true);
 assert.equal(options.pkceCodeVerifier,'local-test-verifier-0123456789');
 assert.ok(options.expectedNonce.length>10);
});
test('one-time transaction prevents replay',async()=>{
 const e=env(),{callback}=await e.start();
 await e.finish(callback);
 await assert.rejects(e.finish(callback),OidcDenied);
});
test('unmatched host, path or error redirect rejected before token exchange',async()=>{
 const e=env(),{callback}=await e.start();
 for(const bad of [
  callback.replace('preview.example.test','attack.example.test'),
  callback.replace('/oidc/callback','/other'),
  callback+'&state=duplicate',
  callback+'&error=access_denied',
  callback.replace('https:','http:')
 ])await assert.rejects(e.finish(bad),OidcDenied);
});
test('expired pending transaction is rejected',async()=>{
 const e=env(),{init,callback}=await e.start();
 e.store.get(init.state).expiresAt=now;
 await assert.rejects(e.finish(callback),OidcDenied);
});
test('forged ID token identity or audience cannot create staff principal',async()=>{
 for(const claims of [{iss:'https://other.example.test'},{aud:'wrong-app'},{sub:''},{nonce:'forged-nonce'}]){
  const e=env({claimsOverride:claims});
  const {callback}=await e.start();
  await assert.rejects(e.finish(callback),OidcDenied);
 }
});
test('unapproved or inactive member denied despite a validated Zoho login',async()=>{
 for(const bad of [
  null,
  {active:false,id:'member',tenantId:'ats-org',role:'reviewer',issuer:settings.issuer,subject:'zoho-user-1'},
  {active:true,id:'member',tenantId:'ats-org',role:'founder',issuer:settings.issuer,subject:'not-the-sub'},
  {active:true,id:'member',tenantId:'ats-org',role:'superadmin',issuer:settings.issuer,subject:'zoho-user-1'}
 ]){
  const e=env({lookupStaff:async()=>bad});const {callback}=await e.start();
  await assert.rejects(e.finish(callback),OidcDenied);
 }
});
