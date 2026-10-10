# AT STUDIO — RC19 | Executive Founder Experience — Design Validation

**Date:** 10 October 2026  
**Continuation of:** RC11 problem-first Founder Case UI, RC12 DTO, RC13 single case, RC14 selection, RC15 paging, RC16–RC18 auth/ingress, Draft PR #16.  
**Status:** Self-contained interactive design candidate generated for owner review; **not Production, not HTTPS Staging, and not a replacement for the existing authenticated implementation**.

## Owner objective

The Founder wants to **try the realistic intended final design now**, with fluid navigation and convincing content, without pasting confidential Zoho credentials or consuming paid Vercel usage.

The review artifact is provided directly in the ChatGPT conversation as:
`ATS_Control_Room_Executive_Preview_RC19.html`, plus
`ATS_Control_Room_RC19_Interactive_Review_Package.zip` (HTML + README + screenshots).
It is NOT yet copied to the GitHub code tree; this document preserves UX feedback targets so that approved design can be incorporated into the existing branch without recreating the system.

## Tested interactive experience

An independent, portable **44 KB standalone HTML** document, with all CSS/JS embedded, CSP `connect-src 'none'`, no external fonts/scripts/assets/data, no fetch/localStorage/cookies/Zoho/Supabase/Vercel/AI. Playwright + Chromium tested at:

- **1440×900 Desktop** — 5-section navigation, clients/search, case details, human-decision demo, switch AR/EN, Intelligence, no JS exceptions.
- **390×844 Android-size mobile** — hamburger/sidebar, clients, open a case, human-decision modal, language switch, zero horizontal overflow, no JS exceptions.
- **No network requests** generated under either viewport.

Navigation is **Today → Clients → open case → Problem → Known → Missing → ONE Next Human Action**, with optional Delivery/Studio/Intelligence concept sections and no false real operations.

There are exactly three **fictional clients** representing multidisciplinary sample use cases (property inquiries, worker HSE learning, beauty commerce). Names, data, priorities and KPI counts are synthetic. Decision-review action only updates memory for that page session and is explicitly labeled as local simulation. A reload erases it.

## Candidate visual language (consistent with approved ATS approach)

- Premium, restrained navy executive shell, warm ivory canvas, muted gold ownership accent.
- Founder-friendly hierarchy: one visually dominant client problem, two evidence panels, one next human action.
- Small typographic AT STUDIO ownership marker. **Do not replace the official logo in production**; existing official asset in `assets/logo-mark-official.png` stays authoritative. Standalone review avoids external assets to work offline.
- Cairo-compatible system Arabic, compact uppercase English metadata, generous spacing, desktop/mobility support.
- No generic service catalogue, no fake testimonials, no forced marketing/sales widgets.
- Brand premise: **Problem → Understand → Assemble → Build → Real Solution**, **Build what works**.

## Engineering implementation plan after Founder visual sign-off

1. Compare review design against **existing** `control-v2-preview/index.html`, `control-v2-preview/control-v2.js`, RC11 CSS and RC13/14 protected views. **Refactor existing components**, don't deploy a parallel app.
2. Move only approved typography, layout, navigation and evidence card patterns into canonical CSS/HTML; preserve official logo, RC8/RC12 DTO, secure role/tenant checks, pure scoped SQL, read-only safety.
3. Ensure UX state for empty/401/403/404/503, pending requests, RTL/LTR and accessibility remain truthful with **real server-only authorization**.
4. Keep separate Staging authentication and RC18 database no-go gates; design acceptance **is not deployment authorization**.
5. Only after staging hosting, real signed Zoho login, Secret rotation, private index RPC review and owner approvals, perform live browser tests.

## Crucial limitations

The design study's styling is a **candidate**, not owner-approved final styling. It was generated as a portable file in this ChatGPT conversation, **not yet source-committed to this PR**. The current PR stays in Draft and Vercel Production is not changed.

No Zoho credentials requested/read, no genuine user data, no network, no new paid service, no Vercel build/merge or Production SQL writes.

**AT Studio — Build what works.**
