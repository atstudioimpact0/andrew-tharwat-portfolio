'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const {inspectStageRc17,CALLBACK}=require('../server/access-v2/staging-preflight-rc17.cjs');
function cfg(patch={}){
 const oidc={randomPKCECodeVerifier(){},calculatePKCECodeChallenge(){},
  buildAuthorizationUrl(){},authorizationCodeGrant(){}};
 return {settings:{issuer:'https://accounts.zoho.com',clientId:'synthetic-zoho-id',
  callbackUrl:CALLBACK},
  clientSecret:'RC17_TEST_SECRET_DO_NOT_USE',
  oidcEncryptionKey:crypto.randomBytes(32),
  pool:{query(){}},oidc,oidcConfig:{},...patch};
}
function name(r,key){return r.checks.find(x=>x.code===key)?.status}
test('RC17 requires real external readiness attestations even when code config has valid shape',()=>{
 const r=inspectStageRc17(cfg());
 assert.equal(r.config_shape_ready,true);
 assert.equal(r.operator_attestations_present,false);
 assert.equal(r.eligible_for_controlled_live_test,false);
 assert.equal(r.live_zoho_login_verified,false);
 assert.equal(r.production_release_authorized,false);
 assert.equal(r.ai_generation_enabled,false);
 assert.equal(name(r,'zoho_secret_present'),'configured');
 assert.equal(name(r,'trusted_https_staging_available'),'needs_independent_verification');
});
test('RC17 fake attestation flags cannot claim live Zoho login already tested',()=>{
 const r=inspectStageRc17(cfg({
  secretRotatedVerified:true,callbackRegisteredVerified:true,
  trustedTlsVerified:true,founderIdentityVerified:true,scopedIndexRpcVerified:true
 }));
 assert.equal(r.eligible_for_controlled_live_test,true);
 assert.equal(r.live_zoho_login_verified,false);
 assert.equal(r.production_release_authorized,false);
});
test('RC17 rejects wrong redirect, non-Zoho issuer, short secret and AES key',()=>{
 const r=inspectStageRc17(cfg({settings:{
  issuer:'https://evil.invalid',clientId:'id',callbackUrl:'https://atstudioimpact.com/api/v2/auth/zoho/callback'},
  clientSecret:'bad',oidcEncryptionKey:Buffer.alloc(32),
  oidc:null,oidcConfig:null,pool:null}));
 for(const key of ['zoho_issuer_supported','zoho_client_id_present',
  'zoho_secret_present','staging_callback_exact','oidc_encryption_key_32_bytes',
  'validated_oidc_adapter_supplied','private_pg_pool_supplied']){
  assert.equal(name(r,key),'missing_or_invalid',key);
 }
 assert.equal(r.config_shape_ready,false);
});
test('RC17 output never serializes any client ID, Client Secret, encryption key or DSN',()=>{
 const secret='RC17_MARKED_SECRET_SHOULD_NEVER_APPEAR';
 const r=inspectStageRc17(cfg({clientSecret:secret,
  settings:{issuer:'https://accounts.zoho.com',clientId:'SUPERPRIVATE_CLIENT_ID',callbackUrl:CALLBACK}}));
 const output=JSON.stringify(r);
 assert.doesNotMatch(output,/RC17_MARKED_SECRET_SHOULD_NEVER_APPEAR|SUPERPRIVATE_CLIENT_ID|DATABASE_URL|AES_KEY_B64URL/);
 assert.equal(typeof r.checks[0].code,'string');
});
test('RC17 CLI exposes status codes but never prints any credential and never claims success',()=>{
 const app=path.join(__dirname,'../scripts/rc17-staging-preflight.cjs');
 const secret='TEST_SECRET_VISIBILITY_RC17_DO_NOT_PRINT';
 const base64=crypto.randomBytes(32).toString('base64url');
 const run=spawnSync(process.execPath,[app],{
  encoding:'utf8',timeout:5000,
  env:{PATH:process.env.PATH,NODE_ENV:'test',
   ATS_V2_ZOHO_ISSUER:'https://accounts.zoho.com',
   ATS_V2_ZOHO_CLIENT_ID:'FAKE_PRIVATE_CLIENT_ID',
   ATS_V2_ZOHO_CLIENT_SECRET:secret,
   ATS_V2_ZOHO_CALLBACK:CALLBACK,
   ATS_V2_OIDC_AES_KEY_B64URL:base64}
 });
 assert.equal(run.status,2);
 assert.equal(run.stderr,'');
 const out=JSON.parse(run.stdout);
 assert.equal(out.code_only_preflight,true);
 assert.equal(out.ready_to_deploy,false);
 assert.equal(out.real_database_connection_tested,false);
 assert.equal(out.tls_and_dns_tested,false);
 assert.doesNotMatch(run.stdout,/TEST_SECRET_VISIBILITY_RC17_DO_NOT_PRINT|FAKE_PRIVATE_CLIENT_ID|[A-Za-z0-9_-]{20}\.[A-Za-z0-9_-]{20}/);
 assert.equal(name(out,'zoho_secret_present'),'configured');
 assert.equal(name(out,'private_pg_pool_supplied'),'missing_or_invalid');
});
