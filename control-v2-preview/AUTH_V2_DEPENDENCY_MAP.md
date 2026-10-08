# ATS Auth V2 — Verified Dependency Map

**Status:** engineering handoff, no implementation or production mutation
**Scope:** replace reliance on Supabase Auth and existing Trusted Device frontend-based secrets while keeping Supabase Postgres temporarily.

## Existing entry points confirmed in main
| Screen / File | Authentication / access mechanism | Migration risk |
|---|---|---|
| /admin/ → admin/admin.js | Trusted Device UUID/secret stored in browser localStorage; current Supabase client uses device ID + secret headers; client reads portfolio_trusted_devices directly | Must preserve founder control, prevent bypass, move secret and session verification server-side |
| /client-access/ → client-access/access.js | ATS-generated six-digit code → ats-client-code-login Edge Function → Supabase auth.verifyOtp using token_hash → studio_portal_access_context RPC | Rebuild one-time code verification and server session; preserve case-to-client mapping and 5-attempt/expiry behavior |
| /client-v9/ → client-v9/portal-live.js | Supabase auth.signInWithOtp, verifyOtp, studio_claim_client_by_verified_email, multiple direct table reads/writes | Verify email uniqueness and client ownership before migrating read/write endpoints |
| /auth-client.js | Shared browser-side Supabase session helper | Replace with browser fetches to server-side /api endpoints; prohibit privileged credentials in browser |
| /v9/v9-concierge.js | Anonymous Supabase client; public lead submission and related Edge Function requests | Keep public lead database flow temporarily pending separate hardening; **not** an identity migration in phase 1 |

## No-auth-in-browser target
- Static Control Room V2 pages load with zero secrets, no administrative data.
- Server endpoint checks a secure session **on every privileged request**; return 401 when not logged in and 403 when not permitted.
- Session cookie: Secure, HttpOnly, SameSite, signed/opaque, short lifetime, revocable, rotated on privileged changes.
- Founder/Admin: maintained auth library/provider with MFA or passkeys, recovery and trusted-device revocation. A device on its own is not sufficient identity verification unless verified by an approved secure enrollment process.
- Clients: safe passwordless code or link delivered through a policy-compliant transactional mail service (e.g. approved ZeptoMail). Harden with attempts, expiry, retry/rate limits, one-time consumption, abuse controls and no account enumeration.
- Keep PostgreSQL hosted on Supabase for now; database-backed session records are acceptable but must **not** use Supabase Auth or rely on an end-user Supabase JWT.
- Backend DB credentials must remain server-only and least privilege; sensitive actions (client ownership, project access, proposals, payment, admin approval) have explicit role/relationship checks.
- Public site and clients remain on existing login until migration pilot is proven and owner approves cutover. No silent switch.

## Minimum secure API contract (design, not implemented)
- GET /api/v2/auth/session — current user role, essential profile; no private secrets.
- POST /api/v2/auth/start — begin login (email or passkey), CSRF/rate limits.
- POST /api/v2/auth/verify — verify one-time challenge and create server session.
- POST /api/v2/auth/logout — revoke session and clear cookie.
- GET /api/v2/control/today — founder/admin summary, permission checked.
- GET /api/v2/cases — authorized client cases only.
- GET /api/v2/cases/:id — scoped case with known/unknown/decision context.
- POST /api/v2/cases/:id/request-info — founder review required; logged, idempotent; never automatically email without approved provider.
- POST /api/v2/cases/:id/decision — founder/reviewer audit trail.
- GET /api/v2/portal/context — only cases and projects belonging to the verified client.
- POST /api/v2/portal/answers — owner check, validation and audit.

These are interface intentions, not public routes to deploy.

## Pre-implementation gates
1. Verify current RLS policies, SQL SECURITY DEFINER functions, and trusted-device privileges. Do not remove RLS or public checks based on assumptions.
2. Select a vetted auth stack and storage schema, compare free tiers and operational costs, assess risk. Approval needed before adding paid services.
3. Make **isolated staging identity store and test accounts**, not real client sessions.
4. Implement restricted server-only service layer and tests (401, 403, CSRF, duplicate email, tenant leak, expired/reused code, missing rate limit, session revocation).
5. Build UI wiring for Control Room V2 and Client Access V2 in branch, with safe mock backend first.
6. Review accessibility, mobile, Arabic/English, timeout and recovery flows.
7. Rollback plan: retain previous login until acceptance; do not overwrite user identity records or invalidate active sessions without a tested migration.
8. Get founder approval for exact Production cutover, then migrate in measured rollout.

## Email
Zoho Mail receives/sends ordinary business correspondence. It does not deliver automated OTP under its published usage policy.
If mail-based login is required, select a dedicated approved transactional sender first; no fees or sending until approved.
See ZOHO_DNS_READINESS.md for DNS gap audit and required Zoho-specific MX/SPF/DKIM values.

## Prototype safety
/control-v2-preview/ has no login, no backend, no real clients and no calls to Supabase. It **must not** be connected to production data or promoted as an admin portal before auth architecture passes review.
