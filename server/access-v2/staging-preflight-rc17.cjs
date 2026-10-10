'use strict';
/**
 * AT Studio / RC17 confidential configuration preflight, Stage V2.
 * Evaluates only shape/presence, never makes network calls or DB queries.
 *
 * This module must NEVER return/log credential values, lengths, prefixes,
 * hashed credentials, DSNs, tokens, provider metadata or client identifiers.
 * Passing is NOT evidence of live Zoho token validation or TLS readiness.
 */
const {SUPPORTED_ZOHO_ORIGINS}=require('./rc17-zoho-origins.cjs');
const CALLBACK='https://staging.atstudioimpact.com/api/v2/auth/zoho/callback';
const CANONICAL_ORIGIN='https://staging.atstudioimpact.com';
const BOOLS=Object.freeze({true:'configured',false:'missing_or_invalid'});
const requiredString=(s,min,max)=>typeof s==='string' && s.trim()===s && s.length>=min && s.length<=max;
function validAES(value){
 return Buffer.isBuffer(value) && value.length===32 && !value.every(x=>x===0);
}
function validOidcAdapter(oidc){
 return !!oidc&&['randomPKCECodeVerifier','calculatePKCECodeChallenge',
   'buildAuthorizationUrl','authorizationCodeGrant'].every(k=>typeof oidc[k]==='function');
}
function inspectStageRc17({settings={},clientSecret,oidcEncryptionKey,pool,oidc,oidcConfig,
    secretRotatedVerified=false,callbackRegisteredVerified=false,
    trustedTlsVerified=false,founderIdentityVerified=false,
    scopedIndexRpcVerified=false}={}){
 // Caller may not simply set the *Verified flags* to true in the browser.
 // This is a PRIVATE server checklist: manual approvals must be evidenced
 // outside this shape-check. Never treat this result as auth authorization.
 const configured=[
  ['zoho_issuer_supported',SUPPORTED_ZOHO_ORIGINS.includes(settings?.issuer)],
  ['zoho_client_id_present',requiredString(settings?.clientId,3,300)],
  ['zoho_secret_present',requiredString(clientSecret,8,1024)],
  ['staging_callback_exact',settings?.callbackUrl===CALLBACK],
  ['oidc_encryption_key_32_bytes',validAES(oidcEncryptionKey)],
  ['private_pg_pool_supplied',typeof pool?.query==='function'],
  ['validated_oidc_adapter_supplied',validOidcAdapter(oidc)&&!!oidcConfig]
 ];
 const verified=[
  ['exposed_zoho_secret_rotated',secretRotatedVerified===true],
  ['zoho_callback_registered',callbackRegisteredVerified===true],
  ['trusted_https_staging_available',trustedTlsVerified===true],
  ['founder_immutable_identity_approved',founderIdentityVerified===true],
  ['private_scoped_index_rpc_approved',scopedIndexRpcVerified===true]
 ];
 const checks=[
  ...configured.map(([code,valid])=>Object.freeze({code,status:BOOLS[valid]})),
  ...verified.map(([code,valid])=>Object.freeze({
   code,status:valid?'operator_attested':'needs_independent_verification'
  }))
 ];
 const codeReady=configured.every(x=>x[1]) && verified.every(x=>x[1]);
 // In Release A, even complete configuration cannot self-attest actual
 // signed ID token exchange, device/browser E2E or release approval.
 return Object.freeze({
  release:'RC17',target_origin:CANONICAL_ORIGIN,
  checks:Object.freeze(checks),config_shape_ready:configured.every(x=>x[1]),
  operator_attestations_present:verified.every(x=>x[1]),
  eligible_for_controlled_live_test:codeReady,
  live_zoho_login_verified:false,production_release_authorized:false,
  ai_generation_enabled:false
 });
}
module.exports={inspectStageRc17,CALLBACK};
