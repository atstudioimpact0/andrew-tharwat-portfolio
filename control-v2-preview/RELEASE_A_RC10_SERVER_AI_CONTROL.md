# AT Studio — RC10 Server-Side AI Control | Release A

**Date:** 10 October 2026  
**Branch:** `feat/ats-control-v2-zoho-auth-plan` / Draft PR #16  
**Production approval:** NOT GRANTED. Release A is non-generative by design.

## Why this change exists

The AT Studio Founder needs a simple journey:
**Client Intake → Evidence → Understand → One Next Action → Human Decision.**

The legacy Admin UI could previously launch Gemini analysis as a side effect
of opening a client, saving an answer, or viewing a missing playbook.
RC9 blocked those calls on the *feature-branch browser side*.
RC10 adds an independent **server-side default-DENY** to the *new V2 staging
runtime*, not a browser flag.

## Verified state from read-only inspection (10 October 2026)

Live Supabase Production project `sivyynuhluhvjcdicwxn` lists these functions as
ACTIVE and `verify_jwt=false` at the platform gateway:

| Legacy callable function | Checked version | App-code authorization actually inspected |
| --- | ---: | --- |
| `ats-problem-solver` | 15 | Trusted-device credentials OR approved upload grant OR Supabase Auth user with lead email lookup |
| `ats-delivery-blueprint` | 6 | Trusted ATS device credentials in function code |
| `ats-task-playbook` | 5 | Trusted ATS device credentials in function code |

**Important:** `verify_jwt=false` does not, by itself, prove an endpoint is
open to all: their function code performs different authentication checks.
But they are currently separate from V2's Zoho/Founder session policy. They
can call Gemini when their own checks pass. RC9/RC10 staging-only code does
**not** change those live functions and must never be presented as a Production
billing kill switch.

Additional AI-generating functions exist in the wider Production project.
Do not claim the list above exhausts all AI usage. Full cost controls require
an inventory and enforced server-side gating of *every* generating endpoint,
including public-intake and HSE/product-specific flows where appropriate.

## Actual RC10 files

- `server/access-v2/ai-control-rc10.cjs` — immutable Release A deny gate.
  Accepts only a fixed HTTPS Staging origin, POST, CSRF Origin equality,
  a restricted route shape, real server-side opaque-session validation and
  Founder role. Returns HTTP 423 (`ai_paused_release_a`) for an otherwise
  eligible Founder; 401/403/404/405 for unauthorized or malformed requests.
  **There is deliberately no execution method or provider SDK in this module.**
- `server/access-v2/staging-runtime-rc8.cjs` — dispatches AI generation
  request paths to RC10 before any case read handler. Still no live listener.
- `tests/rc10-server-ai-control.test.cjs` — 12 negative/positive-denial
  regression cases including role spoof, malicious Origin, forged client
  approval, invalid case ID, session revocation, staff downgrade and routing.
- `admin/admin-unified.js` — unchanged RC9 browser-side legacy lock.

## Release A policy

- No automatic diagnosis, blueprint or playbook.
- No scheduled/backround paid AI on page open, status change or save.
- No browser-supplied role, budget, consent/approval, tenant or identity.
- No bypass through `force=true` or `x-ai-enabled` headers.
- Only verified, active Founder session may even reach the default-DENY result.
- Existing information/records remain readable through the RC8 scoped read.
- The V2 runtime is **not deployed**. A test pass isn't a live policy.

## Release B gate design: NOT YET IMPLEMENTED OR AUTHORIZED

Before generation is ever allowed, implement and TEST:
1. Authenticated Founder with MFA and bound server session, server-resolved
   case ownership and explicit action `diagnosis/blueprint/playbook`.
2. Manual click with a deliberate reviewed estimate and one-time expiring
   server-stored approval, not an auto-run or request header.
3. An atomic persistent budget reservation (monthly cost cap, per-case cap,
   concurrent-use guard, idempotency key, rate limit) **before** provider calls.
4. Usage metering/audit with provider/model/tokens/estimated/actual cost
   and human approvals; release unused reservations on failed requests.
5. Revocation and fail-closed behavior when budget store/audit/identity
   is unavailable, including race/parallel attempt tests.
6. Existing legacy Supabase Edge Functions migrated to equivalent server
   controls or separately disabled, with owner approval and rollback.
7. Connected staging HTTPS and real Zoho ID-token verification, no secret
   screenshots, no paid AI tests without cost approval.
8. Explicit founder acceptance of release, costs and production change.

## No-touch guarantees for this step

- No new Vercel Build/Deployment/paid add-on.
- No merge/main/site/domain changes.
- No Supabase Production SQL or Edge Function deployment.
- No Staging database schema migration or new staff identity.
- No Gemini or other paid model invocation.
- Zoho Client Secret from prior screenshot still needs private rotation before
  the first real login; not requested in chat.

**AT Studio — Build what works.**
