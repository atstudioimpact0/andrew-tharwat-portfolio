# AT STUDIO — RC21 Seamless Operations: One Human Action, Complete Workflows

**Date:** 2026-10-10  
**Branch:** `feat/ats-control-v2-zoho-auth-plan`  
**PR:** #16 Draft, no merge, no Vercel deployment, no database writes.

## What RC21 solves

The existing site already runs a real operating model: client discovery,
solution tasks, project domains, team assignment, evidence, reviews,
messages and contribution-token ledger. RC20 Founder UX alone was too narrow.

RC21 adds a **thin read-only decision surface INSIDE the existing /admin project
dialog**, not a replacement admin application. The purpose is to show the
Founder the **one next human action** and let them move to the existing
workspace responsible for acting. No redundant CRM, task table or token wallet
has been created.

## Implementation — actual feature branch

1. `admin/project-continuity-rc21.js`
   - UMD pure `derive` + safe `render`.
   - Consumes ONLY already loaded, already-authorized project records:
     `studio_projects`, `studio_project_workstreams`,
     `studio_project_tasks`, `studio_messages`, `studio_reviews`.
   - Filters every record by the current project's ID.
   - Shows actual domain/task/accepted/review counts, not invented KPIs.
   - One deterministic recommended HUMAN follow-up, prioritized from latest
     client reply, founder domain review, missing domain lead, employee
     review, overdue/unassigned task, pending client review, then existing
     internal action/no domains. It does NOT assign, accept, message, upload,
     change status, call paid AI or calculate currency/tokens.
   - DOM `textContent` only for any user/client-provided wording.
   - A single button navigates to **existing** domain/task/message/review
     controls instead of creating duplicate workflows.
2. `admin/project-continuity-rc21.css`
   - Compact premium ATS navy/gold section.
   - Responsive and readable without hiding existing controls.
3. `admin/index.html`
   - Adds the compact project decision panel before Domain Delivery,
     retains existing complete project modal and all actions.
   - Loads the pure module before `admin/admin-unified.js`.
4. `admin/admin-unified.js`
   - Reuses already available authorized in-memory rows; no extra API
     calls for the pulse.
   - Project workspace request generation prevents an earlier project's
     async response from rendering under a newly selected project, or
     from marking the earlier project's messages read after switching.
   - Correct loading/error feedback instead of displaying stale summaries.
   - Existing `/admin/team-tasks?project=...` navigation remains.
   - Authorized return URLs are consumed ONCE after the existing
     Trusted Device gate, using the current allowed project list.
5. `team-v9/engine.js`
   - On the **admin Team & Tasks route only**, a context-aware return link
     `/admin/?resume_project=<valid-uuid>#studio-projects` returns the Founder
     to the same project after assignment/review.
   - The link is absent from the employee workspace; a URL ID itself
     grants no access or additional permissions.

## Real database read-only cross-check (existing Production-connected
Supabase project from `main/config.js`: `sivyynuhluhvjcdicwxn`)

Verified actual table columns `project_id`, `owner_id`, `status`,
`lead_member_id`, `due_at`, `internal_action`, `sender_type`.

Current aggregate status observed, with **no private individual records read**:
- 4 active workstreams/domains
- 10 team tasks: 9 `available`, 1 `assigned`
- Previous verified counts: 3 team members; 3 token ledger events;
  9 task events; 8 task dependencies
- No modifications to any table, RPC grants, staff permissions or tokens.

## Test evidence

**[GitHub Actions #274](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38052639330)** passed: **261/261** regression tests.

RC21 tests include: cross-project record isolation, no fabricated wallet
values, priority decisions, no automatic approval/writes, safe DOM rendering
of untrusted text, original operations still in DOM, project-team-project
return guarded by authorized list and trusted session, and both operational
scripts syntactically valid.

## What must remain intact

- `studio_solution_tasks` (diagnosis) != `studio_project_tasks` (execution);
  no merger or duplicate.
- Existing Domain Lead ownership, task skill/capacity/dependencies,
  human review/rework and task event histories are still authoritative.
- `studio_token_ledger` remains the contribution ledger in Team Wallet.
  No wallet recalc, token transfer, settlement or EGP conversion.
- Client Access one-time code is unrelated to employee tokens and
  Trusted Device claims. All original access gates stay unchanged.
- Existing messages, files, reviews, revisions, client-visible updates and
  workstream/employee actions remain usable in the same old screens.
- `/ats-control-test/` is PUBLIC synthetic UX, and was NOT connected to
  the operational Supabase or real staff records.
- Zoho RC8–RC20 Staging authentication remains a separate, unapproved
  cutover. This work did not attempt to link identities between the
  Production Trusted Device/employee system and Staging Zoho.

## Remaining release requirements

- The feature is currently SOURCE-ONLY in Draft PR #16, not visible on
  Production. Do NOT merge all of PR #16 to deploy RC21: it carries many
  experimental RC8–RC20 changes. First isolate a reviewable, minimal PR
  for exactly RC21 with the four new/changed operational files and tests.
- Run authenticated real-browser Founder and team E2E after creating a
  safe preview that will NOT leak Production project data.
- Validate project-list limit: current admin loads the newest 250 projects;
  if a return-link references an older but otherwise authorized project,
  the link safely falls back to the list rather than opening a wrong project.
- Review accessibility and UX on mobile/RTL before any Production rollout.
- No unapproved Vercel builds, deployments, DNS, Supabase writes, token
  changes, payment actions, client messages, or paid AI.
- Consider auditing existing project-dialog auto-mark-read behavior
  separately; RC21 avoids introducing any additional read status changes.

**AT Studio — Build what works.**
