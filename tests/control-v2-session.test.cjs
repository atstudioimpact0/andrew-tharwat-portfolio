'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {issueStaffSession,authenticateStaffSession,revokeStaffSession,parseCookie,cookieValue,SessionDenied}=require('../server/access-v2/session.cjs');

const now=1720000000000;
const identity=Object.freeze({verified:true,id:'ats-member',tenantId:'ats-org',role:'reviewer',issuer:'https://directory.example.test',subject:'zoho-sub-1'});
const approved=()=>({...identity,active:true});
function env(){
 const map=new Map();
 const store={
  async create(key,data){if(map.has(key))throw Error('duplicate session');map.set(key,data);},
  async get(key){return map.get(key)||null;},
  async delete(key){map.delete(key);}
 };
 return {map,store};
}
test('session cookie is host-only secure HttpOnly and SameSite; no Domain attribute',async()=>{
 const e=env();const started=await issueStaffSession({principal:identity,store:e.store,now});
 assert.match(started.token,/^[A-Za-z0-9_-]{43}$/);
 assert.match(started.setCookie,/^__Host-ats_v2=/);
 assert.match(started.setCookie,/; Path=\/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax$/);
 assert.doesNotMatch(started.setCookie,/Domain=/i);
 assert.equal(e.map.size,1);
 const raw=Array.from(e.map.keys())[0];
 assert.match(raw,/^[a-f0-9]{64}$/);
 assert.notEqual(raw,started.token);
 assert.doesNotMatch(JSON.stringify(Array.from(e.map.values())),new RegExp(started.token));
 assert.equal(parseCookie('__Host-ats_v2='+started.token),started.token);
});
test('active mapped staff can obtain a verified principal',async()=>{
 const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
 const staff=await authenticateStaffSession({cookieHeader:'foo=bar; __Host-ats_v2='+token,store:e.store,lookupStaff:async()=>approved(),now:now+1000});
 assert.equal(staff.verified,true);assert.equal(staff.id,identity.id);assert.equal(staff.role,'reviewer');
 assert.equal(Object.isFrozen(staff),true);
});
test('missing, malformed and ambiguous duplicate cookie cannot authenticate',async()=>{
 const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
 for(const cookie of [null,'','__Host-ats_v2=invalid','__Host-ats_v2='+token+'; __Host-ats_v2='+token,'other='+token]){
  await assert.rejects(authenticateStaffSession({cookieHeader:cookie,store:e.store,lookupStaff:async()=>approved(),now:now+1000}),SessionDenied);
 }
});
test('fixed two-hour TTL rejects expired session and deletes it',async()=>{
 const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
 await assert.rejects(authenticateStaffSession({cookieHeader:'__Host-ats_v2='+token,store:e.store,lookupStaff:async()=>approved(),now:now+7200000}),SessionDenied);
 assert.equal(e.map.size,0);
});
test('staff deactivation, role downgrade, subject change or tenant reassignment revoke session',async()=>{
 for(const staff of [{...approved(),active:false},{...approved(),role:'contributor'},{...approved(),tenantId:'another-org'},{...approved(),subject:'changed-identity'},null]){
  const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
  await assert.rejects(authenticateStaffSession({cookieHeader:'__Host-ats_v2='+token,store:e.store,lookupStaff:async()=>staff,now:now+1000}),SessionDenied);
  assert.equal(e.map.size,0);
 }
});
test('logout deletes session and expires browser cookie, then old token cannot be replayed',async()=>{
 const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
 const cleared=await revokeStaffSession({cookieHeader:'__Host-ats_v2='+token,store:e.store});
 assert.match(cleared,/__Host-ats_v2=; Path=\/; Max-Age=0; HttpOnly; Secure; SameSite=Lax/);
 assert.equal(e.map.size,0);
 await assert.rejects(authenticateStaffSession({cookieHeader:'__Host-ats_v2='+token,store:e.store,lookupStaff:async()=>approved(),now:now+1000}),SessionDenied);
});
test('no unapproved or spoofed identity can receive session',async()=>{
 const e=env();
 for(const p of [null,{...identity,verified:false},{...identity,role:'client'},{...identity,id:''},{...identity,subject:null}]){
  await assert.rejects(issueStaffSession({principal:p,store:e.store,now}),SessionDenied);
 }
 assert.equal(e.map.size,0);
});
test('missing/stale backend components fail closed',async()=>{
 const e=env();const {token}=await issueStaffSession({principal:identity,store:e.store,now});
 await assert.rejects(authenticateStaffSession({cookieHeader:'__Host-ats_v2='+token,store:e.store,lookupStaff:null,now:now+1000}),SessionDenied);
 await assert.rejects(authenticateStaffSession({cookieHeader:'__Host-ats_v2='+token,store:{},lookupStaff:async()=>approved(),now:now+1000}),SessionDenied);
});
