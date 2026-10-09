# AT STUDIO — Release A / RC15 Founder Case Pagination & Staging Readiness

**Date:** 10 October 2026  
**Existing branch:** `feat/ats-control-v2-zoho-auth-plan` / Draft PR #16  
**Status:** SOURCE + CI TESTED; **NO STAGING DEPLOYMENT, NO PRODUCTION CHANGE**.

## Purpose

RC14 allowed the Founder to choose a client without manually typing the case ID,
but stopped at 25 latest records. RC15 adds a single **Load more** button for
additional approved cases without changing the approved ATS user journey:

**Choose a client → Understand the problem → Known / Missing → One next human action.**

There is **no auto-pagination**, auto AI diagnosis, automatic customer message,
background paid service or creation of synthetic customer records in Staging.

## Implementation

- `server/access-v2/founder-case-index-rc15.cjs` — new, independent
  server-side Founder-only case index using **keyset pagination**
  (`ORDER BY c.updated_at DESC,c.id DESC`,
  `(c.updated_at,c.id) < ($2::timestamptz,$3::uuid)`). Tenant is ALWAYS
  supplied from a revalidated active Founder session, never query strings,
  browser headers, username or email. Every response is capped at 25 cases,
  fetched as `LIMIT 26` to derive `has_more`. Returns a strict subset
  (case UUID, display label, service, problem preview, analysis state, precise
  updated timestamp); **no email, phone, notes, attachments, bearer token
  or client secrets**.
- Continuation is a short-lived **5-minute HMAC-SHA256 signed cursor**
  with fixed body shape, exp, tenant+Founder identity digest, exact
  microsecond UTC timestamp and case UUID. HMAC has canonical Base64URL
  validation and constant-time verification. Tamper, expiry, wrong identity,
  revoked session, unsupported query and malformed page requests fail closed.
  Cursor is NOT an authorization token.
- The existing `server/access-v2/staging-runtime-rc8.cjs` now routes its
  case-list path to RC15 and derives the HMAC secret from the existing trusted
  32-byte encryption key through **HKDF with a distinct purpose string**;
  no new browser secret or token, and no hard-coded deployment key.
- The existing `control-v2-preview/founder-clients-rc14.js` now supports
  `next_cursor`, an explicit Load More request on the **same origin**,
  per-page JSON/MIME validation, deduplication, safe retry after temporary
  errors, complete list clearing after a 401/403, and abort/stale-request
  protection on refresh/dispose. Local search only filters **already loaded**
  records. No additional API call is triggered by typing or switching language.
- `control-v2-preview/founder-clients-rc14.html` / CSS now expose one
  accessible human-initiated **Load more** button. Original mobile, bilingual,
  premium ATS design remains.
- Existing `scripts/package-control-v2-offline.cjs` builds
  `founder-rc14-offline.html` containing **25 entirely fictional cases and
  2 more on manual pagination**. A click navigates to RC13's isolated
  `founder-rc13-offline.html`; no real API calls, auth, database, browser
  key, OpenAI or other paid provider. Portable bundle has CSP
  `connect-src 'none'` and an explicit FAKE CLIENT banner.
- New tests `tests/rc15-signed-keyset.test.cjs` and
  `tests/rc15-browser-pagination.test.cjs`, expanded offline packaging test,
  and all previous regression suites remain green.

## Verified evidence

1. **GitHub Actions [Auth regression #225](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38005364814)**:
   **SUCCESS, 211/211 PASS**, including cursor tamper/expiration,
   Founder/tenant isolation, exact 63-item mock traversal without duplicates,
   revoked/changed staff, race conditions, 401/403 data clearing, UI retrials,
   and offline build checks.
2. Portable preview generated at
   [ATS-Ultra-Premium-Offline-Review ZIP](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38005364814/artifacts/11651141653),
   `founder-rc14-offline.html` **76,317 bytes**, GitHub artifact expiry
   approximately **10 October 2026 23:38 UTC**.
3. **Real Supabase Staging read-only SQL** confirmed joins and timestamp
   formatting: `2026-10-10T17:08:34.654321Z`. Query for a nonexistent
   test tenant returned **zero rows, no SQL errors**. No staging data writes.
4. Previously verified: `ats_core.studio_case_tenant_scope` has **0**
   assignments. Production client records were **not** migrated or used.

## Non-negotiable release gates

- Actual real Zoho signed OIDC, MFA, issuer/subject Founder mapping, rotated
  Client Secret, PG connection, trusted HTTPS `staging.atstudioimpact.com`
  ingress/session and full browser end-to-end test remain **NOT DONE**.
- Source target does **not** deploy the Staging service, provide a Vercel
  API route, or register a DNS hostname. No main merge or Vercel Build.
- Before activating real cases, a trusted operator must explicitly approve
  which tenant each case belongs to. Never auto-map from client email/name.
- Current Staging indexes cover primary keys, **not the composite
  tenant + updated_at sort path**. Review query plan and propose justified
  covering indexes before scaling; no schema migration was made in RC15.
- Keyset is consistent for a fixed record ordering but **is not a snapshot
  across multiple requests**; concurrent edits to `updated_at` may move
  records. UI deduplicates loaded IDs; refresh may be needed to see changes.
- Page size is 25, not user-overridable; signed cursors expire in 5 minutes;
  expired cursors must be refreshed from the first page.
- Any legacy Production AI functions remain **separate** from the RC10
  staging default-DENY policy. Do not claim global cost enforcement.
- Browser UI needs visual/keyboard/multi-device UAT after an approved
  trusted preview host exists. Synthetic Node tests do not prove real login.
- No Vercel paid add-on, deployment, domain/DNS, Production SQL/Edge change,
  customer data movement, paid AI or billing authorization is implied here.

**AT Studio — Build what works.**
