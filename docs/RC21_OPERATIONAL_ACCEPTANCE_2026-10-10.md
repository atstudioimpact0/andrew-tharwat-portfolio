# ATS — RC21 Operational Acceptance Handoff
**Audit date:** 2026-10-10  
**Branch:** `feat/ats-rc21-operations-isolated-20261010`  
**Review:** [PR #22](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/pull/22) · DRAFT · not merged  
**Production baseline:** `main@1207adbd4` · existing Vercel Production unchanged

## Goal
Complete the established **Founder → Client Project → Domain Lead → Team Task → Review → Founder** workflow without replacing the existing Studio OS, Client Portal, employee workspace, database tables or contribution ledger. No Zoho SSO migration is within scope.

## Source-level and synthetic automated verification (DONE)
- [x] Read-only RC21 project decision derives its counts and next human action only from the current authorized project's already-loaded records.
- [x] Project isolation: a response for project A arriving after project B cannot render A's data in B.
- [x] The project dialog closing during an in-flight load prevents acknowledging unread messages that were never shown.
- [x] Client replies are acknowledged only after messages are shown in the open project workspace. A failed acknowledgement does not claim messages were read.
- [x] Fetch failure does not produce a false healthy decision panel or a database write.
- [x] Founder deep-link resumes a valid project only after the existing Trusted Device gate and authorized list load; an unauthorized or malformed ID cannot open a project.
- [x] The existing /admin/team-tasks UI and #team activation are reused; Employee workspace is not given Founder return controls.
- [x] Founder Team / Board / Attention / task metrics stay scoped when entering from an authorized project. Return link appears only after an approved project list is loaded and is removed when an access refresh fails.
- [x] Isolated synthetic tests cover project-scoped task lists, global team view, valid/invalid return links and no duplicate link on refresh: https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38065868198
- [x] Established HSE, diagnosis/solution vs execution task, team command, evidence, review/rework, wallet and token-ledger objects are not overwritten by RC21.
- [x] Native JS regression tests passed in GitHub Actions: https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38064790334

## Read-only current operational consistency (OBSERVED)
All counts below represent the existing database at the audit time, NOT end-to-end browser proof, and not necessarily real-client delivery.

| Check | Observed |
| --- | ---: |
| Studio operational projects | 1 |
| Workstreams/domains | 4 |
| Workstreams lacking a lead | 0 |
| Team execution tasks | 10 |
| Tasks available/unassigned | 9 |
| Tasks assigned | 1 |
| Tasks in review / accepted | 0 / 0 |
| Tasks with past due dates | 10 |
| Earliest / latest task due date | 2026-10-03 / 2026-10-08 |
| Task-to-workstream cross-project inconsistencies | 0 |
| Contribution token ledger events | 3 |

**Pilot confirmed by the owner:** The existing project and all 10 tasks are experimental fixtures, not live customer deliverables. Past due dates are test dates (2026-10-03 through 2026-10-08), not evidence of client-service delays. The shared Production-connected Supabase project still hosts these fixtures, so no real database mutations, employee claims, token settlements, client messages, or task rescheduling are performed without a separate, controlled test plan.

## Real-browser / authorized acceptance remains REQUIRED
These are intentionally **not claimed as passed**:
1. Authenticate with an already approved Founder Trusted Device through `/admin/` (never enter an approval code into a public demo).
2. Open a project and confirm its domains, tasks, messages, files, and reviews are scoped correctly.
3. Rapidly open projects A and B (in a synthetic / isolated test fixture if multiple projects are required); inspect for stale details and read receipts.
4. From the project, select a Domain and launch `/admin/team-tasks?project=<approved-uuid>&domain=<approved-uuid>#team`. Verify only the intended project/domain is shown in that view.
5. Verify the `← Return to this project` link returns through the Founder gate and reopens the same authorized project; malformed/older project IDs fall back without disclosure.
6. Authenticate as a permitted employee in `/team-v9/`. Confirm no Founder return link appears and only the permitted tasks and reviews are actionable.
7. In a nonproduction fixture, complete PLAN → ASSIGN → DO → REVIEW → DONE, including valid evidence and a human rework scenario; confirm histories and token-ledger events match the approved actions.
8. Check mobile widths, keyboard navigation, Arabic/RTL and contrast in authenticated Founder/Team screens.
9. Retest the public client request → lead → approved diagnosis → project conversion → Client Portal review flow separately using consented test identities. Do not send real client messages as tests.
10. Confirm backup/rollback and production-release approval; only then consider merging PR #22, never PR #16 wholesale.

## Next safe decision
- **First:** pilot status is confirmed. Preserve the 10 existing tasks as repeatable acceptance fixtures, and separately document any intentional test writes.
- **Second:** authorized browser E2E test with real roles or segregated test fixtures.
- **Third:** only approved, minimal production promotion after all user-facing gates pass.

**Rules:** No unapproved deployment; no Supabase data writes, schema migration, role changes, token transfers, paid AI calls, billing, SMTP/Zoho switches, or actual client notifications. The separate **ATS Intelligence Staging** Supabase project is not automatically a safe RC21 test environment: do not assume tables, policies, users, or external integrations match Production.

AT Studio — Build what works.
