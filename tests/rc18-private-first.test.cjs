'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createStagingCandidateRc18,StageNotReady}=
 require('../server/access-v2/staging-bootstrap-rc18.cjs');
const {SUPPORTED_ZOHO_ORIGINS}=
 require('../server/access-v2/rc17-zoho-origins.cjs');
const callback='https://staging.atstudioimpact.com/api/v2/auth/zoho/callback';
const base={
 zohoIssuer:'https://accounts.zoho.com',
 zohoClientId:'synthetic-client-rc18',
 zohoClientSecret:'synthetic-test-only-never-use',
 zohoCallback:callback
};
const approval={
 secretRotatedVerified:true,callbackRegisteredVerified:true,
 trustedTlsVerified:true,founderIdentityVerified:true,
 scopedIndexRpcVerified:true
};
function adapter(count){
 const s='https://accounts.zoho.com';
 return {
  async discovery(){count.calls++;return {serverMetadata(){return {
   issuer:s,authorization_endpoint:s+'/oauth/v2/auth',
   token_endpoint:s+'/oauth/v2/token',jwks_uri:s+'/oauth/v2/keys'
  }}}},
  ClientSecretPost(){return {}},
  randomPKCECodeVerifier(){return 'x'.repeat(43)},
  calculatePKCECodeChallenge(){return 'y'.repeat(43)},
  buildAuthorizationUrl(){return new URL(s+'/oauth/v2/auth')},
  authorizationCodeGrant(){return {}}
 };
}
async function fails(fn){
 await assert.rejects(fn(),e=>e instanceof StageNotReady &&
  e.message==='ATS Staging candidate cannot initialize');
}
test('RC18 private DB denial prevents external Zoho discovery',async()=>{
 const count={calls:0},sql=[];
 const db={async query(query,args){sql.push({query,args});return {rows:[{
  private_index_exists:false,private_index_service_exec:false
 }]}}};
 await fails(()=>createStagingCandidateRc18({
  configuration:{...base,oidcKeyBase64Url:crypto.randomBytes(32).toString('base64url')},
  approval,pool:db,openidClient:adapter(count),readAsset:async()=>'<p>Mock</p>'
 }));
 assert.equal(sql.length,1);
 assert.equal(count.calls,0);
});
test('RC18 supports officially documented Canada / UK / UAE Zoho issuer origins',()=>{
 for(const origin of ['https://accounts.zohocloud.ca',
  'https://accounts.zoho.uk','https://accounts.zoho.ae',
  'https://accounts.zoho.com.cn'])
  assert.equal(SUPPORTED_ZOHO_ORIGINS.includes(origin),true,origin);
 assert.equal(SUPPORTED_ZOHO_ORIGINS.includes('https://accounts.zoho.ca'),false);
});
test('RC18 missing evidence fails without touching DB or provider',async()=>{
 let queries=0;const count={calls:0};
 await fails(()=>createStagingCandidateRc18({
  configuration:{...base,oidcKeyBase64Url:crypto.randomBytes(32).toString('base64url')},
  approval:{...approval,callbackRegisteredVerified:false},
  pool:{async query(){queries++;return {rows:[]}}},
  openidClient:adapter(count),readAsset:async()=>'<div>Safe</div>'
 }));
 assert.equal(queries,0);
 assert.equal(count.calls,0);
});
