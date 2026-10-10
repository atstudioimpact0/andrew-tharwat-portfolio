# ATS RC23 — Pilot Assignment Readiness & Controlled E2E Plan

**Date:** 2026-10-10  
**Continuation of:** [PR #22 — RC21 Isolated Operational Continuity](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/pull/22)  
**Status:** Source-only Draft, no production deploy, no Supabase writes.

## What the owner confirmed

The one existing Studio OS project and its ten Team Tasks are **test/pilot records**, not active client jobs. They are in the same Supabase instance as the live ATS site, so testing changes there is not a safe substitute for an isolated browser/staging test.

## Read-only real DB preflight — verified

| Observation | Count |
| --- | ---: |
| Projects / Domains / Team tasks | 1 / 4 / 10 |
| Active & available members | 3 |
| Tasks available vs assigned | 9 / 1 |
| Available tasks without another available qualified contributor besides their reviewer | 6 |
| Available tasks waiting on non-accepted prerequisites | 7 |
| Available tasks both unblocked and with independent candidate | 0 |
| Root tasks with no prerequisites | 3 |
| Direct dependency edges | 8 |
| Dependency cycles | 0 |
| Longest dependency walk | 6 nodes |
| Owner/reviewer clashes in existing assignments | 0 |
| Cross-project dependency edges | 0 |
| Token ledger events before testing | 3 |

**Interpretation:** The required skills do exist. However, for six available tasks the **assigned reviewer is the only currently available member with that skill at the required level**. The backend correctly prevents assigning a task to its own reviewer; a reviewer/owner separation must be resolved through the existing authorized editing workflow. The blocked dependency counts and reviewer conflict counts overlap: do not sum them as unique tasks.

## Three legitimate starting points

1. **Already assigned:** “اعتماد خريطة رحلة العميل النهائية” — `assigned`, no prerequisites. With the correct **employee account**, test Start → Submit Evidence → Reviewer Accept; do not impersonate the member or execute this directly as DB superuser. This can release one dependent task, provided its reviewer/owner eligibility is also resolved.
2. **Reviewer separation needed:** “تثبيت Order State وAdmin Handoff” — no prerequisites, but the only currently qualified available software contributor is its current reviewer. A Founder must explicitly choose a separate reviewer or approve the addition/training of another verified qualified contributor before assignment.
3. **Reviewer separation needed:** “تعريف معايير مراجعة القصة المخصصة” — no prerequisites, but the only currently qualified available content contributor is its current reviewer. Fix separation before assignment.

The remaining paths include:
- Order State → Deposit Confirmation → Story AI Eligibility → Story AI Mapping → Human Review/Safe Retry → Final Review/Approved/Production Ready.
- Order State → Error/Critical State Tracking.
- Assigned Customer Journey Map → Request-Friction Closure.
- Story Criteria and Human Review/Safe Retry → Final Review/Approved/Production Ready.

This graph is acyclic, not yet executable end-to-end with the current reviewer assignments.

## What RC23 adds (read-only)

- A compact, scoped **Assignment Preflight** in the existing Founder Team & Tasks page `/admin/team-tasks?project=<id>#team`.
- It reads only already-authorized, already-loaded Team Tasks, Member Skills, capacity, and dependency rows.
- It distinguishes: **ready to assign**, **reviewer/owner separation**, **dependency waiting**, and **skill/capacity blocking**.
- It names the first root blockers using safe DOM text nodes and preserves all existing Edit, Assign, Review, Team Wallet, and Founder return controls.
- It does not write to Supabase, alter RLS, generate Tokens, send notifications, or bypass existing RPC authorization.
- The module is loaded on **Founder Team** only, not the Employee login page.

**Automated evidence:** [GitHub Actions — RC23 tests](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38067257507) succeeded, including 85 tests overall at the latest RC23 test commit. Browser acceptance remains outstanding.

## Authenticated operational E2E — not yet executed

These actions need an authorized browser session and an approved isolated test plan.

1. Open existing Founder admin via the trusted-device gate, then the pilot project. Confirm project-scoped pulse and Domain view.
2. Open Team through the preserved navigation. Confirm readiness numbers match the authorized pilot snapshot.
3. In Founder settings, verify reviewer independence and the task's required skill/level **without making arbitrary role changes**.
4. Authenticate with an actual pilot employee account (OTP). Start the existing **assigned** task, submit synthetic, clearly marked evidence, and verify the action history.
5. Authenticate as its real reviewer; reject with a reason, then accept after resubmission. Never use the SQL admin connection to impersonate roles.
6. Read task events and Token Ledger: initial RESERVED, acceptance RELEASED + EARNED, no duplicates, and no EGP valuation.
7. Verify unlocked tasks remain subject to skills, reviewer distinction, capacity and any remaining prerequisites; no silent automatic assignment.
8. Verify Founder → Team → same authorized Project return, including invalid-link and rapid-switch behavior.
9. Check mobile layout, RTL labels, keyboard focus and actual permission-denied states.
10. Record before/after state, confirm no live customer emails, no paid AI, and prepare a reviewed rollback before a release decision.

## Non-negotiable release gate

**Do not merge PR #22 or deploy until** a real authorized browser passes the critical paths. Do not merge experimental PR #16. Do not apply direct SQL edits or token changes to Production-connected tables as a shortcut.

AT Studio — Build what works.
