# AT STUDIO / ULTRA-PREMIUM CONTROL ROOM STANDARD
**Approved design and engineering direction — 08 Oct 2026**
**Applies to:** AT Studio Executive Control Room / Access V2 / internal client case workspace.
**Owner direction:** Ultra-Premium is a continuous design AND implementation bar. Changes are updated incrementally on the preview branch and reported while work is in progress.
**Not yet approved:** Production auth cutover, real-customer access, paid subscriptions or destructive migrations.

## Product promise
**One studio. One client truth. One meaningful next action.**
Problem → Understand → Evidence → Desired Outcome → Assemble → Build → Verify → Real Solution.
Client-facing language must be simple; internal logic can be sophisticated.
Founder remains the approval point for commercial offers, billing and irreversible decisions.
AI can propose and organize but cannot silently send or sign off.

## Premium art direction — mandatory
- **Editorial, intentional, quiet:** Not cards everywhere, not a commodity admin kit, not fake "luxury" decoration.
- Use AT Studio's official mark discreetly; visual hierarchy comes from typography, asymmetrical layout and real information priority, not oversized logos.
- Palette: deep navy base; warm ivory and neutral surfaces; subtle champagne notes; restrained signature red only for meaningful emphasis.
- Strong Cairo Arabic typography + clean Montserrat Latin labels; Arabic and English must each read as native, with correct RTL/LTR and no word clipping.
- Clear layout grid, precise alignment, restrained corners, layered depth only where information demands it; no gratuitous glassmorphism or generic gradients.
- Every screen must prioritize a **decision**, **next step** or **evidence**. Each new widget must explain what problem it solves.
- Elegant functional responsiveness at 360px / 768px / 1280px, including dialog/keyboard and reduced-motion environments.
- Speed and clarity over animation. Never delay decisions for effects.

## Interaction and architecture bar
1. Founder sees top priority and the evidence for a decision first; secondary information is available on demand.
2. Quick Open (<Ctrl/⌘+K>) provides keyboard-first navigation to internal sections and case files. Accessible from all demo workspace screens.
3. Client case has a coherent record: stated problem, evidence known, missing decision-relevant context, recommended next action, and a readable decision history.
4. Requesting additional context is NOT closing a case. Review is NOT commercial approval. Tracked state must model these explicitly.
5. Keyboard, screen reader and touch usability are first-class. Visible focus, reasonable contrast and descriptive control names are required.
6. Bilingual copy conveys meaning, not direct word-for-word translation.
7. ATS auth must be genuinely secure server-side: identity from approved Zoho Directory for staff (pending integration); tenant/case data permission checks enforced by protected APIs.
8. Zoho Mail serves ordinary correspondence; ZeptoMail is a candidate for transactional delivery, not enabled; Supabase-hosted PostgreSQL stays until approved migration.
9. No credential forms, secrets, real customer data, mail sending or database writes in publicly accessible UX previews.
10. Tests are necessary but not sufficient: manual browser usability/visual QA and owner review required before a Production release.

## Continuous delivery gates
| Slice | Deliverable | Current |
|---|---|---|
| U0 | Premium executive typography, colors, navigation and Client Workspace | Implemented on feature branch / preview |
| U1 | Reliable filter/state behavior + case decision journal | Implemented, with regression tests |
| U2 | Ctrl/⌘+K Quick Open for modules and demo client cases | Implemented; new interaction CI checks to verify |
| U3 | Isolated Zoho Directory OIDC staff auth orchestration + least privilege policy | Code skeleton and security tests; not configured with a real provider |
| U4 | Secure live staging session, persistence, staff mapping and database adapter | Not implemented; needs separate authorization and setup |
| U5 | Client Access using approved transactional email/identity + safety QA | Not implemented; requires provider and cost review |
| U6 | Cross-device visual QA, usability sign-off, rollback and Production release | Not approved / pending |

## Acceptance checklist for EACH slice
- Reviewer can identify a clear primary next action in <5 seconds.
- Navigation and dialog use work by mouse, touch and keyboard.
- Arabic and English both fit at mobile and desktop sizes without horizontal overflow.
- 401/403/cross-client tests pass before any real endpoints can be used.
- No misleading "connected" or "verified" labels for services not actually enabled.
- CI regression passes AND any actual Preview deployment is \`READY\`.
- No new paid plan, auto-recharge, Production merge or real customer effects without explicit owner approval.

## Status reporting convention
After each development slice report: **implemented / tested / Preview URL / known limitations / next action**. This file is the baseline for work; business and infrastructure changes need a separate rollout decision.

## References in repo
- \`control-v2-preview/index.html\`, \`control-v2-preview/premium.css\`, \`control-v2-preview/ultra.css\`
- \`control-v2-preview/ZOHO_STACK_DECISION.md\`, \`control-v2-preview/ZOHO_DIRECTORY_STAGING_RUNBOOK.md\`
- \`server/access-v2/authorize.cjs\`, \`server/access-v2/zoho-directory-flow.cjs\`
- \`tests/control-v2-preview.test.cjs\`, \`tests/control-v2-browser-simulation.test.cjs\`
