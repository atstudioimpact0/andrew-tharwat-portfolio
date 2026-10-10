# AT STUDIO — Release A RC17 / Zoho Confidential Integration Readiness

**Date:** 10 October 2026  
**Working branch:** `feat/ats-control-v2-zoho-auth-plan` — existing Draft PR #16  
**Release decision:** NO-GO for live login or deployment. Code and mock tests only.

## Why RC17 exists

The Founder says their Zoho Console shows the Client ID / long Client Secret,
but will **not share private credentials in ChatGPT**. This is the correct
security boundary; no client credentials, screenshots or secret values
are required to maintain the code.

Do not confuse **Zoho App registered** with **Zoho login linked to ATS**.

## Work actually committed

- `server/access-v2/rc17-zoho-origins.cjs`: immutable shared Zoho Accounts
  data-center issuer allowlist, reused by actual OIDC adapter and preflight.
- `server/access-v2/staging-preflight-rc17.cjs`: private shape/checklist
  for exact Staging callback, OIDC client ID/secret presence,
  nonzero 32-byte AES key, private PostgreSQL pool object, and OIDC
  adapter shape, with separate operator-attested gates for rotated
  Client Secret, registered callback, HTTPS, approved immutable Founder
  identity and private index RPC. Outputs **status names only**, not
  credentials, key lengths/prefixes, DSN, claims or tokens. A passing
  structure cannot claim signed ID token verification, real TLS, or
  production authorization.
- `scripts/rc17-staging-preflight.cjs`: **offline, no-network and
  no-deploy command-line metadata checker**. Reads environment variables
  ONLY inside the trusted operator's environment, never echoes values
  and **always exits status 2 / ready_to_deploy:false**, because it
  cannot validate a real DB Pool, Zoho callback, staging domain or
  signed provider ID token. Never run with credentials in public CI.
  Environment variables expected if the operator chooses to run it
  privately:
  `ATS_V2_ZOHO_ISSUER`,
  `ATS_V2_ZOHO_CLIENT_ID`,
  `ATS_V2_ZOHO_CLIENT_SECRET`,
  `ATS_V2_ZOHO_CALLBACK`,
  `ATS_V2_OIDC_AES_KEY_B64URL`.
  These names are **proposed future server configuration**, not
  evidence that the Vercel project already uses them.
- `tests/rc17-confidential-readiness.test.cjs`: confirms invalid issuer
  and redirect are rejected, stage private-config status reports never
  echo secret values, independent go/no-go gates are explicit, and CLI
  output is safe.
- Existing `tests/rc8-staging-runtime-composition.test.cjs` extended:
  synthetic Zoho-style OIDC start → callback → AES-GCM pending state →
  opaque Founder cookie → RC16 authorized HTML → RC15 scoped case index →
  RC8 single case read → logout and revoke → callback replay rejected.
  Browser binding is checked with two separate mock browsers.
  **The OIDC provider is a test adapter, not real token signature
  validation.**

## Confirmed read-only account/platform state

- Vercel project `ats` currently lists Production/preview domains but
  **no `staging.atstudioimpact.com`** and no approved trusted HTTPS
  staging listener. No new builds/deployments initiated.
- Supabase Staging `ktzjthouyrasawxqrrop` read-only counts:
  `ats_access_v2.staff=0`, `ats_access_v2.sessions=0`,
  `ats_core.studio_case_tenant_scope=0`.
- `ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)`
  is **not installed**; remains a separate SQL proposal from RC16.
  This means currently deployed/private DB cannot serve the new
  Founder client list using RC15.
- No access to the owner's private Zoho application values was requested
  or attempted; app registration is reported by the owner only.

## Zero-exposure rule for Zoho

1. Client ID and Client Secret must **never** be pasted to chat,
   added to GitHub, added to static assets, or sent in URLs.
2. The Zoho Client Secret displayed in a previously shared image must be
   **rotated privately** before the first real login attempt.
3. Client ID/rotated Client Secret are inserted by the owner directly into
   the host's **encrypted, scoped server environment**, never in browser
   `NEXT_PUBLIC_` or code. Host/secret manager must be approved first.
4. The Authorized Redirect URI in Zoho must **exactly** match
   `https://staging.atstudioimpact.com/api/v2/auth/zoho/callback`.
   The configured Zoho data-center issuer must be the verified provider
   selected for the application.
5. Production and staging remain isolated; never copy Production
   customer records into Staging just to make the screen look populated.

## Staging launch requirements (all still NO-GO)

- Written owner approval for HTTPS staging domain/routing and any
  Vercel deployment/billable resources, with rollback decision.
- Explicit private review/approval of RC16 scoped case-index SQL before
  applying **only in Staging**. No broad service-role table SELECT grants.
- Trusted private server connection with real PostgreSQL session and
  pending transaction tables, no direct browser/service-role key exposure.
- Founder staff must be explicitly approved by immutable OIDC
  `issuer+sub` after real signed ID token validation; no email-only mapping.
- Signed OIDC issuer/audience/nonce/PKCE/state, browser binding, TLS and
  session revocation must be tested with the owner's real authorized
  account **without sharing secret values in ChatGPT**.
- Human browser test at desktop and mobile, Arabic/English, from login
  → clients → one case → logout. Real end-to-end success cannot be
  claimed from synthetic CI.
- RC10 server AI default-DENY must remain until separate paid-AI policy.
- Original Production services and legacy Supabase AI Edge Functions
  remain unchanged.

**AT Studio — Build what works.**
