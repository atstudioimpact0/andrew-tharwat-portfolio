# AT Studio — Release A / RC20 Canonical Founder Experience Integration

**Date:** 2026-10-10
**Branch:** `feat/ats-control-v2-zoho-auth-plan`
**PR:** Draft #16 / No merge / No deployment
**Decision:** RC19 isolated design study was **not** promoted to a parallel app. Approved direction is incorporated directly into RC13 and RC14 protected Founder case navigation.

## Founder UX: the actual ATS philosophy

**Problem → Understand → Evidence → ONE human decision → Real solution.**

- One clear path: `/control-v2/clients` → `/control-v2/cases/:uuid`.
- The client problem is the primary visual anchor, not a sales dashboard, fake AI claim, services list, or pile of controls.
- What is known and missing appear separately; unreliable client-intake statements are visibly labeled unconfirmed.
- A next human action appears without auto-approving, sending a message, calling AI, or writing a database entry.
- No fabricated real customers or inflated KPIs.

## ACTUAL changes merged into the existing feature branch

1. `control-v2-preview/founder-shell-rc20.css` — restrained ATS navy/gold/ivory Founder rail, responsive desktop/tablet/mobile, editorial hierarchy, RTL/LTR/reduced-motion styles.
2. `control-v2-preview/founder-shell-rc20.js` — one shared keyboard-accessible mobile drawer with correct `aria-expanded`, Escape/dismiss/overlay behavior and Arabic/English translations; no network, storage or autonomous actions.
3. `control-v2-preview/founder-clients-rc14.html` and `founder-staging-rc13.html` — **original** protected pages now share the RC20 shell. Existing RC14 server-authenticated list pagination/search and RC13 server-authenticated scoped case DTO continue unchanged.
4. Their `-init.js` files initialize the shell beside existing RC14/RC13 adapters; both are disposed on navigation/pagehide.
5. `server/access-v2/staging-ingress-rc16.cjs` — allowlist the two shell assets and a protected `/control-v2/assets/logo-mark-official.png` route. The logo is served ONLY under valid Founder session and ONLY when bytes pass the PNG header and size check.
6. `server/access-v2/staging-bootstrap-rc18.cjs` — preserves strict allowlist for RC20 assets, validates official PNG before serving; does not expose any new public file paths.
7. `scripts/package-control-v2-offline.cjs` — bundles the same updated protected page source as **fully offline visual preview** (not live API), with the repository's official logo embedded as a data URI. It does not loosen live Staging CSP or alter production.
8. `control-v2-preview/founder-staging-rc13.js` — fixes an actual visual/UX issue found during browser QA: the empty loading/error container was occupying space even after the authorized case loaded. Hide the container on ready, show it only for loading/error, clear it on dispose.
9. `founder-shell-rc20.css` ensures keyboard-only skip-to-content link appears on focus rather than covering the navigation or the offline banner.
10. Tests `rc20-founder-shell.test.cjs`, expanded `rc16-trusted-staging-ingress.test.cjs`, `rc13-founder-staging-browser.test.cjs` and `rc13-offline-package.test.cjs`.

## Verified CI and browser QA

- **[GitHub Actions Auth regression #264](https://github.com/atstudioimpact0/andrew-tharwat-portfolio/actions/runs/38046883771): 248/248 PASS, 0 failed.**
- Offline **RC13 and RC14 canonical Founder pages** generated as independent HTML files with no internet requirement (520,197 and 523,189 bytes).
- Chromium/Playwright review using the GitHub Actions artifact with **all code and official logo bundled**:
  - Desktop 1440×900, mobile 390×844
  - Browser shows 25 simulated cases; local search narrows to one
  - Switch to English reflects `lang=en`; drawer opens on mobile
  - RC13 file loads and the problem/evidence/next-action layout is rendered
  - **0 JavaScript exceptions, 0 outbound network requests, 0 horizontal overflow**
  - A visual issue was detected and **fixed** before final delivery (empty state container, skip link).
- Chat review artifact packaged separately: `ATS_Control_Room_Integrated_Founder_RC20.zip`, containing both canonical offline pages, Arabic README and desktop/mobile screenshots. All data fictional.

## Real launch blockers: do not confuse review with deployment

- As of latest account checks, `staging.atstudioimpact.com` is not a Vercel domain, Vercel Production deployment stays `dpl_FfjhF1Dt8ZrdCTPfbXWzwy11kCNT`.
- Real signed Zoho login and the rotated Client Secret are **not tested or configured** on a live host.
- Supabase Staging has no approved Founder mapping or real case-to-tenant assignments. The private index RPC from the RC16 SQL proposal is **not yet installed**, so actual live case listing remains unavailable.
- RC13 single-case DTO still does **not** return an authorized client display name: it shows a shortened case ID. A future audited server-side allowlisted identity field is required to display real client names without trusting URL/browser input.
- No actual human decision mutation, evidence upload, assignment, client message, AI execution or backend write is implemented by RC20. These require explicitly reviewed authorization, audit trails, and Staging database design before use.
- **No GitHub main merge, Vercel build/deployment, DNS changes, Staging SQL installation, Zoho credential handling, Production data movement, paid AI or billing action** occurred in RC20.

## Next engineering slice (not implemented or approved yet)

1. Add properly tenant-scoped client identity display to the trusted workspace DTO, without widening underlying data access.
2. Model a human-review action contract: `draft → evidence → decision → logged next action`; authorization, actor, timestamp, idempotency, audit log, evidence origin and undo/rejection flows.
3. Use real empty and error states; do not pad UI with invented case counts or implement fake approvals.
4. Get separate owner approval for a real HTTPS Staging host, review SQL migration, rotate exposed Zoho secret privately, run real signed-ID-token E2E, then test and approve before any production deploy.

**AT Studio — Build what works.**
