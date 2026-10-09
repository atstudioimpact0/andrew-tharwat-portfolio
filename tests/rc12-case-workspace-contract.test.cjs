'use strict';
/**
 * RC12 tests use the REAL RC8 endpoint module and a synthetic PG/session store.
 * No HTTPS listener, provider tokens, real tenants, network calls, DB writes or AI.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {issueStaffSession}=require('../server/access-v2/session.cjs');
const {createFounderWorkspaceRead}=require('../server/access-v2/founder-workspace-rc8.cjs');
const bridge=require('../control-v2-preview/founder-case-contract-rc12.js');
const source=fs.readFileSync(path.join(__dirname,'../control-v2-preview/control-v2.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../control-v2-preview/index.html'),'utf8');
const pack=fs.readFileSync(path.join(__dirname,'../scripts/package-control-v2-offline.cjs'),'utf8');
const id='83b5d6ae-73c4-42de-9f78-78c2c5100001';
const host='https://staging.atstudioimpact.com';
const issuer='https://accounts.zoho.com';
function dto(overrides={}){
 return {
   case_id:id,input_version:3,analysis_state:'collecting',
   intake_brief:{
     service:'Digital Studio',project_goal:'Understand customer request without guesswork',
     source:'unconfirmed_client_intake',current_assets:[],timeline:null
   },
   known:{current_state:'Requests are manually reviewed',impact:'Missed follow-ups',
     desired_outcome:null,evidence:null},
   missing_fields:['evidence'],supporting_upload_count:0,
   next_action:{kind:'collect_evidence',text:'Ask for a real client inquiry sample',task_hint:null},
   review_pending_count:0,active_work_count:0,
   tenant_id:'other-tenant-should-not-appear',email:'private@example.test',
   secret_key:'never-expose',internal_note:'not for screen',...overrides
 };
}
test('RC12 maps actual RC8 contract into existing RC11 case fields with only one action',()=>{
 const x=bridge.fromResponse(200,dto(),'ar');
 assert.equal(x.state,'ready');const m=x.caseView;
 assert.equal(m.id,id);assert.equal(m.status,'needs');assert.equal(m.action,'ask');
 assert.equal(m.problem.ar,'Understand customer request without guesswork');
 assert.match(m.missing.ar,/الدليل/);assert.match(m.missing.en,/evidence/i);
 assert.match(m.known.ar,/Requests are manually reviewed/);
 assert.equal(m.provenance,'unconfirmed_client_intake');
 assert.equal(m.inputVersion,3);
 assert.ok(!JSON.stringify(m).includes('private@example.test'));
 assert.ok(!JSON.stringify(m).includes('never-expose'));
 assert.ok(!JSON.stringify(m).includes('other-tenant'));
 assert.ok(!JSON.stringify(m).includes('not for screen'));
});
test('RC12 maps explicit founder review and unknown action safely',()=>{
 const yes=bridge.toCaseView(dto({next_action:{kind:'founder_review',text:'Review evidence'}}));
 assert.equal(yes.action,'review');assert.equal(yes.status,'review');
 const no=bridge.toCaseView(dto({next_action:{kind:'unexpected_paid_run',text:'run AI'}}));
 assert.equal(no.action,'none');assert.equal(no.status,'pending');
 assert.notEqual(no.next.en,'run AI','unknown action must not appear as a recommendation');
 const blank=bridge.toCaseView(dto({next_action:{kind:'collect_evidence',text:''}}));
 assert.equal(blank.action,'none','an empty actionable text must not produce a button');
});
test('RC12 does not invent evidence, project goals or a recommendation from missing data',()=>{
 const v=bridge.toCaseView(dto({
   intake_brief:{source:'unconfirmed_client_intake',service:null,project_goal:null},
   known:{current_state:null,impact:null,desired_outcome:null,evidence:null},
   missing_fields:null,next_action:{kind:'',text:''}
 }));
 assert.equal(v.action,'none');
 assert.match(v.problem.ar,/لم يوضح/);assert.match(v.known.ar,/لا توجد/);
 assert.match(v.missing.en,/current situation/i);
 assert.match(v.next.en,/No approved next action/);
 assert.equal(v.supportingUploadCount,0);
});
test('RC12 contract rejects malformed or untrusted source and wrong UUID',()=>{
 for(const input of [
   null,undefined,{},[],dto({case_id:'not-a-uuid'}),
   dto({intake_brief:{source:'AI-generated',project_goal:'fake'}}),
   dto({known:'unexpected'}),dto({next_action:null})
 ])assert.equal(bridge.toCaseView(input),null);
 assert.equal(bridge.fromResponse(200,{case_id:id},'ar').state,'invalid_response');
});
test('RC12 unauthorized API statuses never display the payload or implied client name',()=>{
 for(const [status,state] of [[401,'unauthenticated'],[403,'forbidden'],[404,'not_found'],[503,'temporarily_unavailable'],[500,'temporarily_unavailable'],[0,'temporarily_unavailable']]){
   const r=bridge.fromResponse(status,dto(),'en');
   assert.equal(r.state,state);assert.equal(r.caseView,null);
   assert.equal(typeof r.message,'string');assert.ok(r.message.length>8);
   assert.ok(!r.message.includes(id));assert.ok(!r.message.includes('private@example.test'));
 }
});
test('RC12 strips extra fields, limits text, and never interprets markup as HTML',()=>{
 const dangerous='<img src=x onerror=alert(1)>';
 const v=bridge.toCaseView(dto({
   intake_brief:{source:'unconfirmed_client_intake',project_goal:dangerous+'x'.repeat(3000),service:'x'.repeat(1000)},
   known:{current_state:dangerous,impact:null,desired_outcome:null,evidence:null},
   next_action:{kind:'collect_evidence',text:dangerous+'y'.repeat(700)}
 }));
 assert.equal(v.problem.en.length,1800);assert.equal(v.subtitle.en.length,160);
 assert.equal(v.next.en.length,400);assert.equal(v.known.en,dangerous);
 assert.doesNotMatch(source,/innerHTML\s*=|insertAdjacentHTML\(/);
});
test('RC12 local preview loads pure contract before existing V2 script and packs it offline',()=>{
 const contract=html.indexOf('founder-case-contract-rc12.js');
 const old=html.indexOf('control-v2.js');
 assert.ok(contract>0&&old>contract);
 assert.match(pack,/inlineJS\('founder-case-contract-rc12\.js'\)/);
 assert.match(html,/connect-src 'none'/);
 assert.match(source,/ATS_RC12_CASE\.fromResponse\(200,mockRC8\(true\),'ar'\)/);
 assert.match(source,/ATS_RC12_CASE\.fromResponse\(200,mockRC8\(false\),'en'\)/);
 const bridgeSource=fs.readFileSync(path.join(__dirname,'../control-v2-preview/founder-case-contract-rc12.js'),'utf8');
 assert.doesNotMatch(bridgeSource,/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|functions\.invoke|generateContent|new WebSocket/);
});
test('RC12 contract is available as a browser global without network access',()=>{
 const c={};c.globalThis=c;
 const bridgeSource=fs.readFileSync(path.join(__dirname,'../control-v2-preview/founder-case-contract-rc12.js'),'utf8');
 vm.runInNewContext(bridgeSource,c,{timeout:1000});
 assert.equal(typeof c.ATS_RC12_CASE?.fromResponse,'function');
 assert.equal(c.ATS_RC12_CASE.fromResponse(403,dto()).state,'forbidden');
});
function rc8Harness(){
 const sessions=new Map(),sqlLog=[];
 const staff={id:'founder-rc12',tenantId:'tenant-RC12',role:'founder',issuer,subject:'synthetic-sub',verified:true};
 let active=true,tenant='tenant-RC12',invalid=false;
 const store={
   async create(hash,rec){sessions.set(hash,rec)},
   async get(hash){return sessions.get(hash)||null},
   async delete(hash){sessions.delete(hash)}
 };
 const lookupStaff=async({issuer:iss,subject})=>
   iss===issuer&&subject===staff.subject?
   {...staff,active,tenantId:tenant}:null;
 const pool={async query(sql,args){
   sqlLog.push({sql,args});
   if(!sql.includes('ats_core.ats_read_scoped_workspace_v1'))throw Error('unexpected SQL');
   return {rows:[{workspace:args[0]===id&&args[1]==='tenant-RC12'?
     invalid?{unexpected:'private'}:dto():null}]};
 }};
 const read=createFounderWorkspaceRead({pool,sessionStore:store,lookupStaff});
 const request=(cookie='',caseId=id)=>({
   method:'GET',url:host+'/api/v2/founder/cases/'+caseId+'/workspace',headers:{cookie}
 });
 const login=async(role='founder')=>{
   staff.role=role;const issued=await issueStaffSession({principal:staff,store});
   return issued.setCookie.split(';')[0];
 };
 return {read,request,login,sqlLog,setActive:x=>{active=x},
   setTenant:x=>{tenant=x},setInvalid:x=>{invalid=x}};
}
test('REAL RC8 handler → RC12 case view for verified Founder and scoped tenant',async()=>{
 const x=rc8Harness(),cookie=await x.login();
 const response=await x.read(x.request(cookie));
 assert.equal(response.status,200);
 const present=bridge.fromResponse(response.status,response.body,'ar');
 assert.equal(present.state,'ready');assert.equal(present.caseView.action,'ask');
 assert.deepEqual(x.sqlLog[0].args,[id,'tenant-RC12']);
});
test('REAL RC8 rejects no session, wrong role, cross-tenant and malformed workspace',async()=>{
 const x=rc8Harness();
 let r=await x.read(x.request());assert.equal(r.status,401);
 assert.equal(bridge.fromResponse(r.status,r.body).caseView,null);
 const reviewer=await x.login('reviewer');
 r=await x.read(x.request(reviewer));assert.equal(r.status,403);
 assert.equal(bridge.fromResponse(r.status,r.body).state,'forbidden');
 const founder=await x.login('founder');
 x.setTenant('other-tenant');
 // Strict V2 session rechecks tenant assignment; old cookie is invalid.
 r=await x.read(x.request(founder));assert.equal(r.status,401);
 assert.equal(bridge.fromResponse(r.status,r.body).caseView,null);
 x.setTenant('tenant-RC12');
 const good=await x.login('founder');
 r=await x.read(x.request(good,'c03bf916-c954-4766-8735-311df2210002'));
 assert.equal(r.status,404);
 assert.equal(bridge.fromResponse(r.status,r.body).state,'not_found');
 x.setInvalid(true);
 r=await x.read(x.request(good));assert.equal(r.status,503);
 assert.equal(bridge.fromResponse(r.status,r.body).state,'temporarily_unavailable');
});
