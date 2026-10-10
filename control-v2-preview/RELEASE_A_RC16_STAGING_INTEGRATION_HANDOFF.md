# AT STUDIO — RC16 Trusted Staging Integration & Private Case Index Preflight

**Date:** 10 October 2026  
**Existing Draft PR:** #16, branch `feat/ats-control-v2-zoho-auth-plan`  
**Release decision:** **NO-GO / NO DEPLOYMENT**. GitHub CI is green; real Zoho+HTTPS+PostgreSQL integration is **NOT done**.

## Why RC16

RC8–RC15 built protected Founder sessions, read-only workspaces, server-default-deny
AI, Founder client selection and signed keyset pagination. The user specifically
wants a usable, simple system, not indefinitely more disconnected screens.

RC16 integrates those modules behind a **fixed-origin trusted request boundary**
with local HTTP integration tests and performs a targeted audit of the **actual**
isolated Supabase Staging roles. No website was published.

## Source work actually committed

- `server/access-v2/staging-ingress-rc16.cjs`:
  strict expected origin `https://staging.atstudioimpact.com`. Callers pass
  a *raw request target* from trusted HTTPS ingress; never derive scheme/host
  from `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, or client-supplied
  Origin. Reject absolute URL, encoded path, dot segments, backslashes, hash,
  unsupported method and query. Dispatch `/api/v2/` to the existing V2
  runtime. Only serve the approved Founder index and case HTML and
  allowlisted CSS/JS assets after **current active Founder session** check.
  Strict JSON/HTML no-store, CSP, noindex, nosniff, referrer and permissions
  headers; redirect approved `/control-v2/` root to client selector.
  It does **not** open a listener, provision TLS, map DNS or deploy.
- `tests/rc16-trusted-staging-ingress.test.cjs`: 12 tests using the actual
  V2 session store, login/session issuance, RC15 index and RC8 case workspace
  backed by **synthetic** PostgreSQL adapter. Tests unauthorized static
  access, Host/Forwarded spoof, role change/offboarding, path traversal,
  no automatic AI; one test starts an ephemeral **HTTP LOOPBACK ONLY**
  server in GitHub Actions and performs real local `fetch` requests with
  a synthetic valid `__Host` cookie. This does NOT prove TLS.
- `control-v2-preview/RC16_PRIVATE_CASE_INDEX_PROPOSAL.sql`:
  review-only, **NOT RUN**. Defines `ats_core.ats_list_scoped_case_index_v1`
  private `SECURITY DEFINER`, fixed search path, hard tenant filter, stable
  26-row sorted result, microsecond timestamps, server `service_role`
  EXECUTE only, explicit REVOKE for PUBLIC/anon/authenticated. Must be reviewed
  and separately approved before any Staging installation. It does not
  widen `SELECT` permissions over the underlying client tables.
- `server/access-v2/founder-case-index-rc15.cjs`:
  switches from direct client-table SELECT to the proposed restricted
  `ats_core.ats_list_scoped_case_index_v1($1,$2,$3)` RPC. The caller still
  derives tenant solely from a checked server-side Founder session;
  signed pagination cursors remain intact.
- `tests/rc15-signed-keyset.test.cjs` and
  `tests/rc16-trusted-staging-ingress.test.cjs` updated to ensure RPC
  use; new `tests/rc16-private-index-contract.test.cjs` asserts
  deny-by-default SQL grants and no direct client-table SELECT.

## Real database audit — read-only only

Staging Supabase project `ktzjthouyrasawxqrrop`:

| Check | Observed |
| --- | --- |
| `ats_access_v2.staff` rows | **0** |
| `ats_access_v2.sessions` rows | **0** |
| `ats_core.studio_case_tenant_scope` rows | **0** |
| RLS on staff/sessions/scope/cases/leads | **enabled** |
| `service_role` reads/writes ATS private staff/sessions | Granted |
| `service_role` direct SELECT for scope/discovery cases/leads | **NOT granted** |
| `service_role` EXECUTE existing `ats_read_scoped_workspace_v1` | **true** |
| anon/authenticated EXECUTE existing workspace RPC | **false** |
| Proposed RC16 scoped index RPC | **not created or granted** |

Existing scoped case RPC is owned by `postgres`, `SECURITY DEFINER`,
restricted in `ats_core`, and limits access by tenant/case mapping.
The proposed index follows this security pattern but requires a
separate security review before installation.

Read-only `EXPLAIN` of the scoped index query confirms the current
plan has a sequential scan on the scoped mapping table and sorts
by updated_at/id. Table currently empty; do not extrapolate runtime
latencies. Evaluate composite tenant and sort-key indexes with a real
representative Staging dataset before scale. No index migration was made.

## Verified checks

**GitHub [Auth regression #233](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38030602014) SUCCESS; 226/226 PASS.**
Existing offline ATS UI packaging still succeeds. This is **mocked database
and mock identity + local HTTP**, not real signed Zoho tokens or deployed TLS.

## Still required for any real Staging release

1. Owner-approved isolated HTTPS `staging.atstudioimpact.com`, trusted routing
   integration, DNS and certificate (not yet provisioned or authorized).
2. Rotate the previously screenshot-exposed Zoho Client Secret privately;
   verify real signed issuer/audience/nonce/PKCE/state, MFA and immutable
   Founder issuer+subject mapping in an authorized test account.
3. Approve the narrowly-scoped private index SQL proposal; run database
   security/advisor review and then verify EXECUTE grants and tenant tests
   without copying Production data. Until created, real RC15 index will return
   503 from a missing RPC.
4. Use appropriate restricted server-only Postgres connection and validate
   session issuance/revocation, concurrent OIDC replay, all 401/403/404/503
   states and repeated pagination under real PG.
5. Approve synthetic test tenant and case mapping before manual assignment;
   Staging currently contains **none** and will show an empty list.
6. Review UI on actual desktop/mobile, Arabic/English, keyboard and
   screen-reader with a real protected staging browser.
7. Keep RC10 AI provider gate default-DENY and separately review independent
   legacy Production AI Edge Functions for paid usage.
8. Explicit owner approval before Vercel Builds/Deployments, DNS, staging
   DB writes/migrations, Production changes, paid services, or PR merge.

**AT Studio — Build what works.**
