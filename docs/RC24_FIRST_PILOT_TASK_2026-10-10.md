# ATS RC24 — First Real Pilot Task Handoff
**Date:** 2026-10-10
**Scope:** Continued RC21/RC23, no deployments, no database writes, no role impersonation.

## Confirmed source and database findings
- Pilot project and all 10 tasks are experimental (owner confirmed).
- An existing task is assigned, has no prerequisites, and is the correct first real Employee → Reviewer test path.
- The assigned owner **and its assigned reviewer both have linked sign-in accounts** (`auth_user_id` present, active). Sign-in has not been exercised in an authorized browser.
- Of three active Team members, two have a linked login and one is awaiting first verified login.
- Trusted-device table has 8 approved device records; this does **not** establish that the current browser is approved.
- Token Ledger already contains 3 events: 2 RESERVED and 1 RELEASED, with **zero EARNED**. These are existing pilot history and cannot be considered evidence of completed acceptance.
- ATS Intelligence Staging database has **none** of the four Team/Wallet tables inspected (`studio_project_tasks`, `studio_project_workstreams`, `studio_token_ledger`, `studio_team_members`). It is **not** an RC24 staging backend without separate isolated provisioning.
- GitHub PR #22 is unmerged source-only; live Vercel Production is still `main@1207adbd4`.

## RC24 implemented: Next Human Action
The existing Founder-only Assignment Preflight now shows one **human** next step, prioritized as:
1. Task under review: open the authorized task details; the real reviewer decides.
2. Assigned task with an owner and accepted prerequisites: open the existing task; the real contributor can start.
3. Task in progress: open task; employee submits evidence through existing actions.
4. An eligible available task: review assignment through original controls.
5. Unblocked reviewer-owner conflict: open the original Founder task editor, where reviewer separation is a manual, permissioned decision.

No auto-assign, auto-start, auto-submit, auto-accept, new RPC, or token mutation is introduced. The button delegates to the existing `data-team-action` handler (`details`/`task`). The module works only on the trusted Founder Team page and never impersonates the Member account.

**Automated tests:** https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38067744419 — tests of the next-step model and event wiring, as of that commit.

## Real two-role acceptance (pending actual browser)
Use *real permitted credentials* in authorized browser sessions; never share OTP/device secrets with a transcript. Never test with a customer identity or a real email message.

**Before any first write**
1. Reconfirm the selected project is marked PILOT and the assigned task's title, reviewer, and due date match the record in Founder Team.
2. Record counts for task statuses, team events, wallet events. Current baseline is 1 assigned, 9 available, 3 ledger events (2 reserved, 1 released, 0 earned).
3. Do not modify members, reviewers, tokens, due dates or dependencies merely to make a test pass.

**Employee (existing assigned task)**
4. Sign in through `/team-v9/` with the real assigned owner; ensure the task appears under My Work. Use existing `Start task`. Confirm the status switches from assigned to in_progress with an event.
5. Use `Submit for review` with a clearly marked test evidence note. Confirm status is review, text is preserved, and the original reviewer can see it.

**Reviewer**
6. Sign in as the task's **actual reviewer**. Confirm the assigned owner cannot self-accept.
7. Submit one controlled, explained `rework` if desired. Verify status in_progress; owner revises and resubmits.
8. Reviewer accepts the work only after verifying the test evidence; record the accepted event.

**Founder**
9. Confirm the project pulse and Team board show updated status; Wallet ledger should show **RELEASED + EARNED** linked to the accepted task. Never infer EGP payment from tokens.
10. Return from Team to the same authorized project; confirm Domain task totals and next human step refresh correctly.

**Safety:** These are real writes to the Production-connected database even though the records are pilot. Do not execute them through SQL superuser or simulate login. Do not authorize public release until actual role-based browser E2E, UI/RTL/mobile checks and rollback have passed.

## Test record acceptance template
| Stage | Role | Expected database side effect | Observed | Evidence |
|---|---|---|---|---|
| Start | Linked owner | status in_progress, task event | Pending | — |
| Submit | Linked owner | status review, submission + event | Pending | — |
| Rework | Linked reviewer | status in_progress + reason | Pending | — |
| Resubmit | Linked owner | status review + new evidence | Pending | — |
| Accept | Linked reviewer | status accepted + RELEASED/EARNED | Pending | — |
| Founder refresh | Approved device | Updated project pulse and Team | Pending | — |

**Release status: BLOCKED** until actual authenticated acceptance. No Vercel deployment or main merge requested.

AT Studio — Build what works.
