# ATS Intelligence × Control Room V2 — Release A RC8

**Date:** 10 October 2026  
**Scope:** Existing Draft PR #16, `feat/ats-control-v2-zoho-auth-plan`  
**Status:** STAGING CODE CANDIDATE ONLY — **NOT DEPLOYED**, NO REAL FOUNDER LOGIN  
**Rule:** Continue what we built. Do not restart, merge or deploy automatically.

## Objective

One secure, passive journey:

`Verified Zoho identity → approved staff → hashed revocable session → tenant-scoped case GET → one next action`

Never start paid AI by opening a case or saving an answer.

## What was implemented on the existing feature branch

- `server/access-v2/zoho-directory-flow.cjs` — existing OIDC start/callback logic with state, nonce, PKCE and browser binding.
- `server/access-v2/zoho-accounts-oidc-adapter.cjs` — RC6 issuer-bound discovery provider adapter. Mocked discovery tests; real signed tokens **not yet verified**.
- `server/access-v2/pg-oidc-pending-encrypted.cjs` — RC4 SHA-256 state hash, AES-256-GCM PKCE/nonce envelope and one-time consume.
- `server/access-v2/rc5-auth-boundary.cjs` — RC5 staging-only start/callback/logout request boundary.
- `server/access-v2/pg-staff-store-rc8.cjs` — new real SQL adapter for existing V2 session API, approved identity mapping and revocation.
- `server/access-v2/founder-workspace-rc8.cjs` — new founder-only scoped read from `ats_core.ats_read_scoped_workspace_v1($1::uuid,$2::text)`. Tenant is from verified server-side session ONLY. Exactly one next action, no writes or AI.
- `server/access-v2/staging-runtime-rc8.cjs` — composition/dispatch only, deliberately **does not** create a listener, Vercel route or external endpoint.

## Verification evidence

- GitHub Auth regression #159 on `381109f56fd35c0524a1d6518db736514ea50c25` — **132/132 PASS** (Node tests; includes 15 new RC8 tests).
- Real isolated Staging PostgreSQL `ats_access_v2` schema inspected: staff/session columns and scoped read RPC signature match adapter.
- Actual Staging rollback-only SQL smoke: synthetic approved staff → conditional session insert → offboarding state → ROLLBACK. After rollback: **0 smoke staff**, **0 smoke sessions**.
- **NOT** a real HTTPS browser E2E, **NOT** a real connection through a deployed Node PG Pool, **NOT** a signed Zoho ID Token test.
- Initial `staff` and `sessions` in Staging were empty; never seed founder from email alone.

## Boundaries

1. No production SQL/Edge changes. Main and currently deployed website remain untouched.
2. No Vercel Build, Preview deployment, domain/DNS changes or billing approval.
3. No email, credential, tokens, public service key, genuine client data or paid AI.
4. Only founder role may read passive workspaces. The scoped SQL RPC enforces a second case/tenant mapping gate; unknown or wrong-tenant case produces 404.
5. Encryption key and client secret are injected into the *trusted runtime*, never checked into source or requested in chat.
6. The trusted HTTPS ingress **must construct the absolute request URL from a fixed configured staging origin**; never honor arbitrary Host or Forwarded headers.
7. Database role must be least-privilege; use real Supabase connection settings only through protected server secrets. The adapter itself neither provisions roles nor exposes DB credentials.
8. `service_role` may call the scoped workspace RPC but is not a browser credential. A dedicated least-privilege server identity is preferable before deployment.
9. No customer records were migrated to Staging; empty tenant mapping is deliberately fail-closed.

## Remaining release gates (NO-GO until all close)

- Owner rotates previously screenshot-exposed Zoho Client Secret, stores fresh value only in approved server secrets.
- Confirm real Zoho Accounts center/issuer, registered client metadata and **signed ID Token nonce behavior**. Do not disable nonce/state/PKCE validation for convenience.
- Provision pre-approved Founder identity by **verified issuer + immutable subject** in private Staging staff table, with MFA. Never infer role from email.
- Provide isolated real HTTPS `https://staging.atstudioimpact.com/api/v2/auth/zoho/callback` and secure backend routing. This subdomain is not currently verified in Vercel project domains.
- Add reviewed pinned runtime dependencies for a real token-verifying `openid-client` and a PostgreSQL adapter. Verify connection-mode and TLS requirements without paid add-ons.
- Full signed-provider callback → PG pending/session → protected scoped GET 401/403/404/200 → logout/revocation tests from browser, including mobile/RTL.
- Review and disable all old `admin/admin-unified.js` automatic AI/blueprint call paths **at call sites** before Release A goes live.
- Feature flag default-OFF, staged rollback path, founder UAT, explicit approval before any Vercel Build, GitHub merge or Production cutover.

**Next development action:** install and test a genuine provider/DB-backed HTTPS preview only after secrets and environment approvals; meanwhile keep code and tests on Draft PR #16.

**AT Studio — Build what works.**
