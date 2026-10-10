# AT Studio — Release A RC11 | Founder Case Workspace UX

**Date:** 10 October 2026  
**Branch:** `feat/ats-control-v2-zoho-auth-plan` / Draft PR #16  
**Status:** MOCK-ONLY UX IMPLEMENTATION — **NOT MERGED OR DEPLOYED**

## What problem RC11 solves

The founder previously reported that "understanding the client" inside the website/system
was overloaded, confusing and prevented clear decisions. RC11 continues the **EXISTING**
Control Room V2 client list and UI identity rather than creating a fresh app or adding
complex backend functionality.

### Founder flow

1. Select client from the existing Clients list.
2. Read the **client's problem** first in an uncluttered navy section.
3. See **what we know** and **what is missing** side by side.
4. Receive **exactly one primary human action** — review direction OR ask for context.
5. Open **decision history** only if detail is useful (collapsed by default).
6. If a simulated action was already recorded, show a clear **followed up** indicator,
   not a false "case closed" or "client contacted" success.

Information provenance is explicitly marked **illustrative/unconfirmed**.
No fresh AI generation is offered or initiated.

## Existing files updated (no new application)

- `control-v2-preview/index.html`: responsive progressive case sections, clear
  provenance, single-action focus, optional accessible history, existing action dialog.
- `control-v2-preview/control-v2.js`: bilingual Arabic/English labels, only one
  displayed primary button according to case action, history collapsed on case
  change and handled-state feedback. All sample cases and existing navigation remain.
- `control-v2-preview/founder-case-rc11.css`: layered after original CSS,
  premium ATS navy/neutral/gold accent, RTL/LTR, keyboard focus, mobile
  responsiveness and reduced-motion support.
- `scripts/package-control-v2-offline.cjs`: includes the new RC11 layer in
  the existing self-contained design preview artifact.
- `tests/rc11-founder-case-ux.test.cjs`: six UI contracts, including mock DOM
  behavior for one action, case switch, sample follow-up, language labels,
  preserved hierarchy and offline/AI isolation.

**Proof requirement:** GitHub Actions `npm test` and portable preview generation.
Check latest successful run on PR #16 after the RC11 commits. UX remains a demo
until human visual QA on desktop, mobile, keyboard and bilingual direction.

## Crucial distinction from RC8

The RC8 authenticated endpoint is `GET /api/v2/founder/cases/:uuid/workspace`
with a server-filtered DTO and tenant-scoped database RPC. RC11's prototype
currently uses **hard-coded illustrative case entries**, as it did before RC11.
**RC11 is NOT wired to authenticated RC8 yet.** Merging the two requires a
real protected HTTPS staging environment, safe server-side session and DTO
binding, explicit UX test/approval and separate deployment authorization.

## Strict safeguards

- No usage of actual client names, email, files or production case IDs.
- No API calls, live analytics, local storage or sign-in within preview.
- The action dialog simulates a decision in ephemeral in-page memory only,
  never contacts a customer or approves an offer.
- No AI analysis / blueprint / playbook generation.
- No Production modifications, Supabase migrations or Vercel build/deployment.
- No GitHub merge to main. Existing brand identity preserved.

## Remaining acceptance gates

1. Visually inspect portable offline preview at ~375px, tablet and desktop widths;
   keyboard-only dialog/history and both language modes.
2. Remove all mistaken "completed" semantics from preview labels if UX reviewers
   interpret a simulated follow-up as real case closure.
3. Verify server-side RC8 DTO to RC11 read-only view model mapping, including
   empty states, explicit source, evidence, unknown vs assumption and 401/403/404.
4. Verify **real Zoho** login + HTTPS staging callback, keep RC10 AI kill switch
   server-side, rotate exposed Client Secret securely before real auth.
5. Explicit founder approval before any deployment, DNS, billing, production data
   changes or merge.

**AT Studio — Build what works.**
