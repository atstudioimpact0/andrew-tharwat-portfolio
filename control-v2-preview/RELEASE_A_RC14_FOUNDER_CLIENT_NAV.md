# AT STUDIO — Release A RC14 / Founder Client Case Navigation

**Date:** 10 October 2026  
**Repository:** `atstudioimpact0/andrew-tharwat-portfolio`  
**Working branch:** `feat/ats-control-v2-zoho-auth-plan` — existing Draft PR #16  
**Status:** Implemented in branch, **NOT DEPLOYED**.

## Why

The previous client-understanding flow became crowded and required too much
effort. RC11–RC13 prepared a clean Founder case reading screen but required
typing or knowing a UUID. RC14 adds **select the client → read the case**.

## Deliverables on the existing branch

- `server/access-v2/founder-case-index-rc14.cjs`: private case index GET
  `/api/v2/founder/cases`, requires a **valid, active, server-verified Founder
  session**. Server gets tenant exclusively from the verified opaque session.
  Fixed parameterized SQL joins:
  `ats_core.studio_case_tenant_scope`,
  `ats_core.studio_discovery_cases`,
  `ats_core.studio_leads`.
  Does not accept browser-supplied tenant, role, sort, limit or pagination.
  Read-only and capped to latest 25 cases; returns a transparent `has_more`
  indicator. No email, phone, notes, client uploads, financial data or tokens.
  Fail-closed empty/scope/auth/error cases and no-store response headers.
- `server/access-v2/staging-runtime-rc8.cjs`: routes exact
  `GET /api/v2/founder/cases` to RC14 **before** RC8 single-case dispatch.
  RC10 paid-AI default deny remains intact.
- `control-v2-preview/founder-clients-rc14.html`,
  `founder-clients-rc14.css`, `founder-clients-rc14.js`,
  `founder-clients-rc14-init.js`: ATS premium Arabic/English client picker.
  Same-origin `GET /api/v2/founder/cases`, no embedded JWT/secret,
  no browser-driven SQL query. Pure local search, one-click validated
  `/control-v2/cases/:uuid` to the previously built RC13 case view.
  Correct empty, 401/403/error and refresh handling; cleared cached case
  data immediately on retry; no HTML injection, AI or writes.
- `control-v2-preview/founder-staging-rc13.html` / `.js` / `.css`:
  bilingual `← All clients` link to return without UUID.
- `scripts/package-control-v2-offline.cjs`: adds
  `founder-rc14-offline.html` with **fictional** clients and
  **synthetic** responses, plus existing RC13 visual mock. Both are
  network-isolated using `connect-src 'none'`. Offline links connect
  the RC14 mock to the RC13 mock, not an actual server.
- `tests/rc14-founder-case-index.test.cjs`,
  `tests/rc14-founder-clients-browser.test.cjs` and expanded
  `tests/rc13-offline-package.test.cjs`: trust/tenant,
  role/offboarding/replay, output allowlist, limit, malformed data,
  browser auth errors, offline export, search and responsive flow.

## Grounded database findings — Staging, read-only

Supabase Staging project `ktzjthouyrasawxqrrop` has matching columns in
`ats_core.studio_case_tenant_scope`, `studio_discovery_cases` and
`studio_leads`; their tables have RLS enabled. The RC14 SQL structure
was verified with an actual read-only SELECT against that database,
using a test-only tenant ID and returned **0 rows without SQL errors**.

**The Staging case-scope mapping table has 0 rows.**
This is intentional fail-closed behavior for the project status:
a real Founder case list currently returns **no cases** until a
verified identity and authorized case-to-tenant assignments exist.
Do NOT copy Production customer data or assign cases arbitrarily.
The offline demo displays fictional clients only and is not evidence
of a seeded Staging environment.

## Strict deployment gates / honest limitations

1. **No real HTTPS Staging web host** yet. The live Vercel project does
   not presently have `staging.atstudioimpact.com` as a confirmed
   project domain, and no production/preview deployment was authorized.
2. Zoho real signed ID token validation, provider issuer/audience/nonce,
   OIDC code/PKCE/state, secret rotation, protected HTTP ingress and
   actual PG sessions must be validated in isolated Staging first.
3. A trusted operator must approve `staff` identity by immutable
   provider `issuer+subject`; next approve case-to-tenant mapping;
   never infer Founder from an email address or a browser-supplied tenant.
4. Current index returns **latest 25**, with a clear warning if more
   cases exist. Implement reviewed keyset pagination before treating
   it as a complete production client registry.
5. Responsive mobile/desktop/RTL/keyboard QA requires human browser
   review; current CI verifies behavior using simulated DOM and sessions,
   not a live authenticated browser.
6. Existing Production AI Edge Functions remain independently deployed;
   RC9/RC10 branch-only protections do not prove Production spending stopped.
7. No Vercel build, GitHub main merge, Production SQL/Edge change,
   domain/DNS changes, paid AI, customer emails, actual client data
   imports or billing changes without explicit approval.

**AT Studio — Build what works.**
