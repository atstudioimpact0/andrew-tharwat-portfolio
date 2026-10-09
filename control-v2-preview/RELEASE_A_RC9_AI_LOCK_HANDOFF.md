# AT Studio — Release A RC9: Legacy AI Side-Effect Lock

**Date:** 10 October 2026  
**Branch:** `feat/ats-control-v2-zoho-auth-plan` | **Draft PR:** #16  
**Status:** CODE & CI VERIFIED; NOT MERGED OR DEPLOYED

## Problem and approved behavior

The earlier client-understanding workspace was too complex and unexpectedly
started AI diagnosis/blueprint generation while opening a case or saving
a discovery answer. Release A must prioritize:

**Open Client → Review Existing Evidence → Identify Missing Information → One Next Action → Human Decision.**

It must not generate new diagnosis, blueprint, or playbook work
just from viewing/saving a record. Founder approval and a server-authorized
Release B flow are required before new AI generation can resume.

## Changes in feature-branch legacy admin only

File: `admin/admin-unified.js`

- Added **default-ON Release A safety lock**, `LEGACY_AI_RELEASE_A_LOCK = true`.
- Guarded all three direct AI-generating function calls:
  - `ats-problem-solver` (diagnosis);
  - `ats-delivery-blueprint` (blueprint);
  - `ats-task-playbook` (playbook).
- Removed automatic background diagnosis / blueprint calls from
  `loadLeadDiagnosis` when opening a lead.
- Removed silent diagnosis invocation from `recordAdminDiscoverySignal`
  after saving information.
- Disabled legacy Run Diagnosis button with a clear paused label.
- Before advancing a pending task to `in_progress`, check whether an
  existing playbook is present. Without one, return without generating.
- Existing read-only results and approved evidence remain available
  in the legacy UI; no database migration or content deletion.

## Verification

- New `tests/rc9-legacy-ai-lock.test.cjs` tests guard ordering,
  disabled automatic call sites, missing playbook handling, and simulated
  browser click rejection of an explicit legacy analysis action.
- GitHub Actions **Auth regression #162 PASS, 136/136 tests**, commit
  `c64de1a424572f22f15f4d0c3a2e25ab6f3be083`.
- **No live production client/page was changed**: PR #16 stays draft.
- **No actual Zoho identity test or live HTTPS staging deployment.**

## Scope and remaining risks

This is a **frontend/feature-branch workflow safety guard**. It is not
an access-control boundary. A browser UI guard is insufficient against
direct calls to a deployed Supabase Edge Function or another client.
Production AI usage is not proven stopped. Before any rollout:

1. Keep all AI generation **server-default-deny** unless the verified
   founder specifically requests a paid action and the backend authorizes
   it. No automatically launched calls from load/save hooks.
2. Instrument and audit outbound generating requests at the backend
   with user/action/case/cost evidence, budget quotas, and rate limits.
3. Review all other call sites and async triggers in *all* old client
   and task routes (not only `admin/admin-unified.js`).
4. Preserve the separate RC8 founder-only passive workspace and
   scoped server reads as the Release A destination.
5. Rotate screenshot-exposed Zoho Client Secret; verify actual OIDC issuer,
   signed ID token/nonce, trusted HTTPS callback, real database session,
   offboarding and 401/403/404/200 cases.
6. Obtain explicit owner approval before any Vercel build/deployment,
   database production edits, merge or billing change.

The documented PASS is **CI correctness for the checked-in code and
synthetic tests**, not operational production readiness.

**AT Studio — Build what works.**
