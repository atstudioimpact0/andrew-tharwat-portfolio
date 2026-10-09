'use strict';
/**
 * ATS Access V2 — STAGING-ONLY Zoho Accounts OIDC adapter.
 * No listener, environment reader, secret logger, public route or deployment.
 * The caller owns a trusted server-side secret manager and HTTPS ingress.
 * Passes a genuine openid-client v6 module via dependency injection.
 */
const SUPPORTED_ZOHO_ORIGINS = new Set([
  'https://accounts.zoho.com',
  'https://accounts.zoho.eu',
  'https://accounts.zoho.in',
  'https://accounts.zoho.com.au',
  'https://accounts.zoho.jp',
  'https://accounts.zoho.com.cn',
  'https://accounts.zoho.ca',
  'https://accounts.zoho.sa',
 ]);
class ZohoOidcConfigDenied extends Error {
  constructor(){super('Zoho OIDC configuration unavailable');this.name='ZohoOidcConfigDenied';this.code='OIDC_CONFIG_DENIED';}
}
function fail(){throw new ZohoOidcConfigDenied();}
function exactOrigin(value){
  if(typeof value!=='string')fail();
  let uri;try{uri=new URL(value)}catch{fail()}
  if(uri.protocol!=='https:' || uri.username || uri.password || uri.search || uri.hash ||
     uri.pathname!=='/' || value!==uri.origin)fail();
  return uri;
}
function requiredText(value,min=1,max=300){
  if(typeof value!=='string'||value.length<min||value.length>max||!value.trim())fail();
  return value;
}
/**
 * Use only the verified Zoho Accounts data center of the owner's real app.
 * Discovery checks the provider's reported issuer and does not use a manually
 * entered authorization/token/JWKS endpoint. Do not include client secrets in
 * logging, exception details, browser assets, query strings or tracked files.
 */
async function createZohoAccountsOidcAdapter({issuer,clientId,clientSecret,openidClient}){
  const issuerUrl=exactOrigin(issuer);
  if(!SUPPORTED_ZOHO_ORIGINS.has(issuerUrl.origin))fail();
  requiredText(clientId,3);requiredText(clientSecret,8,1024);
  const c=openidClient;
  for(const key of ['discovery','ClientSecretPost','randomPKCECodeVerifier',
                    'calculatePKCECodeChallenge','buildAuthorizationUrl','authorizationCodeGrant']){
    if(!c||typeof c[key]!=='function')fail();
  }
  let config;
  try{
    config=await c.discovery(issuerUrl,clientId,{client_secret:clientSecret},c.ClientSecretPost(clientSecret));
    const metadata=config?.serverMetadata?.();
    if(!metadata || metadata.issuer!==issuerUrl.origin)fail();
    for(const field of ['authorization_endpoint','token_endpoint','jwks_uri']){
      const endpoint=new URL(requiredText(metadata[field],12,1024));
      if(endpoint.protocol!=='https:' || endpoint.username || endpoint.password || endpoint.hash)fail();
      // Zoho's documented Accounts endpoints are on its selected DC origin.
      if(endpoint.origin!==issuerUrl.origin)fail();
    }
  }catch{fail()}
  return Object.freeze({
    oidcConfig:config,
    oidc:Object.freeze({
      randomPKCECodeVerifier:()=>c.randomPKCECodeVerifier(),
      calculatePKCECodeChallenge:v=>c.calculatePKCECodeChallenge(v),
      buildAuthorizationUrl:(cfg,params)=>c.buildAuthorizationUrl(cfg,{...params,response_type:'code'}),
      authorizationCodeGrant:(cfg,url,checks)=>c.authorizationCodeGrant(cfg,url,checks)
    })
  });
}
module.exports={createZohoAccountsOidcAdapter,ZohoOidcConfigDenied};
