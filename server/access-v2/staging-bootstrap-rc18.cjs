'use strict';
/**
 * AT Studio Release A RC18 — Staging application composition candidate.
 *
 * NOT A SERVER LISTENER. NOT DEPLOYED.
 *
 * Owner-provided secrets must arrive through an independently approved,
 * server-only secret store. Never use environment secrets in a web bundle.
 *
 * The builder will refuse to initialize if an external prerequisite has not
 * been independently attested, the private database RPC is missing, or OIDC
 * discovery does not verify the configured Zoho issuer.
 */
const {createZohoAccountsOidcAdapter}=require('./zoho-accounts-oidc-adapter.cjs');
const {createStagingAuthRuntime}=require('./staging-runtime-rc8.cjs');
const {createTrustedIngressRc16}=require('./staging-ingress-rc16.cjs');
const {createPgStaffStore}=require('./pg-staff-store-rc8.cjs');
const {inspectStageRc17,CALLBACK}=require('./staging-preflight-rc17.cjs');

class StageNotReady extends Error {
  constructor(){
    super('ATS Staging candidate cannot initialize');
    this.name='StageNotReady';
    this.code='STAGING_NOT_READY';
  }
}
function deny(){throw new StageNotReady()}
const ASSETS=Object.freeze(new Set([
 'founder-clients-rc14.html','founder-staging-rc13.html',
 'control-v2.css','premium.css','ultra.css','founder-case-rc11.css',
 'founder-staging-rc13.css','founder-clients-rc14.css',
 'founder-case-contract-rc12.js','founder-staging-rc13.js',
 'founder-staging-rc13-init.js','founder-clients-rc14.js',
 'founder-clients-rc14-init.js'
]));

function canonicalKey(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value))deny();
 let key;
 try{key=Buffer.from(value,'base64url')}catch{deny()}
 if(key.length!==32||key.toString('base64url')!==value||key.every(x=>x===0))deny();
 return key;
}
function checkAttested(evidence){
 if(!evidence||typeof evidence!=='object')deny();
 // Boolean attestations are release-process gates, NOT user authorization,
 // proof of real OIDC token validity, or substitutes for technical checks.
 const flags=['secretRotatedVerified','callbackRegisteredVerified',
   'trustedTlsVerified','founderIdentityVerified','scopedIndexRpcVerified'];
 if(!flags.every(k=>evidence[k]===true))deny();
}
function checkPrivateDatabaseResult(row){
 return row?.private_index_exists===true &&
  row?.private_index_service_exec===true &&
  row?.private_index_anon_exec===false &&
  row?.private_index_authenticated_exec===false &&
  row?.workspace_service_exec===true &&
  row?.workspace_anon_exec===false &&
  row?.workspace_authenticated_exec===false &&
  row?.founder_exists===true;
}
/**
 * Read-only probe. The connected role needs permissions to inspect
 * function privileges and the PRIVATE staff mapping. Nothing is mutated.
 * Do NOT expose this RPC check to a browser, including partial failure state.
 */
async function checkPrivateDatabaseRc18(pool,issuer){
 if(typeof pool?.query!=='function'||typeof issuer!=='string')deny();
 const SQL=
   "WITH f AS (SELECT "+
   "to_regprocedure('ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)') AS index_oid, "+
   "to_regprocedure('ats_core.ats_read_scoped_workspace_v1(uuid,text)') AS workspace_oid) "+
   "SELECT (f.index_oid IS NOT NULL) AS private_index_exists, "+
   "COALESCE(has_function_privilege('service_role',f.index_oid,'EXECUTE'),false) AS private_index_service_exec, "+
   "COALESCE(has_function_privilege('anon',f.index_oid,'EXECUTE'),false) AS private_index_anon_exec, "+
   "COALESCE(has_function_privilege('authenticated',f.index_oid,'EXECUTE'),false) AS private_index_authenticated_exec, "+
   "COALESCE(has_function_privilege('service_role',f.workspace_oid,'EXECUTE'),false) AS workspace_service_exec, "+
   "COALESCE(has_function_privilege('anon',f.workspace_oid,'EXECUTE'),false) AS workspace_anon_exec, "+
   "COALESCE(has_function_privilege('authenticated',f.workspace_oid,'EXECUTE'),false) AS workspace_authenticated_exec, "+
   "EXISTS(SELECT 1 FROM ats_access_v2.staff s "+
   "WHERE s.active=true AND s.role='founder' AND s.issuer=$1) AS founder_exists "+
   "FROM f";
 try{
  const result=await pool.query(SQL,[issuer]);
  if(result?.rows?.length!==1||!checkPrivateDatabaseResult(result.rows[0]))deny();
  return true;
 }catch{deny()}
}
/**
 * @param {Object} options only trusted server-side, never any browser input.
 * @param {Object} options.configuration no values printed or exported.
 * @param {Object} options.approval independent private operator attestations.
 * @param {Object} options.pool trusted server-only PostgreSQL pool.
 * @param {Object} options.openidClient actual openid-client v6-like implementation.
 * @param {Function} options.readAsset allowlisted immutable asset reader.
 */
async function createStagingCandidateRc18({
 configuration,approval,pool,openidClient,readAsset
}={}){
 if(!configuration||typeof configuration!=='object'||
    typeof readAsset!=='function'||typeof pool?.query!=='function')deny();
 checkAttested(approval);
 const settings=Object.freeze({
  issuer:configuration.zohoIssuer,
  clientId:configuration.zohoClientId,
  callbackUrl:configuration.zohoCallback
 });
 const key=canonicalKey(configuration.oidcKeyBase64Url);
 if(settings.callbackUrl!==CALLBACK)deny();

 let adapter;
 try{
  adapter=await createZohoAccountsOidcAdapter({
   issuer:settings.issuer,clientId:settings.clientId,
   clientSecret:configuration.zohoClientSecret,openidClient
  });
 }catch{deny()}

 const safe=inspectStageRc17({
  settings,clientSecret:configuration.zohoClientSecret,
  oidcEncryptionKey:key,pool,
  oidc:adapter.oidc,oidcConfig:adapter.oidcConfig,
  ...approval
 });
 if(!safe.config_shape_ready||!safe.operator_attestations_present)deny();

 // Refuse to build ANY live route if the user hasn't explicitly approved
 // a scoped private function and Founder identity on this staging DB.
 await checkPrivateDatabaseRc18(pool,settings.issuer);
 let runtime,ingress;
 try{
  runtime=createStagingAuthRuntime({
   pool,encryptionKey:key,settings,
   oidc:adapter.oidc,oidcConfig:adapter.oidcConfig
  });
  const store=createPgStaffStore({pool});
  const readStatic=async(name)=>{
   if(!ASSETS.has(name))deny();
   // The hosting adapter can only be given a finite, literal filename.
   const result=await readAsset(name);
   if(typeof result!=='string'||result.length===0||result.length>300000)deny();
   return result;
  };
  ingress=createTrustedIngressRc16({
   runtime,sessionStore:store,lookupStaff:store.lookupStaff,readStatic
  });
 }catch{deny()}
 // Export just the HTTP logic and a NON-SENSITIVE fixed release marker.
 // No configuration, secret, PG pool, key, OIDC instance or issuer in output.
 return Object.freeze({
  handle:ingress,release:'RC18',target:'trusted_staging_only',
  productionEnabled:false,aiGenerationEnabled:false
 });
}
module.exports={createStagingCandidateRc18,checkPrivateDatabaseRc18,StageNotReady};
