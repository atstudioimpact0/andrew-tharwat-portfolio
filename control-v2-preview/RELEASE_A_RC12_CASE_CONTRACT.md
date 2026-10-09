# AT STUDIO — RELEASE A RC12 / RC8 → RC11 DATA CONTRACT

**Date:** 10 October 2026  
**Existing branch:** `feat/ats-control-v2-zoho-auth-plan` — Draft PR #16  
**Runtime status:** CODE + MOCK CONTRACT; NOT DEPLOYED, NO REAL ZOHO LOGIN.

## Goal

Preserve AT Studio's real philosophy of understanding the customer's problem
before presenting a solution, while preventing the Founder from confronting
a crowded or ambiguous CRM screen.

`Client case → Core problem → Known context → Missing evidence → One human next action`

This is a continuation of RC8 (scoped server read), RC9/RC10 (AI side-effect
locks), and RC11 (simple bilingual client-view design). No new app.

## Actual RC12 code

- `control-v2-preview/founder-case-contract-rc12.js`: portable, pure
  `toCaseView(dto)` and `fromResponse(status, body, locale)`.
  Fails closed on untrusted source, missing identity/shape, or unknown action.
  Supports Arabic and English and only picks explicitly allowlisted RC8 fields.
  It does not fetch data, interpret HTML, store data, use tokens or invoke AI.
- `control-v2-preview/index.html`: loads the contract *before* the existing
  `control-v2.js` preview.
- `control-v2-preview/control-v2.js`: integrates an **illustrative** bilingual
  RC8 DTO fixture into the EXISTING Clients list; case view uses the same
  mapper as the future server DTO. Maintains exactly one appropriate CTA,
  collapsible decision history and human-only actions. A valid read-only
  state displays text without inventing an approval button.
- `scripts/package-control-v2-offline.cjs`: packs the bridge into the same
  single-file, network-isolated interactive HTML review artifact.
- `tests/rc12-case-workspace-contract.test.cjs`: view projection,
  provenance, missing fields, supported/unsupported actions, safe status
  handling, HTML/text isolation, browser global, and **the real RC8 handler**
  exercised with mock PostgreSQL and mock opaque sessions.

## VERIFIED exact Staging SQL next_action.kind values

Read-only inspection of
`ats_core.ats_read_case_workspace_v1(uuid)` in Supabase Staging project
`ktzjthouyrasawxqrrop` showed these emitted values:

| SQL kind | RC12 visual behavior |
| --- | --- |
| collect_evidence | Show one **Request context** human action |
| review_changes | Show one **Review direction** human action |
| review_error | Show one **Review direction** human action |
| review_ai | Show one **Review existing direction** (does not run AI) |
| review_completed_work | Show one **Review direction** human action |
| request_manual_diagnosis | Show **Review direction** only; no AI execution |
| diagnosis_running | Display read-only next step; no generating button |
| continue_work | Display read-only next step; no premature approval button |

Unrecognized codes and missing/empty next-action descriptions are
**non-actionable** (no CTA). The view never infers permissions from a browser
role, user email, client name, user-uploaded document or a textual statement.

`ats_core.ats_read_scoped_workspace_v1(uuid,text)` checks the private
`studio_case_tenant_scope` before calling `ats_read_case_workspace_v1`.
Its **tenant parameter comes solely from the RC8 verified server session**.
This remains a backend boundary; the UI contract is not authorization.

## API status interpretation

| HTTP status | Display state | Client data |
| --- | --- | --- |
| 200 with strict RC8 DTO | ready | Allowlisted fields only |
| 200 with malformed DTO | invalid_response | **No case data** |
| 401 | unauthenticated | **No case data** |
| 403 | forbidden | **No case data** |
| 404 | not_found | **No case data** |
| 503/500/network failure | temporarily_unavailable | **No case data** |

The response adapter is pure; turning error states into active browser
screen transitions belongs to the later authenticated Staging integration
and has NOT been represented here as live behavior.

## QA / constraints

- Node CI checks the real PR#16 RC8 handler, real session primitives,
  and synthetic database/session data. It does **not** prove a Zoho token
  or real PostgreSQL driver connection.
- GitHub Actions offline preview runs without Vercel, analytics, or
  external APIs; it embeds the original ATS brand identity.
- No Production/Stage schema mutation, no actual customer records,
  no new Vercel deployments or paid AI calls.
- No browser login is introduced in the mock preview.
- Source information is visibly marked as **unconfirmed client intake**.
  Known statements are not silently promoted to verified facts.

## Next release gates — DO NOT DEPLOY

1. Test UI loading/error states in a **real protected HTTPS Staging host**,
   with a trusted fixed origin, a secure cookie and RC8 server DTO.
2. Rotate the previously image-exposed Zoho Client Secret within owner's
   secure Zoho/Vercel settings, never in chat or Git.
3. Verify issuer/subject, PKCE/state/nonce, signed ID Token, correct tenant,
   revocation, 401/403/404/503 and empty-case behavior.
4. Desktop/mobile/RTL/LTR keyboard & screen-reader usability QA.
5. Keep Release A RC10 provider-generation kill switch server default-OFF.
6. Get explicit owner approval before Vercel Builds, deployment, billing,
   DNS changes, database Production modifications or PR merge.

**AT Studio — Build what works.**
