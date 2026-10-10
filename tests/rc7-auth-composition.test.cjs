'use strict';
/**
 * RC7 composition regression. Exercises ACTUAL PR#16 begin/finish/session modules,
 * RC4 encryption and RC5 HTTP request boundary in one flow.
 * PostgreSQL and OIDC token validation are MOCKED. Not browser/live Zoho E2E.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createPgOidcPendingEncrypted}=require('../server/access-v2/pg-oidc-pending-encrypted.cjs');
const {createRc5AuthBoundary}=require('../server/access-v2/rc5-auth-boundary.cjs');
const {beginStaffLogin,finishStaffLogin}=require('../server/access-v2/zoho-directory-flow.cjs');
const {issueStaffSession,authenticateStaffSession,revokeStaffSession}=require('../server/access-v2/session.cjs');

const origin='https://staging.atstudioimpact.com';
const issuer='https://accounts.zoho.com';
const callbackUrl=origin+'/api/v2/auth/zoho/callback';
const clientId='synthetic-zoho-client';
const settings={issuer,callbackUrl,clientId};
const fresh=()=>crypto.randomBytes(32).toString('base64url');
function setup({otherSubject=false}={}){
 const pendingRows=new Map(),queries=[];
 const pool={async query(sql,values){
   queries.push({sql,values});
   if(sql.includes('INSERT INTO ats_access_v2.oidc_pending')){
     if(pendingRows.has(values[0]))throw Error('duplicate');
     pendingRows.set(values[0],{
       verifier:values[1],nonce:values[2],browser_binding_hash:values[3],
       issuer:values[4],client_id:values[5],callback_url:values[6],
       expires_at:new Date(Date.now()+290000)
     });
     return {rows:[]};
   }
   if(sql.includes('DELETE FROM ats_access_v2.oidc_pending')){
     const row=pendingRows.get(values[0]);
     pendingRows.delete(values[0]);return {rows:row?[row]:[]};
   }
   throw Error('unexpected SQL');
 }};
 const pending=createPgOidcPendingEncrypted({pool,encryptionKey:crypto.randomBytes(32)});
 const storeRows=new Map();
 const sessionStore={
   async create(hash,record){storeRows.set(hash,record)},
   async get(hash){return storeRows.get(hash)||null},
   async delete(hash){storeRows.delete(hash)}
 };
 const staff={id:'staff-founder-01',tenantId:'ats-staging',role:'founder',issuer,subject:'zoho-sub-approved',active:true};
 const lookupStaff=async ({issuer:iss,subject})=>
   iss===staff.issuer&&subject===staff.subject?{...staff}:null;
 const oidc={
   randomPKCECodeVerifier:fresh,
   calculatePKCECodeChallenge:async()=>fresh(),
   buildAuthorizationUrl:(_cfg,params)=>new URL(issuer+'/oauth/v2/auth?'+new URLSearchParams({...params,response_type:'code'})),
   authorizationCodeGrant:async(_cfg,_url,checks)=>({claims:()=>({
     iss:issuer,aud:clientId,sub:otherSubject?'unapproved':'zoho-sub-approved',nonce:checks.expectedNonce
   })})
 };
 const auth=createRc5AuthBoundary({
   settings,oidc,oidcConfig:{},pending,
   beginStaffLogin,finishStaffLogin,
   issueSession:issueStaffSession,
   revokeSession:revokeStaffSession,
   authenticate:authenticateStaffSession,
   sessionStore,lookupStaff
 });
 async function start(){
   const result=await auth.start({url:origin+'/api/v2/auth/zoho/start',method:'GET',headers:{}});
   const state=new URL(result.headers.Location).searchParams.get('state');
   const cookie=result.headers['Set-Cookie'][0].split(';')[0];
   return {result,state,cookie};
 }
 const callback=async ({state,cookie})=>auth.callback({
   url:callbackUrl+'?state='+state+'&code=mock-code',method:'GET',headers:{cookie}
 });
 return {auth,start,callback,pendingRows,queries,storeRows,staff};
}
test('RC4 + RC5 + V2: begin stores ciphertext; callback issues revocable founder session',async()=>{
 const t=setup(),started=await t.start();
 assert.equal(started.result.status,302);
 const row=[...t.pendingRows.values()][0];
 assert.match(row.verifier,/^v1\./);assert.match(row.nonce,/^v1\./);
 assert.ok(!t.queries[0].values.includes(started.state));
 const redirect=new URL(started.result.headers.Location);
 assert.ok(redirect.searchParams.has('nonce'));
 assert.ok(redirect.searchParams.has('code_challenge'));
 const done=await t.callback(started);
 assert.equal(done.status,302);
 assert.equal(t.pendingRows.size,0);
 const session=done.headers['Set-Cookie'][0].split(';')[0];
 assert.match(session,/^__Host-ats_v2=/);
 const principal=await t.auth.requireFounder({url:origin+'/api/v2/founder/cases',method:'GET',headers:{cookie:session}});
 assert.equal(principal.role,'founder');assert.equal(principal.tenantId,'ats-staging');
 const logout=await t.auth.logout({url:origin+'/api/v2/auth/logout',method:'POST',headers:{cookie:session,origin}});
 assert.equal(logout.status,204);assert.equal(t.storeRows.size,0);
 await assert.rejects(t.auth.requireFounder({url:origin+'/api/v2/founder/cases',method:'GET',headers:{cookie:session}}));
});
test('Consumed callback fails closed on replay with no duplicate session',async()=>{
 const t=setup(),s=await t.start();
 assert.equal((await t.callback(s)).status,302);
 assert.equal((await t.callback(s)).status,401);
 assert.equal(t.storeRows.size,1);
});
test('Unapproved signed subject never receives an ATS session',async()=>{
 const t=setup({otherSubject:true}),s=await t.start();
 assert.equal((await t.callback(s)).status,401);
 assert.equal(t.storeRows.size,0);
});
test('Tampering with encrypted pending verifier fails closed',async()=>{
 const t=setup(),s=await t.start();
 [...t.pendingRows.values()][0].verifier='v1.tampered.invalid.cipher';
 assert.equal((await t.callback(s)).status,401);
 assert.equal(t.storeRows.size,0);
});
test('Cross-site POST logout is denied without revoking existing session',async()=>{
 const t=setup(),s=await t.start(),done=await t.callback(s);
 const cookie=done.headers['Set-Cookie'][0].split(';')[0];
 const result=await t.auth.logout({url:origin+'/api/v2/auth/logout',method:'POST',
   headers:{cookie,origin:'https://attacker.example'}});
 assert.equal(result.status,403);assert.equal(t.storeRows.size,1);
});
test('Staff offboarding revokes existing session at next protected read',async()=>{
 const t=setup(),s=await t.start(),done=await t.callback(s);
 const cookie=done.headers['Set-Cookie'][0].split(';')[0];
 t.staff.active=false;
 await assert.rejects(t.auth.requireFounder({url:origin+'/api/v2/founder/cases',method:'GET',headers:{cookie}}));
 assert.equal(t.storeRows.size,0);
});
