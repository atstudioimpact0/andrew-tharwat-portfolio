# AT STUDIO — Release A RC13 / Staging Founder Browser Read

**Date:** 10 October 2026  
**Repository branch:** `feat/ats-control-v2-zoho-auth-plan` / Draft PR #16  
**Release status:** SOURCE-CODE CANDIDATE + OFFLINE VISUAL MOCK, **NOT DEPLOYED**.

## Founder outcome

The Founder must be able to open ONE authorized case link and immediately see:

**Problem → Known / Missing evidence → One next human action → Optional context**

No client ID entry form, no cluster of overlapping actions, no automatic AI
analysis, no fake approval, and no claim that a user was contacted.

## Files implemented on original V2 branch

- `control-v2-preview/founder-staging-rc13.html` — separate *staging-targeted*
  page reusing the original RC11 ATS premium case styling.
- `control-v2-preview/founder-staging-rc13.css` — accessible bilingual responsive
  additions only; retains RC11 visuals.
- `control-v2-preview/founder-staging-rc13.js` — read-only browser controller
  with strict origin/UUID URL validation, credentialed **same-origin GET only**,
  `Accept: application/json`, `cache: no-store`, redirects blocked, JSON MIME
  check, 24k-character payload limit, explicit case ID equality, and the existing
  RC12 allowlisted DTO transform. Uses only `textContent` for values.
  Clears prior case instantly on refresh, ignores out-of-order requests,
  aborts on pagehide/dispose. 401/403/404/503 are safe, localized errors;
  no case data is rendered on error.
- `control-v2-preview/founder-staging-rc13-init.js` — staging page bootstrap.
  No secrets or username/role/auth in client code; HttpOnly cookie travels
  only with the browser to the same origin.
- `tests/rc13-founder-staging-browser.test.cjs` — 10 synthetic Node
  browser-contract checks (route, session errors, PII stripping, invalid
  response, stale read/abort, mobile UI dependencies).
- `scripts/package-control-v2-offline.cjs` — preserves prior RC11/RC12
  previews and **adds** `founder-rc13-offline.html` as a VISUAL DEMONSTRATION
  using a synthetic pre-baked backend response, with `connect-src 'none'`,
  an explicit offline/mock banner, no API or login.
- `tests/rc13-offline-package.test.cjs` — invokes the packer in a temporary
  directory and checks offline network isolation.

## Exact intended future hosting contract — NOT CONFIGURED

**Page URL:**
`https://staging.atstudioimpact.com/control-v2/cases/:case_uuid`

**Passive request:**
`GET /api/v2/founder/cases/:case_uuid/workspace`

Both must be served from the same trusted HTTPS Staging origin. The backend
must use RC8 verified opaque HttpOnly Founder session and tenant-scoped SQL
function. **The browser never supplies the tenant, role, or paid AI consent.**

A future protected router/rewrite may serve
`control-v2-preview/founder-staging-rc13.html` for the exact
`/control-v2/cases/:uuid` route, **only after** the staging HTTPS origin,
session validation, response headers and token-verifying OIDC flow are ready.
The current branch has deliberately NO Vercel rewrite, Edge Function,
HTTP listener, deployment or configured staging subdomain.

Set response security headers at the *trusted server*, not just the HTML
meta tag: `Cache-Control: no-store`,
`Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self';
connect-src 'self'; img-src 'self' data:; form-action 'none';
base-uri 'none'; frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`,
`X-Robots-Tag: noindex, nofollow`.
Do not reconstruct the origin from untrusted Host, Forwarded, or X-Forwarded
headers. Do not publish an unprotected case-list endpoint.

## CI and acceptance evidence

- [GitHub Auth regression #197](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38003306830)
  **SUCCESS 175/175** after RC13 browser/controller tests.
- [GitHub Auth regression #199](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38003450499)
  **SUCCESS 176/176** after adding the RC13 offline mock packaging test.
- RC13 preview generated: `founder-rc13-offline.html` (72,357 bytes) in
  [ATS Ultra-Premium Offline Review artifact](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38003450499/artifacts/11649643776).
  Link expires around 10 Oct 2026 23:15 UTC. It is a fake data / fake session
  visual test, **not an actual staging URL**.

## Open release gates

1. Staging origin **not present** in current Vercel project domains. No
   permission has been given to provision DNS, domain or Vercel deployment.
2. Rotate screenshot-exposed Zoho Client Secret privately in Zoho API Console
   and trusted server environment; never paste into chats or GitHub.
3. Real Zoho Accounts signed ID Token validation (issuer/audience/nonce) with
   state/PKCE, founder subject allowlist, MFA, cookie handling, session
   revocation and staging PostgreSQL pool need real integration tests.
4. The real Founder navigation needs a protected server-scoped **case index
   or deep link**. Do not require a nontechnical Founder to type UUIDs.
   RC13 is ready to consume a deep link; case selection service is separate.
5. Test the actual deployed page with desktop/mobile, RTL/LTR, keyboard,
   screen reader, expired cookie, wrong tenant, missing case and retries.
6. Legacy production Supabase AI Edge Functions remain independent of the
   V2 staging deny gate. Do not claim production AI usage has stopped.
7. Obtain explicit owner approval before any new build/deploy, merge, DNS
   or production database changes; preserve existing production rollback.

**AT Studio — Build what works.**
