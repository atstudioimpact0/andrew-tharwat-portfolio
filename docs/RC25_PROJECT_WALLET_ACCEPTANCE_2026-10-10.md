# ATS RC25 — Project-Scoped Team Wallet & Browser Acceptance Handoff

**Date:** 2026-10-10  
**Review branch:** `feat/ats-rc21-operations-isolated-20261010`  
**PR:** https://github.com/atstudioimpact0/andrew-tharwat-portfolio/pull/22  
**State:** DRAFT · not merged · no production deployment

## Why this correction matters

RC21 already scopes the Founder Team's tasks and attention to the selected client project. In the original Team Wallet renderer, however, `rows.ledger` was counted globally in all Founder contexts. This could make a *single project's* reserved/earned totals look like the aggregate across all clients.

The real member and project permissions remain in Supabase RLS. RC25 is an additional **client-side display integrity fix**, not a new privacy boundary and not an accounting policy change.

## What changed

- When Founder opens `/admin/team-tasks?project=<authorized-id>#team`, Wallet calculations and the displayed event history only use `studio_token_ledger` entries with the same `project_id`.
- The selected project ID must also exist in the already-loaded Founder project list. Invalid or inaccessible project IDs render **zero event rows**.
- The standalone/global Founder Team view intentionally retains the full authorized ledger and its totals.
- The Member Wallet only includes events whose `member_id` matches the verified current member ID, complementing server RLS.
- The visible scope label prevents treating a client-specific total as a studio-wide balance.
- The contribution formula remains unchanged: RESERVED minus RELEASED = outstanding reservation; EARNED + BONUS = earned contribution. Tokens never represent EGP cash or a payable balance.
- The Team JS versions are now the same on Founder and Member routes (`engine.js?v=25`) so an old browser cache cannot silently keep previous Wallet behavior. Founder-only readiness JS/CSS also use version 25.

## Verification

Automated, source-backed tests cover:
1. Project A Wallet never includes Project B's contributions.
2. Invalid/unapproved project view exposes zero ledger events.
3. Founder global Wallet still includes all authorized entries.
4. Member A Wallet cannot display Member B's entries, even if mixed rows were provided.
5. Signed-out member context displays zero ledger events.
6. Existing server commands/event types remain unchanged.
7. Browser asset versions are aligned for Founder and Member; referenced files exist.

A separate **read-only production-connected Supabase audit** found:
- 10 pilot tasks, 1 assigned and 9 available.
- 2 RESERVED ledger entries totaling 40 tokens.
- 1 RELEASED entry totaling 20 tokens.
- 0 EARNED and 0 BONUS entries.
- Net outstanding reservation: **20 tokens**.
- Zero active-reservation mismatches, zero available-task leftover reservations, zero accepted-task reservation mismatches.

These observations describe the **pilot state at audit time**, not evidence that the real browser flow has been completed.

## Next human-operated browser acceptance

1. Open the Founder Team view through a previously approved Trusted Device. Check the project-scoped Wallet amount (20 outstanding, 0 earned at the snapshot) and event list.
2. Navigate to Founder global Wallet and verify that switching scope changes only the presented subset, without editing records.
3. Sign into the linked pilot owner's Employee Workspace and confirm only their ledger events appear.
4. Use the existing assigned **«اعتماد خريطة رحلة العميل النهائية»** task for Start → Submit → reviewer Rework/Accept on controlled test accounts; observe actual role checks, status transitions and ledger deltas.
5. On acceptance, expect a RELEASED and EARNED event for that *specific* task; do not predict final aggregates without taking a fresh pre-test snapshot.
6. Check project return, mobile, Arabic/RTL and keyboard use, and record evidence before considering any merge.

**Safety boundary:** No Supabase task mutations, permissions edits, token awards, authentication shortcuts, real client messages, AI charges, domain changes or Vercel deployments were performed as part of RC25. The separate Intelligence Staging DB is not configured for Team Operations and must not be assumed to support the workflow.

AT Studio — Build what works.
