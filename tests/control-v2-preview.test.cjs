'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..','control-v2-preview');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');

test('ATS Control Room V2 and Access V2 prototype JavaScript parses',()=>{
 for(const name of ['control-v2.js','access.js']){
  assert.doesNotThrow(()=>new vm.Script(load(name),{filename:name}));
 }
});

test('role preview includes all distinct authorized experiences',()=>{
 const html=load('access.html');
 for(const r of ['founder','team','client']){
  assert.match(html,new RegExp('id="role-'+r+'"'));
  assert.match(html,new RegExp('data-role="'+r+'"'));
 }
 assert.match(html,/role="tablist"/);
 assert.match(html,/role="tabpanel"/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate ID in access preview');
 assert.match(load('access.js'),/aria-selected/);
 assert.match(load('access.js'),/aria-labelledby/);
});

test('mock UI cannot send data, verify OTP, or authenticate',()=>{
 for(const name of ['control-v2.js','access.js']){
  const src=load(name);
  assert.doesNotMatch(src,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\s*\(|\bEventSource\s*\(/);
  assert.doesNotMatch(src,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(src,/\b(?:createClient|signInWithOtp|verifyOtp)\s*\(|\.rpc\s*\(|\.functions\.invoke\s*\(/);
 }
 const access=load('access.html');
 assert.match(access,/connect-src 'none'/);
 assert.match(access,/form-action 'none'/);
 assert.doesNotMatch(access,/<input\b|<form\b|<textarea\b/i);
 assert.doesNotMatch(access,/value="[^"]*(?:sk_live_|sb_secret_|password|token)[^"]*"/i);
 assert.match(access,/لا تسجيل دخول حقيقي/);
 assert.match(load('access.js'),/No live login/);
 assert.match(access,/DESIGN PROTOTYPE/);
});

test('prototype view links to isolated journey without changing live admin',()=>{
 const html=load('index.html');
 assert.match(html,/href="\.\/access\.html"/);
 assert.match(html,/data-i18n="accessPreview"/);
 assert.doesNotMatch(html,/href="\/admin\/"[^>]*data-i18n="accessPreview"/);
 assert.match(load('control-v2.js'),/accessPreview:'Preview the new access journey/);
});

test('access walkthrough never claims real account login',()=>{
 const code=load('access.js');
 assert.match(code,/No identity verification occurs/);
 assert.match(code,/End of preview/);
 assert.match(code,/No other client data/);
 assert.match(code,/server endpoints/);
 assert.match(code,/permissions/i);
});

test('prototype pages have a clear nonproduction warning and proper document language',()=>{
 const access=load('access.html'),control=load('index.html');
 for(const doc of [access,control]){
  assert.match(doc,/<html lang="ar" dir="rtl">/);
  assert.match(doc,/name="robots" content="noindex,nofollow"/);
  assert.match(doc,/PROTOTYPE/);
 }
 assert.match(load('access.css'),/@media\(max-width:570px\)/);
 assert.match(load('control-v2.css'),/@media\(max-width:760px\)/);
});


test('executive version has a real next action, not a decorative hero CTA',()=>{
 const html=load('index.html'),js=load('control-v2.js');
 assert.match(html,/class="executive-hero"/);
 assert.match(html,/id="hero-open-case"/);
 assert.match(html,/class="hero-title"/);
 assert.match(html,/href="\.\/premium\.css"/);
 assert.match(js,/\$\('#hero-open-case'\)\.addEventListener\('click'/);
 assert.match(js,/setView\('clients'\)/);
});

test('premium visual layer stays safe and viewports are accounted for',()=>{
 const premium=load('premium.css'),accessPremium=load('access-premium.css'),access=load('access.html');
 assert.match(premium,/EXECUTIVE EDITION/);
 assert.match(premium,/@media\(max-width:760px\)/);
 assert.match(premium,/@media\(max-width:410px\)/);
 assert.match(accessPremium,/@media\(max-width:760px\)/);
 assert.match(access,/href="\.\/access-premium\.css"/);
});

test('Zoho status is never represented as connected app authentication',()=>{
 const html=load('index.html'),js=load('control-v2.js');
 assert.match(html,/Zoho Mail/);
 assert.match(html,/Zoho Directory/);
 assert.match(html,/ZeptoMail/);
 assert.match(js,/zohoDirectoryStatus:'Team SSO · under evaluation'/);
 assert.match(js,/zohoZeptoStatus:'Customer verification mail · not enabled'/);
 assert.doesNotMatch(js,/https:\/\/accounts\.zoho|zoho\.oauth|zeptomail\.zoho/i);
});


test('client case workspace uses status-specific follow-up and local decision history',()=>{
 const html=load('index.html'),js=load('control-v2.js'),css=load('premium.css');
 for(const filter of ['all','needs','review','handled'])assert.match(html,new RegExp('data-case-filter="'+filter+'"'));
 assert.match(html,/id="case-journal-list"/);
 assert.match(html,/id="case-journal-title"/);
 assert.match(js,/state\.outcomes\.set\(state\.selectedCase,action\)/);
 assert.match(js,/action==='ask'\?'journalAsk':'journalReview'/);
 assert.match(js,/function caseLabel\(c\)/);
 assert.match(js,/state\.caseFilter='handled'/);
 assert.match(js,/state\.caseFilter='all';setView\('clients'\)/);
 assert.match(js,/awaitingInfo:'بانتظار رد/);
 assert.match(js,/directionReviewed:'مراجعة مسجلة/);
 assert.match(css,/\.case-detail\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(js,/closedCase:|status:'closed'|caseClosed:'Closed'/);
});
