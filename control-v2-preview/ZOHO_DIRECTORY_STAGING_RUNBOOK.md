# ATS Control Room V2 — Zoho Directory Staff SSO Pilot
**Status:** implementation scaffolding + tests available in feature branch. NO OIDC connection to a real Zoho tenant yet. NO route deployed. Do not use for Production login.

## Why this provider
Zoho Directory supports custom OIDC applications, providing a vendor-supported login for AT Studio founder/internal staff. Zoho Directory's public Free plan lists up to 10 users and 3 non-Zoho apps; account eligibility must be confirmed inside the owner's Zoho organization. We are not adding Zoho CRM as a database or using ordinary Zoho Mail to deliver automated OTP.

Official docs:
- https://help.zoho.com/portal/en/kb/directory/admin-guide/applications/add-applications/articles/adding-a-custom-oidc-app
- https://www.zoho.com/directory/pricing.html
- https://github.com/panva/openid-client/blob/main/examples/oidc.ts

## Current source
- Server-only, fail-closed OIDC start/callback transaction **logic**: \`server/access-v2/zoho-directory-flow.cjs\`
- Existing role/tenant and client-resource security policy: \`server/access-v2/authorize.cjs\`
- OIDC failure and replay tests: \`tests/zoho-directory-flow.test.cjs\`
- Authorization tests: \`tests/control-v2-authorization.test.cjs\`
- Preview design: \`/control-v2-preview/access.html\` (no sign-in form)

### Already coded (not yet wired to real APIs)
1. Restrict provider issuer and registered callback URLs to HTTPS.
2. Build an OIDC Authorization Code request with PKCE S256, random state and nonce.
3. Require durable atomic one-time transaction storage with 5-minute expiry.
4. On callback, validate exact callback origin/path and reject duplicated state, bad code and error returns.
5. Inject vetted OIDC client for signature/issuer/audience/nonce/state-verified code redemption; reject unexpected claims.
6. Look up an **explicitly approved ATS staff mapping** by immutable (issuer, subject), not email domain or Zoho display name.
7. Return server-side identity context only; caller must create/audit a revocable server session. No front-end role assignment.

**Not implemented:** Vercel function routes, shared durable state storage, actual OIDC discovery, real Zoho app credentials, token/session cookie issuance, logout, passkey policy enforcement, MFA configuration, database lookup, or live role assignment. Never mistake this skeleton for a finished login.

## Deployment wiring plan (requires owner approval and real Zoho tenant access)
**A. Verify plan and identity policy (NO billing changes):**
1. Visit Zoho Directory Admin Panel and check current plan, users, app slots and whether trial-to-paid renewal is active.
2. Confirm which internal employees should access ATS, and minimum roles.
3. Configure OneAuth/MFA for staff; set account recovery policy and disable unauthorized self-enrollment.

**B. Build isolated staging sign-in, not Production:**
1. Reserve a dedicated HTTPS staging hostname or path **before** registering Zoho Callback URL.
2. In Zoho Directory → App Management → Add Application → Create Custom App → OIDC; assign founder only initially.
3. Store Client Secret and runtime issuer/client ID/callback in **environment variables of staging only**, never GitHub, user chat, frontend code, logs or browser storage.
4. Add \`openid-client\` v6 (MIT) and use its official OIDC flow API on Node 22. Update package lock with normal CI-tested dependency installation. Do not invent authorization/token/JWKS URLs; use Zoho Directory's actual application-specific metadata and verify issuer.
5. Wire \`/api/staging/auth/zoho/start\` and \`/api/staging/auth/zoho/callback\` (PROPOSED; not existing) with HTTP-only Secure SameSite=Lax session-bound state cookie and durable pending transaction records.
6. Create a server-side mapping of approved Zoho Directory (issuer, sub) to ATS staff ID, tenant ID and role. Prevent automatic founder/staff creation by email. Link mapping only via documented owner/admin approval.
7. Issue a random opaque server session with short TTL, rotation, audit, explicit revoke/logout and account disable behavior. No use of Supabase Auth tokens.
8. Apply \`authorize.cjs\` to every admin/customer endpoint, with ownership fetched from the database under least-privilege credentials; reject all accesses without verified staff session.

**C. Tests required BEFORE any Production cutover:**
- Unassigned Zoho account cannot log into ATS.
- Expired/replayed/duplicated callbacks rejected; issuer, audience, nonce and PKCE invalid cases rejected.
- Forged role, email and "verified: true" never gain privileges.
- Team member cannot see founder billing or other client cases.
- Client portal is a **separate** ATS-owned login, not backed by 10-person Directory staff seats.
- Session revocation, offboarding, CSRF, device changes, recovery, rate limits, audit and mobile RTL UX verified.
- Obtain explicit founder go-live approval and rollback instructions. Old Production login remains working until this succeeds.

## Billing and operational constraints
**NO paid plans, trials, auto-renewal or credit recharges without explicit owner signoff.**
Avoid new DNS records, modifications to current website auth routes, and production database migrations in this pilot.
Zoho ZeptoMail for transactional mail is separate; its pricing/region and recharge status need review first.

## What the owner will need to do at the configuration gate
Once ATS *staging callback and backend storage are actually deployed and tested*, the owner can create the Zoho Directory app in its UI, inspect and approve the free-plan limits, and place credentials through an authorized secret-manager mechanism. Do not paste client secrets or passwords in the chat.
