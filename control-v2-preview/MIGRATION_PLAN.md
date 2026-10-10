# ATS Control Room V2 — Controlled Modernization Plan
**Status:** UX prototype committed; email and authentication architecture proposed, not implemented.
**Date:** 2026-10-08
**Base:** main at 2ee143ae8a0d3051300b2415545e2d7b69023466
**Work branch:** feat/ats-control-v2-zoho-auth-plan
**Production:** unchanged. No database/auth/DNS changes authorized by this plan.

## Milestone update — 8 Oct 2026

**Official Zoho Mail (ordinary business correspondence): operational, per successful outbound/inbound test confirmed by the owner.** MX/SPF/DKIM/DMARC TXT records were independently confirmed present in Vercel DNS. DKIM/DMARC per-message alignment should be checked using Authentication-Results before hardening DMARC beyond monitoring-only policy; p=none currently does not block spoofed mail.

**Next active stage: Control Room V2 + ATS Auth V2 pilot, no Production changes.** This milestone is distinct from automated transaction-email delivery. Zoho Mail should not be used as automated OTP sender. A secure, separately approved sender/authentication design is still needed.

See `ZOHO_DNS_READINESS.md` and `AUTH_V2_DEPENDENCY_MAP.md`.

---

## Business intent
ATS must feel easy and trustworthy to its clients, clear to the founder, and directed for the team.
Problem → Understand → Evidence → Desired Outcome → Assemble → Build → Verify → Real Solution.
One meaningful client next action, minimal repetition, clear ownership, documented human gates.
Brand is **AT Studio** publicly. **ATS** is internal shorthand.

## User-approved infrastructure boundary
- **Remove reliance on Supabase for email and authentication**, not for the database yet.
- **Zoho Mail** becomes the official human-to-human business mail provider when configuration and tests succeed.
- New, secure login independent of Supabase Auth for Control Room and Client Access/Portal.
- Retain Supabase Postgres and existing business data temporarily and migrate access safely.
- Undertake major **Control Room V2 user-experience redesign** without changing existing Production.
- No paid plan, billing activation, domain DNS mutation, or Production deployment without explicit owner approval.

## Verified current state (read-only audits)
1. Vercel-managed DNS for atstudioimpact.com contains Zoho ownership-verification TXT, but the accessible zone records do not include MX, SPF, DKIM or DMARC. TXT presence is **not proof of mailbox activation**.
2. Existing browser files depend on Supabase client/API: v9/v9-concierge.js, admin/admin-unified.js, client-access/access.js, client-v9/portal-live.js, auth-client.js.
3. The Vercel project has sensitive SUPABASE_SECRET_KEY environment settings. Do not decrypt, print or replicate.
4. Supabase project has an estimated 87 public tables, 9 auth users, 20 Edge Functions across ATS and other projects. It is not just an email provider.
5. Current admin auth is browser trust-device based; Client Access uses a 6-digit Studio-issued code via Supabase Edge Function and Supabase Auth; active client portal uses Supabase email OTP.
6. GitHub v9-unified is older than currently deployed main, so the isolated prototype branch is based on the current main SHA.

## Zoho mail path (no DNS changes until approved)
1. Establish that an actual Zoho Mail organization and one mailbox under atstudioimpact.com exist.
2. From Zoho Admin Console collect the **region-specific** exact MX/SPF/DKIM requirements; never guess or copy generic records if region differs.
3. Preserve all website A/ALIAS/CNAME records. Compare proposed mail-only DNS diff and request approval.
4. Configure MX and exactly one valid combined SPF policy; DKIM selector/value from the actual Zoho account. Add DMARC with a cautious staged policy and reporting address.
5. Confirm incoming and outgoing mail using two unrelated mail domains plus SPF/DKIM/DMARC alignment. Test mobile and webmail.
6. **Zoho Mail must not be used as an automated OTP / transactional-email sender.** Its published usage policy excludes automated/transactional mail. Propose Zoho ZeptoMail or another transactional provider; validate service cost, free tier and explicit owner approval first. Until approval, no automated email activation.
7. Zoho Mail is an email provider, **not** the identity provider for ATS by itself.

## Authentication architecture — decision proposal, NOT implemented
### Trust boundary
Browser ⇄ HTTPS server-controlled ATS API ⇄ PostgreSQL (currently hosted on Supabase).
No elevated DB keys in frontend code and no browser direct tables or RPCs for protected functions in migrated screens.

### Requirements
- Server-side authentication using a proven, maintained library/identity-provider, selected after pricing/security review.
- Founder/admin: strong login (ideally phishing-resistant passkeys/WebAuthn or secure MFA), explicit allowlist and role assignment.
- Clients: passwordless verification through a compliant transactional sender, or a separately approved secure login method. Preserve client ownership mapping and continuity during migration.
- Short-lived, random, single-use challenges stored **hashed**, time-limited, attempt-limited and rate-limited. Never log a code, session or token.
- Server-managed session IDs in Secure + HttpOnly + SameSite cookies, no tokens in URLs/localStorage. Rotate/revoke sessions as needed.
- CSRF defenses, request origin validation, access logging, security headers, abuse controls.
- Authorization in every endpoint: role-based and ownership/tenant checks. Sensitive decisions require audit and founder approval where appropriate.
- Existing Trusted Device and Supabase Auth flows remain untouched until replacement is secure and end-to-end proven. Never treat a demo page as a login gate.
- Do not expose a browser-side Supabase service key or assume RLS alone protects privileged backend endpoints.
- Email verification and session authentication are **different** components; neither is replaced by an email-domain change.

### Migration gates
**Gate A — Contract:** inventory current admin/client access states, data/RLS policies, all identity lookups and dependencies; choose vendor/library based on cost/security.
**Gate B — Isolated identity pilot:** separate server endpoints and test identities in nonproduction data environment. No client invitations until approved.
**Gate C — Authorised server data access:** move selected protected reads and writes behind server APIs; implement and test ownership and role restrictions. Keep old paths intact while shadow-verifying.
**Gate D — Client/Founder acceptance:** test device, session renewal/revocation, duplicate identities, deep links, email delivery, attachments, proposals, project permissions and failure recovery.
**Gate E — Controlled switchover:** owner reviews rollback plan, cost guardrails, production diff, privacy controls, audit trail and verifies final data parity. Only then can old auth flows be retired.

## Control Room V2 IA (implemented as UX demo)
- **Today** — priority decisions, due actions, reviews, minimal metrics.
- **Clients** — one case workspace: challenge, known facts, gaps, next justified action.
- **Delivery** — ownership, deliverables, review and acceptance.
- **Studio** — team, public site/content, settings/security separate from client work.
- **ATS Intelligence** — evidence-aware suggestions only; human approval remains mandatory.

### Preview safety
Directory: /control-v2-preview/
Contains ONLY illustrative cases. It makes NO network requests and cannot access business data or issue approvals.
No credentials, Supabase JS, staff email list, real clients or authentication code. All demo actions are in-memory and reset on reload.
The preview has no login and is **never appropriate for actual administrative usage**. Keep outside Production routes and do not publish an unrestricted preview as a private system.

## Test acceptance criteria (before live integration)
- Founder can understand outstanding work and next action without scrolling many dashboards.
- Client case opens from Today in one navigation action.
- Each client case displays one coherent challenge, known facts, key gap and next step.
- Founder can simulate request-info/review within one context without submitting anything externally.
- Mobile RTL/LTR usable, keyboard focus visible, dialog escapable, content remains readable.
- Demo data unmistakably identified; no backend calls and no real permissions claimed.
- New admin/portal authentication independently passes negative authorization/ownership tests before connection.
- Mail delivery and any transactional-email costs explicitly verified.
- Never merge or deploy without owner review and explicit approval.

## Impact / separation
The current Supabase database is shared across ATS projects, portfolio, Move Now, HSE, and other work.
This migration targets **ATS auth + communications first**. It does **not** mean disconnecting or wiping shared database tables, disabling Edge Functions, changing domain, or moving product data.

## Follow-up delivery slices
1. Approve usability of the isolated V2 preview.
2. Inventory current RLS/RPC/admin and client authentication; select secure login implementation with bounded cost.
3. Obtain actual Zoho mailbox/Admin Console state and confirm mail-specific DNS diff.
4. Build secured API and identity pilot on an isolated data environment; regression test.
5. Prepare incremental client/admin integration and rollback.
