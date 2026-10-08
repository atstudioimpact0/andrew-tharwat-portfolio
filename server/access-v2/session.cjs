'use strict';

/**
 * ATS Access V2 server-only, opaque, revocable staff sessions.
 * STAGING LIBRARY — no HTTP routes, DB queries, auth-provider secrets, or live wiring.
 *
 * All session storage adapters must be durable/shared (NOT per-process memory).
 * Store keys are SHA-256 digests of random tokens, never raw bearer tokens.
 * Every protected request rechecks the active staff mapping from the database.
 */
const crypto=require('node:crypto');
const COOKIE_NAME='__Host-ats_v2';
const TOKEN_RE=/^[A-Za-z0-9_-]{43}$/;
const MAX_SESSION_SECONDS=2*60*60;
const DEFAULT_MAX_AGE=MAX_SESSION_SECONDS*1000;
const STAFF_ROLES=new Set(['founder','studio_admin','reviewer','contributor']);
class SessionDenied extends Error{
  constructor(){super('Session invalid');this.name='SessionDenied';this.status=401;this.code='UNAUTHENTICATED'}
}
function isId(x){return typeof x==='string'&&x.trim().length>0&&x.length<=300}
function sessionHash(token){if(typeof token!=='string'||!TOKEN_RE.test(token))throw new SessionDenied();return crypto.createHash('sha256').update(token,'utf8').digest('hex')}
function approvedIdentity(p){
  return !!p&&typeof p==='object'&&p.verified===true&&
    isId(p.id)&&isId(p.tenantId)&&isId(p.issuer)&&isId(p.subject)&&STAFF_ROLES.has(p.role);
}
function cookieValue(token,maxAge=MAX_SESSION_SECONDS){
  if(typeof maxAge!=='number'||!Number.isInteger(maxAge)||maxAge<0||maxAge>MAX_SESSION_SECONDS)throw new SessionDenied();
  if(token!=='' && !TOKEN_RE.test(token))throw new SessionDenied();
  // __Host prefix requires Secure + Path=/ and the absence of Domain.
  return COOKIE_NAME+'='+token+'; Path=/; Max-Age='+maxAge+'; HttpOnly; Secure; SameSite=Lax';
}
function parseCookie(header){
  if(typeof header!=='string'||header.length>8192)return null;
  const matches=header.split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE_NAME+'='));
  if(matches.length!==1)return null; // Duplicate session cookies are not acceptable.
  const token=matches[0].slice(COOKIE_NAME.length+1);
  return TOKEN_RE.test(token)?token:null;
}
function checkStore(store,names){if(!store||names.some(name=>typeof store[name]!=='function'))throw new SessionDenied()}
function checkTime(now){if(!Number.isFinite(now)||now<0)throw new SessionDenied()}
async function issueStaffSession({principal,store,now=Date.now()}){
  if(!approvedIdentity(principal))throw new SessionDenied();
  checkStore(store,['create']);checkTime(now);
  const token=crypto.randomBytes(32).toString('base64url');
  const record=Object.freeze({
    id:principal.id,tenantId:principal.tenantId,role:principal.role,
    issuer:principal.issuer,subject:principal.subject,
    issuedAt:now,expiresAt:now+DEFAULT_MAX_AGE
  });
  await store.create(sessionHash(token),record);
  // Never expose the private record or token in user-facing output/logs.
  return {token,setCookie:cookieValue(token)};
}
async function authenticateStaffSession({cookieHeader,store,lookupStaff,now=Date.now()}){
  checkStore(store,['get','delete']);checkTime(now);
  if(typeof lookupStaff!=='function')throw new SessionDenied();
  const token=parseCookie(cookieHeader);if(!token)throw new SessionDenied();
  const hash=sessionHash(token);
  const record=await store.get(hash);
  if(!record||!Number.isFinite(record.expiresAt)||record.expiresAt<=now ||
     !isId(record.id)||!isId(record.tenantId)||!isId(record.issuer)||
     !isId(record.subject)||!STAFF_ROLES.has(record.role)){
    if(record)await store.delete(hash);
    throw new SessionDenied();
  }
  // Deliberate per-request recheck: offboarded or downgraded members lose access.
  const staff=await lookupStaff({issuer:record.issuer,subject:record.subject});
  if(!staff||staff.active!==true||staff.id!==record.id||
     staff.tenantId!==record.tenantId||staff.role!==record.role||
     staff.issuer!==record.issuer||staff.subject!==record.subject){
    await store.delete(hash);throw new SessionDenied();
  }
  return Object.freeze({
    verified:true,id:record.id,tenantId:record.tenantId,role:record.role,
    issuer:record.issuer,subject:record.subject
  });
}
async function revokeStaffSession({cookieHeader,store}){
  checkStore(store,['delete']);
  const token=parseCookie(cookieHeader);
  if(token)await store.delete(sessionHash(token));
  return cookieValue('',0); // Always instruct browser to expire cookie.
}
module.exports={issueStaffSession,authenticateStaffSession,revokeStaffSession,parseCookie,cookieValue,SessionDenied};
