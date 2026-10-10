'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {can,requireAccess,AccessDenied}=require('../server/access-v2/authorize.cjs');
const founder={verified:true,id:'founder-1',tenantId:'ats-1',role:'founder'};
const admin={verified:true,id:'admin-1',tenantId:'ats-1',role:'studio_admin'};
const reviewer={verified:true,id:'reviewer-1',tenantId:'ats-1',role:'reviewer'};
const contributor={verified:true,id:'worker-1',tenantId:'ats-1',role:'contributor'};
const client={verified:true,id:'account-1',clientId:'client-A',tenantId:'ats-1',role:'client'};
const caseA={id:'case-A',kind:'case',tenantId:'ats-1',clientId:'client-A',reviewerIds:['reviewer-1'],awaitingClient:true};
const caseB={...caseA,id:'case-B',clientId:'client-B'};
const proposalA={id:'proposal-A',kind:'proposal',tenantId:'ats-1',clientId:'client-A',status:'sent'};
const draftProposal={...proposalA,status:'draft'};
const taskA={id:'task-A',kind:'task',tenantId:'ats-1',assigneeId:'worker-1',reviewerIds:['reviewer-1']};

test('deny anyone without a verified trusted session',()=>{
 assert.equal(can({...founder,verified:false},'case:read',caseA),false);
 assert.equal(can({role:'founder',tenantId:'ats-1',id:'foo'},'case:read',caseA),false);
 assert.equal(can(null,'case:read',caseA),false);
 assert.equal(can({...founder,role:'made-up'},'case:read',caseA),false);
 assert.equal(can({...client,clientId:undefined},'case:read',caseA),false);
});

test('deny mismatched tenant, kinds, unknown actions and malformed resources',()=>{
 assert.equal(can(founder,'case:read',{...caseA,tenantId:'other'}),false);
 assert.equal(can(founder,'case:read',{...caseA,kind:'task'}),false);
 assert.equal(can(founder,'case:launch',caseA),false);
 assert.equal(can(founder,'case:read',{}),false);
 assert.equal(can(founder,'case:read',null),false);
});

test('founder may review and approve within their own tenant',()=>{
 assert.equal(can(founder,'case:read',caseA),true);
 assert.equal(can(founder,'proposal:approve',proposalA),true);
 assert.equal(can(founder,'payment:approve',{id:'pay-1',kind:'payment',tenantId:'ats-1'}),true);
});

test('admin cannot silently perform founder financial or final approval',()=>{
 assert.equal(can(admin,'case:read',caseA),true);
 assert.equal(can(admin,'proposal:prepare',proposalA),true);
 assert.equal(can(admin,'proposal:approve',proposalA),false);
 assert.equal(can(admin,'payment:approve',{id:'pay-1',kind:'payment',tenantId:'ats-1'}),false);
 assert.equal(can(admin,'staff:manage',{id:'staff-A',kind:'staff',tenantId:'ats-1'}),false);
});

test('reviewers only access assigned reviews, contributors only assigned tasks',()=>{
 assert.equal(can(reviewer,'case:read',caseA),true);
 assert.equal(can({...reviewer,id:'different'},'case:read',caseA),false);
 assert.equal(can(reviewer,'task:approve',taskA),true);
 assert.equal(can(contributor,'task:submit',taskA),true);
 assert.equal(can({...contributor,id:'different'},'task:submit',taskA),false);
 assert.equal(can(contributor,'proposal:approve',proposalA),false);
 assert.equal(can(reviewer,'payment:approve',{id:'pay',kind:'payment',tenantId:'ats-1'}),false);
});

test('clients cannot access another client’s data or private draft offers',()=>{
 assert.equal(can(client,'case:read',caseA),true);
 assert.equal(can(client,'case:read',caseB),false);
 assert.equal(can(client,'proposal:read',proposalA),true);
 assert.equal(can(client,'proposal:read',draftProposal),false);
 assert.equal(can(client,'proposal:accept',proposalA),true);
 assert.equal(can(client,'proposal:accept',{...proposalA,status:'accepted'}),false);
 assert.equal(can(client,'payment:read',{id:'pay',kind:'payment',tenantId:'ats-1',clientId:'client-A'}),false);
});

test('clients can only answer a case when ATS requested context',()=>{
 assert.equal(can(client,'case:answer',caseA),true);
 assert.equal(can(client,'case:answer',{...caseA,awaitingClient:false}),false);
});

test('requireAccess denies by default with a typed Forbidden error',()=>{
 assert.equal(requireAccess(founder,'case:read',caseA),true);
 assert.throws(()=>requireAccess(client,'case:read',caseB),e=>e instanceof AccessDenied&&e.status===403&&e.code==='FORBIDDEN');
});
