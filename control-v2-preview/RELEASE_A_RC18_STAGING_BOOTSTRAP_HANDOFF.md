# AT STUDIO — Release A RC18 / Fail-Closed Staging Bootstrap

**Date:** 10 October 2026  
**Repo:** `atstudioimpact0/andrew-tharwat-portfolio`  
**Branch:** `feat/ats-control-v2-zoho-auth-plan` (existing Draft PR #16)  
**Status:** SOURCE + SYNTHETIC CI VERIFIED. **NO DEPLOYMENT; NO REAL ZOHO LOGIN.**

## Founder outcome

Keep the approved ATS journey simple:

**Open Founder Control Room → Select client → Understand problem → Known / Missing → ONE human next step.**

RC18 does **not** add another dashboard or rewrite RC8–RC17. It creates
one server-only composition gate that connects the existing verified
pieces, refusing to start unless all private prerequisites are in place.

## Delivered

- `server/access-v2/staging-bootstrap-rc18.cjs`:
  - Accepts a **trusted injected** staging PostgreSQL pool,
    server-only Zoho settings/Client Secret, a canonical 32-byte AES key,
    maintained OIDC client, immutable asset reader and independent
    operator release attestations.
  - Validates the exact fixed Staging callback, vetted Zoho issuer,
    server-only configuration, origin and presence of required functions.
  - Runs a **read-only private Postgres capability probe BEFORE external
    Zoho OIDC discovery**. Checks the scoped index RPC and existing
    case-workspace RPC, service_role EXECUTE, anon/authenticated lack of
    EXECUTE, and existence of an approved active Founder in Staging.
    Fails with one generic non-sensitive error if any requirement fails.
  - Only after the private DB gate passes, asks the maintained OIDC
    client to discover Zoho's validated issuer/metadata.
  - Constructs existing `createStagingAuthRuntime`, `createPgStaffStore`
    and `createTrustedIngressRc16` with a fixed allowlist of approved
    HTML/CSS/JS assets; exports **only** a `handle` function and
    non-sensitive immutable release metadata.
  - Does not open an HTTP listener, modify DNS, deploy to Vercel,
    log/return credentials, persist secrets, enable paid AI or connect
    any Production customer information.
  - The attestation flags are *process checks*, not cryptographic proof
    of genuine Zoho credentials, a real HTTPS certificate, or browser
    authentication. A real end-to-end provider and browser test remains
    compulsory.
- `tests/rc18-staging-bootstrap.test.cjs` + `tests/rc18-private-first.test.cjs`:
  tests missing independent approvals, broken config/redirect, invalid
  AES, invalid issuer, private database failure, provider-discovery
  mismatch, restricted assets and server AI default-DENY with a
  synthetic Founder session. Uses only mocked Zoho discovery and PG.
- Shared `server/access-v2/rc17-zoho-origins.cjs` corrected to
  official Zoho Accounts data center URLs, notably Canada
  `https://accounts.zohocloud.ca`, plus UK
  `https://accounts.zoho.uk` and UAE
  `https://accounts.zoho.ae`, while preserving verified existing
  regions such as US/EU/IN/CN/JP/AU/SA.
  Reference: https://www.zoho.com/developer/oauth/multi-dc-support.html
  and https://help.zoho.com/portal/en/kb/directory/admin-guide/directory-stores/on-premises-directory-guides/articles/ip-domain-and-port-whitelisting-zd.

## CI

**[GitHub Actions Auth regression #247](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38043245339) SUCCESS — 243/243 tests, 0 failed.**

The preview build also passed; this verifies the **existing offline
client-selection demonstration**, not a live HTTPS Staging site.

## Actual Staging readiness audit (read-only)

| Requirement | Observed on 10 Oct 2026 |
| --- | --- |
| Approved active Founder in `ats_access_v2.staff` | **0** |
| Tenant-to-case assignments | **0** |
| Private `ats_list_scoped_case_index_v1` installed | **NO** |
| `staging.atstudioimpact.com` listed in Vercel ATS domains | **NO** |
| Draft PR #16 merged to main | **NO** |
| Real Zoho OIDC login / signed ID token / HTTPS browser E2E | **NOT TESTED** |
| RC10 server-side release-A paid AI gate | **STILL DEFAULT DENY IN BRANCH** |

**RC18 is deliberately NOT RUNNABLE against real Staging today**.
Installing code without the prerequisites would refuse to initialize.
This is preferred over broad database grants, fake authorizations or
accidental public login exposure.

## Release path requiring distinct owner approval

1. Confirm staging hosting cost, safe deployment path and rollback.
   Approve Vercel host/DNS/TLS setup only after cost review.
2. Review the RC16 `RC16_PRIVATE_CASE_INDEX_PROPOSAL.sql` with a
   database/security specialist, then explicitly authorize any Staging
   SQL installation. **No direct broad SELECT grant** on client tables.
3. Rotate the earlier exposed Zoho Client Secret *inside Zoho*, privately.
   Enter the updated Client ID/Secret only in a protected server
   environment after hosting scope is approved. Never paste into chat,
   Git, front-end, logs, URLs or client-side build variables.
4. Confirm the actual Zoho region from the owner's private Console.
   The OAuth application must register the *exact* callback
   `https://staging.atstudioimpact.com/api/v2/auth/zoho/callback`.
5. Confirm an authorized immutable OIDC `issuer+sub` Founder mapping.
   Do not assign access by email or generic domain.
6. Prepare a **synthetic, explicitly authorized** test case/tenant
   without copying customer data from Production.
7. Obtain a trusted private PostgreSQL connection. The main
   repository `package.json` currently does not declare `pg`
   or `openid-client`; a real hosting adapter must pin reviewed
   versions and update the lockfile separately before E2E execution.
8. Only in approved HTTPS Staging: test real Zoho OIDC signature,
   issuer/audience/nonce, PKCE/state, secure cookie, sessions,
   case index/scoped workspace, logout, 401/403/404, keyboard/mobile,
   Arabic/English, and the AI kill switch.
9. Require explicit owner UAT acceptance before merging or publishing
   to `https://atstudioimpact.com`.

**No action in RC18 changed Production, DNS, account credentials,
Staging schema, Vercel deployment or billing.**

**AT Studio — Build what works.**
