'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..','server','access-v2');
const sql=fs.readFileSync(path.join(base,'STAGING_ONLY_IDENTITY_SCHEMA.sql'),'utf8');
const session=fs.readFileSync(path.join(base,'session.cjs'),'utf8');
const oidc=fs.readFileSync(path.join(base,'zoho-directory-flow.cjs'),'utf8');

test('identity schema is explicitly staging-only and deny-by-default',()=>{
 assert.match(sql,/DO NOT APPLY TO PRODUCTION/);
 assert.match(sql,/CREATE SCHEMA IF NOT EXISTS ats_identity_v2/);
 for(const table of ['staff_identity','oidc_pending','staff_sessions','security_events']){
  assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS ats_identity_v2\\.'+table));
  assert.match(sql,new RegExp('ALTER TABLE ats_identity_v2\\.'+table+' FORCE ROW LEVEL SECURITY'));
 }
 assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA ats_identity_v2 FROM PUBLIC/);
 assert.doesNotMatch(sql,/GRANT\s+ALL\s+ON/);
 assert.doesNotMatch(sql,/CREATE\s+POLICY[^;]*(USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\))/i);
 assert.match(sql,/encrypted_payload bytea/);
 assert.match(sql,/session_hash char\(64\)/);
 assert.match(sql,/PRIMARY KEY \(issuer, subject\)/);
});
test('staff identity activation cannot occur without explicit approval',()=>{
 assert.match(sql,/active boolean NOT NULL DEFAULT false/);
 assert.match(sql,/staff_activation_requires_approval/);
 assert.match(sql,/approved_by IS NOT NULL AND approved_at IS NOT NULL/);
 assert.match(sql,/role IN \('founder','studio_admin','reviewer','contributor'\)/);
});
test('staging-only source does not ship with real credentials or external auth route',()=>{
 assert.match(oidc,/browserBindingHash/);
 assert.match(oidc,/browserMatches\(browserBinding,transaction.browserBindingHash\)/);
 assert.match(session,/__Host-ats_v2/);
 assert.doesNotMatch(oidc+session,/process\.env\.[A-Z]*SECRET|sk_live_|service_role|BEGIN PRIVATE KEY/);
 assert.match(oidc,/durable one-time pending-transaction store/);
});
