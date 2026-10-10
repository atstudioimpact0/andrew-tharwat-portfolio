# AT STUDIO — Existing Operational System ↔ Control Room V2 Integration Map
**Date:** 2026-10-10
**Source of truth:** checked the actual `main` GitHub source and `config.js` database project ref; READ-ONLY catalog/count checks in the database used by the site's current config. This document does not change Production.
**Work branch:** `feat/ats-control-v2-zoho-auth-plan` (Draft PR #16, never merge simply to expose demo routes).

## NON-NEGOTIABLE PRODUCT PRINCIPLE
**CONTINUE WHAT WE BUILT. DON'T RESTART WHAT WE APPROVED.**
**Problem → Understand → Assemble → Build → Real Solution.**
The founder needs *one clear next human action* and a reliable trace to the accountable employee, evidence, client decision and project outcome. Do not replace the mature working system with RC20's stripped-down read-only UX prototype.

## 1. Existing MAIN website modules (confirmed in code)

| Module | Located in | Current code capabilities |
|---|---|---|
| Operations / Founder Control Center | `/admin/`, `admin/admin-unified.js` | leads, diagnosis, solution tasks, project activation/conversion, delivery build, client updates, media, project reviews |
| Lead / Discovery | `studio_leads`, `studio_discovery_cases`, `studio_discovery_answers`, `studio_solution_tasks` | problem discovery, answers with source, root-cause→solution-task relationship, human review and activities |
| Project / Team Delivery | `studio_projects`, `studio_project_workstreams`, `studio_project_tasks`, `studio_team_members`, `studio_member_skills` | one accountable Domain Lead per workstream, team capacity/skills and task assignments |
| Team Workspace | `/team-v9/`, `/admin/team-tasks`, `team-v9/engine.js` | skill/capacity checks; PLAN→ASSIGN→DO→REVIEW→DONE; dependencies; reviewer; acceptance/rework; events/history |
| Contribution Tokens | `studio_token_ledger` | **reserved/released/earned/bonus** contribution events and member Wallet. These are NOT login tokens or AI API tokens. Existing UI states tokens have NO FIXED EGP VALUE; payout/settlement isn't generally available yet |
| Client Access | `/client-access/`, `admin/admin-unified.js` | separate one-time code via `studio_admin_issue_client_access_code`, client discovery replies, proposal actions and evidence uploads |
| Review / Files | `studio_messages`, `studio_files`, `studio_reviews`, `studio_revisions`, `studio_project_updates` | client communications, review versions/approvals, deliverables and activity trails |
| Existing access gate | `/admin/` and `portfolio_trusted_devices` | registered/pending/approved trusted devices, code-based approval. Do not conflate with employee membership or client access |
| ATS Intelligence extensions | `studio_diagnostic_runs`, `studio_delivery_blueprints`, `studio_task_playbooks`; edge functions `ats-task-playbook` etc. | evidence-oriented interpretation, delivery blueprint and task playbook; existing callable Production features require safety/cost review separately |
| ATS Control Room V2 candidate | Draft PR #16, RC8–RC20 | protected client-case read, founder list, case-known/missing/one next action, proposed Zoho OIDC; NOT a replacement for existing operational app |

## 2. Database reconciliation performed READ-ONLY

The LIVE website's `main` `config.js` points to project ref `sivyynuhluhvjcdicwxn` (Supabase project displayed as `DO`). It contains PUBLIC operational tables from the source above and their RPCs. On this date, aggregate counts (not personally identifying details) were:

- `studio_team_members`: 3
- `studio_project_workstreams`: 4
- `studio_project_tasks`: 10
- `studio_token_ledger`: 3
- `studio_task_events`: 9
- `studio_task_dependencies`: 8
- `portfolio_trusted_devices`: 14 registered rows (**NOT** 14 approved devices)

Confirmed existing RPCs: `studio_team_context`, `studio_team_command`, `studio_domain_command`, `studio_admin_assign_domain_lead`, `studio_admin_build_delivery_system`, `studio_admin_issue_client_access_code`, `portfolio_device_approve_code`.

Separate Supabase project `ktzjthouyrasawxqrrop` is **ATS Intelligence Staging** and contains the private `ats_core` case model; it does NOT automatically contain the current team's operational ledger or tasks. **NEVER point Production UI at Staging and assume tables or IDs match; no copying or wholesale migration without a mapped test.**

## 3. One coherent lifecycle

`Client inquiry / Lead`
→ `Discovery evidence / Problem / Root causes`
→ `Human-approved diagnosis and solution-task map`
→ `Delivery Blueprint / Proposal OR internal project decision`
→ `studio_projects` and `studio_project_workstreams`
→ `Domain Lead` accountable for domain outcome
→ `studio_project_tasks` assigned by skills, capacity, dependencies, due date and acceptance criteria
→ `Employee submission with evidence`
→ `Reviewer acceptance / rework (event history)`
→ `Token ledger contribution events`
→ `Founder domain outcome acceptance and Client Portal update/review`
→ `Closure, traceability, learning`.

**Important semantic distinction:** `studio_solution_tasks` are diagnosis/solution map steps, `studio_project_tasks` are execution work assignments. They may be connected through an approved blueprint / project transformation, but must never be silently merged or duplicated. `studio_task_playbooks` are guidance/evidence for a task, not a new competing task system.

## 4. Integration strategy, not a rewrite

1. **READ & TRACE CURRENT MAIN BEFORE MODIFICATION.** Preserve /admin, /team-v9, /admin/team-tasks, /client-access, all RLS/RPC policy and ledger entries.
2. Extend Founder RC20 with **read-only operational summaries** from the approved existing domain entities, only after verifying principal identity and actor/role scope: client → case → proposal/project → workstreams → accountable lead → team tasks → evidence/reviews → contribution ledger.
3. Preserve current legacy trusted-device access until Zoho/Founder OIDC can be safely bridged. **Authentication migration must not imply permission migration**. Do not switch off the staff login or production Client Access at the same time.
4. Define explicit cross-model IDs, provenance and audit records. Do not match people or clients solely by freeform name, email or browser-supplied tenant. No duplicate authoritative tables just for dashboard visuals.
5. Keep `studio_token_ledger` append/audit semantics and human approval; never equate contribution points with AI model usage, cryptographic tokens, cash balances or automatically payable EGP.
6. Maintain active business workflows and data untouched. Use synthetic records/isolated staging when testing, never real client messages or task reassignments without founder approval.
7. Baseline live app routes, read-only API/DB health, employee role UX, client portal and test recovery/rollback before any new Production merge or Vercel deploy. Real tests should use authorized users and not leak secrets.
8. RC20 `/ats-control-test/` on the original domain remains a **PUBLIC SYNTHETIC UX LAB**, not an authenticated Founder app. Never integrate Production work tokens, employee lists or client records into that public page.

## 5. Security and release gates

- Real current Production schema is confirmed but not every UI path or rule was live-tested with employee credentials; existing aggregate records DO NOT prove each workflow works end-to-end.
- Any new Zoho OIDC, sessions, data model or private RPC must integrate with and/or explicitly preserve existing authentication, audit, activity, RLS and client code workflows. No big-bang cutover.
- Preserve any remaining existing AI Edge functions from inadvertent execution; use explicit call/price gates for new pathways.
- No Vercel builds, billing changes, database writes, migrations, DNS, access approvals, token operations, real task updates or client messaging are authorized by this map.

**AT Studio — Build what works.**
