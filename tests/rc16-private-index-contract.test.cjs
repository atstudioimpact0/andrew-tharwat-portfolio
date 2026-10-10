'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const proposal=fs.readFileSync(path.join(__dirname,'../control-v2-preview/RC16_PRIVATE_CASE_INDEX_PROPOSAL.sql'),'utf8');
const indexSource=fs.readFileSync(path.join(__dirname,'../server/access-v2/founder-case-index-rc15.cjs'),'utf8');
const ingressSource=fs.readFileSync(path.join(__dirname,'../server/access-v2/staging-ingress-rc16.cjs'),'utf8');
test('RC16 proposal declares private scoped RPC, never grants table-wide access',()=>{
 assert.match(proposal,/CREATE OR REPLACE FUNCTION ats_core\.ats_list_scoped_case_index_v1/);
 assert.match(proposal,/SECURITY DEFINER/);
 assert.match(proposal,/SET search_path TO pg_catalog, ats_core/);
 assert.match(proposal,/WHERE sc\.tenant_id=p_tenant_id/);
 assert.match(proposal,/ORDER BY c\.updated_at DESC,c\.id DESC/);
 assert.match(proposal,/LIMIT 26/);
 assert.match(proposal,/REVOKE ALL ON FUNCTION/);
 assert.match(proposal,/FROM PUBLIC, anon, authenticated/);
 assert.match(proposal,/TO service_role/);
 assert.doesNotMatch(proposal,/GRANT\s+(?:SELECT|ALL)\s+ON\s+(?:TABLE|ats_core\.)/i);
 assert.match(proposal,/DO NOT AUTO-APPLY/);
});
test('RC16 code uses private SQL RPC: no unauthorized broad Founder table SELECT',()=>{
 assert.match(indexSource,/FROM ats_core\.ats_list_scoped_case_index_v1\(/);
 assert.doesNotMatch(indexSource,/JOIN ats_core\.studio_|FROM ats_core\.studio_/);
 assert.match(indexSource,/principal\.tenantId/);
 assert.doesNotMatch(indexSource,/req\.query\.tenantId|req\.body\.tenantId|req\.headers\[['"]x-tenant/);
});
test('RC16 trusted ingress has no network listener and fail-closed route file allowlist',()=>{
 assert.match(ingressSource,/createTrustedIngressRc16/);
 assert.match(ingressSource,/authenticateStaffSession/);
 assert.match(ingressSource,/readStatic\(file\)/);
 assert.match(ingressSource,/requestTarget/);
 assert.doesNotMatch(ingressSource,/http\.createServer|https\.createServer|listen\(|vercel\/serverless|service_role/);
});
