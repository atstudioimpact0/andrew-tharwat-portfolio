# AT STUDIO — Public Website Launch / Hero v1
**Checkpoint:** 10 October 2026  
**Branch:** `feat/ats-public-launch-hero-v1` (isolated directly from the real `main`).  
**Release status:** Code and static contracts prepared; **NOT DEPLOYED**, **NOT MERGED**, **no Vercel build triggered**.

## Why this is the real homepage
The site's `vercel.json` rewrites `/` to `/v9/index.html`. Editing root `index.html` would not change the visitor's active homepage.

## Today's handoff in context
- Existing ATS operational system audited: production-connected Supabase contains team roles, workstreams, assignment/review lifecycle and Token Wallet; do NOT recreate or conflate them.
- RC21 protected Founder project UX (one human next action, authorized return to team tasks, anti-stale project read) was coded on **Draft PR #16** and its CI passed **261/261**. **It is not deployed**.
- Existing `/ats-control-test/` is already a separately published **PUBLIC, SYNTHETIC** UX lab. Do not infer a real Zoho login or access to actual client records.
- This document concerns the **PUBLIC marketing site and launch**, NOT RC8–RC21 operation/auth.

## Public Hero implementation on its own branch
1. `v9/index.html`: editorial hero leads with "THE PROBLEM COMES FIRST"; AR: "المشكلة أولًا. والحل يتبني حواليها." True ATS anchor: "Different minds. Different tools. One direction." Explains problem → right expertise → useful outcome. No generic service list.
2. Existing `#contact` Concierge remains the PRIMARY CTA; `#work` is secondary. Original lead submission, error recovery and existing client intake are untouched.
3. Integrated responsive conceptual **HTML/CSS** visual (not a fake screenshot, paid photo or invented client case) showing "What needs to change?" → Understand → Assemble → Build → "Build what works".
4. New scoped `v9/v9-launch-hero.css` implements official navy / red / silver site colors, RTL, keyboard text, responsive tablet/mobile and reduced motion. No scripts, fonts or remote media added.
5. New bilingual document metadata in `v9/index.html` and language-runtime description in `v9/v9.js` aligned to ATS positioning; OG/Twitter tags reference the **existing official ATS brand mark**, not an invented marketing image.
6. New `robots.txt` and minimal `sitemap.xml` support public discoverability. Crawler exclusions for `/admin/`, `/team-v9/`, `/client-access/` and test routes are **NOT security controls**; existing auth and RLS remain essential.
7. `tests/rc22-public-launch-hero.test.cjs` preserves existing V9 routes, Concierge/CTA, bilingual labels, accessibility and no fabricated KPIs.

## Verification performed
- GitHub `compare_commits(main, feat/ats-public-launch-hero-v1)`: only SIX public-launch-related files changed/added: `v9/index.html`, `v9/v9.js`, `v9/v9-launch-hero.css`, `robots.txt`, `sitemap.xml`, `tests/rc22-public-launch-hero.test.cjs`. **No admin/client/team/auth/db production scripts modified**.
- Source static assertions checked correct Vercel root rewrite, Concierge CTA, real project links, bilingual content, focusable semantic method label, responsive breakpoints, reduced-motion and no network/AI scripts in the hero.
- **Browser screenshot / actual mobile acceptance / new branch full GitHub Actions npm test have not yet been run.** Don't cite RC21 261/261 as proof of this new marketing branch.
- Latest verified live Vercel `main` Production deployment remains READY and unchanged after this feature branch work.

## Release checklist (before approving one deliberate Production rollout)
1. Human-reviewed visual QA on desktop 1440, mobile 390/360, tablet, Arabic and English; ensure header logo, typography, no overflow, no bounce/jank.
2. Confirm `#contact` opens the SAME active Concierge, error recovery and lead submission still work; one authorized end-to-end sample without exposing actual customer details.
3. Verify SEO canonical, robots, sitemap and social link preview with live HTTP and browser tools after rollout.
4. Confirm ATS branding assets and accessibility contrast/keyboard focus.
5. Merge only the isolated public launch branch after approval, not giant Draft PR #16. One controlled deploy, check Vercel usage/cost beforehand, and retain previous deployment for rollback.
6. After the website is accepted: coordinate reveal content and social accounts with the approved AT Studio sequence and messaging, without conflating teaser timeline with launch state.

**AT Studio — Build what works.**
