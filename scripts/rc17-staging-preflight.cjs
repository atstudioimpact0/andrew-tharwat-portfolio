#!/usr/bin/env node
'use strict';
/**
 * Staging-only RC17 metadata preflight: never connects or prints secrets.
 * Use in an OWNER-CONTROLLED shell; do not paste the .env or its output
 * alongside credentials in a chat. This does not deploy anything.
 */
const {inspectStageRc17}=require('../server/access-v2/staging-preflight-rc17.cjs');
function keyFromB64(s){
 if(typeof s!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(s))return null;
 try{
  const b=Buffer.from(s,'base64url');
  return b.length===32&&b.toString('base64url')===s?b:null;
 }catch{return null}
}
const env=process.env;
const r=inspectStageRc17({
 settings:{issuer:env.ATS_V2_ZOHO_ISSUER,
  clientId:env.ATS_V2_ZOHO_CLIENT_ID,
  callbackUrl:env.ATS_V2_ZOHO_CALLBACK},
 clientSecret:env.ATS_V2_ZOHO_CLIENT_SECRET,
 oidcEncryptionKey:keyFromB64(env.ATS_V2_OIDC_AES_KEY_B64URL),
 // Deliberate: an environment variable is not a tested database Pool,
 // and importing a PostgreSQL module must not connect in this preflight.
 pool:null,oidc:null,oidcConfig:null
});
const safe={
 release:r.release,origin:r.target_origin,
 checks:r.checks,
 code_only_preflight:true,
 authenticated_live_session_tested:false,
 real_database_connection_tested:false,
 tls_and_dns_tested:false,
 ready_to_deploy:false
};
process.stdout.write(JSON.stringify(safe,null,2)+'\n');
// A nonzero exit is intentional until REAL, independently tested staging
// dependencies are connected; it does not mean existing Production failed.
process.exitCode=2;
