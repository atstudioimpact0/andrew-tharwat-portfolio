'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createZohoAccountsOidcAdapter}=require('../server/access-v2/zoho-accounts-oidc-adapter.cjs');
const origin='https://accounts.zoho.com';
function stub(opts={}){
  const calls=[];
  const api={
    ClientSecretPost(secret){calls.push(['auth',secret]);return {clientSecret:secret}},
    async discovery(issuer,id,metadata,auth){
      calls.push(['discovery',issuer.href,id,metadata.client_secret,auth.clientSecret]);
      if(opts.error)throw Error('LEAK_MY_SECRET');
      return {serverMetadata(){return {
        issuer:opts.issuer??origin,
        authorization_endpoint:opts.authEndpoint??origin+'/oauth/v2/auth',
        token_endpoint:origin+'/oauth/v2/token',
        jwks_uri:origin+'/oauth/v2/keys'
      }}};
    },
    randomPKCECodeVerifier:()=> 'verifier',
    calculatePKCECodeChallenge:async v=>'challenge:'+v,
    buildAuthorizationUrl:(cfg,params)=>{calls.push(['build',params]);return new URL(origin+'/oauth/v2/auth?'+new URLSearchParams(params))},
    authorizationCodeGrant:async (cfg,url,checks)=>{calls.push(['grant',url.href,checks]);return {claims:()=>({sub:'signed-sub'})}}
  };
  return {api,calls};
}
const inputs={issuer:origin,clientId:'1000.fake-client',clientSecret:'not-a-real-secret'};
test('valid provider metadata and injected verified client methods compose',async()=>{
  const s=stub(),r=await createZohoAccountsOidcAdapter({...inputs,openidClient:s.api});
  assert.equal(s.calls[1][0],'discovery');assert.equal(s.calls[1][1],origin+'/');
  assert.equal(r.oidc.randomPKCECodeVerifier(),'verifier');
  assert.equal(await r.oidc.calculatePKCECodeChallenge('abc'),'challenge:abc');
  const u=r.oidc.buildAuthorizationUrl(r.oidcConfig,{state:'test-state',nonce:'test-nonce'});
  assert.equal(u.searchParams.get('response_type'),'code');
  assert.equal(u.searchParams.get('nonce'),'test-nonce');
  assert.equal(u.searchParams.get('state'),'test-state');
  const checks={pkceCodeVerifier:'pkce',expectedState:'state',expectedNonce:'nonce',idTokenExpected:true};
  await r.oidc.authorizationCodeGrant(r.oidcConfig,new URL(origin+'/cb?code=x'),checks);
  assert.deepEqual(s.calls.at(-1)[2],checks);
});
test('unknown issuer origin fails before discovery',async()=>{
  const s=stub();await assert.rejects(createZohoAccountsOidcAdapter({...inputs,issuer:'https://attacker.invalid',openidClient:s.api}));
  assert.equal(s.calls.length,0);
});
test('trailing slash, URL credentials or non-https issuer blocked',async()=>{
  for(const value of [origin+'/',origin+'/?x=1','http://accounts.zoho.com','https://alice@accounts.zoho.com',origin+'/oauth'])
    await assert.rejects(createZohoAccountsOidcAdapter({...inputs,issuer:value,openidClient:stub().api}));
});
test('Zoho EU issuer accepted with matching EU metadata',async()=>{
  const eu='https://accounts.zoho.eu';const s=stub({issuer:eu,authEndpoint:eu+'/oauth/v2/auth'});
  s.api.discovery=async()=>({serverMetadata:()=>({issuer:eu,authorization_endpoint:eu+'/oauth/v2/auth',token_endpoint:eu+'/oauth/v2/token',jwks_uri:eu+'/oauth/v2/keys'})});
  const r=await createZohoAccountsOidcAdapter({...inputs,issuer:eu,openidClient:s.api});assert.ok(r.oidcConfig);
});
test('mismatched issuer in discovery rejected',async()=>{
  await assert.rejects(createZohoAccountsOidcAdapter({...inputs,openidClient:stub({issuer:'https://accounts.zoho.eu'}).api}));
});
test('unexpected cross-origin authorization endpoint rejected',async()=>{
  await assert.rejects(createZohoAccountsOidcAdapter({...inputs,openidClient:stub({authEndpoint:'https://evil.invalid/auth'}).api}));
});
test('missing client secret or library methods rejected',async()=>{
  await assert.rejects(createZohoAccountsOidcAdapter({...inputs,clientSecret:'',openidClient:stub().api}));
  await assert.rejects(createZohoAccountsOidcAdapter({...inputs,openidClient:{discovery:()=>{}}}));
});
test('discovery error never exposes secrets to thrown error',async()=>{
  const s=stub({error:true});
  await assert.rejects(createZohoAccountsOidcAdapter({...inputs,openidClient:s.api}),e=> !String(e).includes('LEAK_MY_SECRET')&&!String(e).includes(inputs.clientSecret));
});
