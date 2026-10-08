# ROZY STORE — Phase 1 implementation handoff

Date: 2026-10-08
Source branch: `codex/rozy-premium-brands` at commit `156d706f2db9d8a765020f0b0b369fdd85c35267`

## Approved primary development path — decision 2026-10-08

**Source of truth for further ROZY STORE work:** `codex/rozy-store-order-on-demand-v1` and its current preview at `/beauty-rozy/preview/`. Product → Request → Quote → Customer Approval is the default interaction model. This is an explicit user-approved direction.

**Other versions are secondary reference material only:**
- `codex/rozy-premium-brands` may supply useful visual or technical elements after selective review; do not resume feature development there.
- `beauty-rozy-premium-v1` and other earlier designs are historical references, not parallel product directions.
- Reuse individual components, images (only where licensing permits), and content when they support the approved ROZY STORE flow, not by wholesale merging old concepts.

**Guardrails:** Keep current editorial/quiet-luxury direction, English-first presentation, and the approved ROZY STORE name. In the preview, no real order or payment exists. Price, availability and delivery must be verified before payment in the eventual live flow. Do not change default Git branch, merge into `main`, retarget production, or change `atstudioimpact.com` without separate review and approval.

**Repository note:** The current draft PR #15 targets `codex/rozy-premium-brands` only for an intelligible diff against its historical source. That technical PR base does not mean the old branch is the strategic mainline. Before release, review the combined change set against the real production branch.

## Decision log — 2026-10-08: PRIMARY DEVELOPMENT TRACK APPROVED

**Approved by project owner:** ROZY STORE sourced-to-order customer experience is the single PRIMARY track for all subsequent website and order-workflow development.

### Canonical development source of truth
- Primary development branch: `codex/rozy-store-order-on-demand-v1` (or a new feature branch created from its current reviewed head).
- Primary interactive journey: `/beauty-rozy/preview/` as the UX reference for the customer workflow. The demo itself is NOT the production ordering system.
- Primary identity: **ROZY STORE**, where ROZY is visually dominant, STORE is secondary.
- Primary business workflow: curated product discovery → request availability → ROZY supplier/price/timing verification → written offer → customer acceptance → payment under approved terms → sourcing and delivery updates.
- Prior track `codex/rozy-premium-brands` and earlier work such as `beauty-rozy-premium-v1` are **reference material only**. They may contribute reviewed imagery, layout, editorial components and code where demonstrably beneficial, without replacing the new customer journey or reintroducing outdated naming or German-origin claims.
- No parallel competing implementation: new ROZY features should branch from the current primary track, with cherry-picks/manual integration only after specific review of differences.
- Keep legacy URLs `/beauty-rozy/` working for now; changing paths requires a separate redirect/SEO plan.
- **Not approved:** changing repository default `main`, merging PRs, promoting previews, modifying DNS, connecting payments, inventing stock or prices, or publishing production. Each requires its own review and release approval.
- Preserve the current approved premium visual language while prioritizing ease of use, truthful sourcing and clarity of the customer's next step.

### Immediate implementation priority
1. Replace demo-specific flow with a reusable product page experience.
2. Add persisted enquiries and a simple internal ROZY quote workflow with role-based security.
3. Implement quote review / approval and customer tracking without mandatory WhatsApp detours.
4. Validate mobile and desktop usability, then approve a preview as a release candidate before any production merge.

---

## Approved direction
- Public-facing identity: **ROZY STORE**, with ROZY visually primary and STORE secondary.
- Premium curated beauty destination, English-first visual experience, customer clarity over decoration.
- Launch brand edit: Balea, Essence, SHEGLAM, Maybelline, e.l.f., Huda Beauty.
- Independent retailer; products may be sourced abroad (including Germany) but must not be described as German-manufactured unless verified.
- Catalog / sourcing on demand. An enquiry is **not** a purchase.
- Before payment, verify availability, actual total price, shipping, delivery estimate, payment/cancellation terms; seek affirmative customer approval.
- No invented stock, SKUs, shipping dates, supplier confirmations, or order status.

## Phase 1 changes
- Begin brand-name and copy transition on main customer-facing screens.
- Keep the old `/beauty-rozy/` URL paths temporarily for compatibility; do not break existing routes or migrate domain paths without redirects and validation.
- Clarify that bag preparation is an **enquiry preview**, not a placed order.
- No customer request persistence, supplier validation, payment, or real tracking is implied.

## Known work still required before any production release
1. Audit/replace old brand identity in the remaining product, brand, informational and media/SEO assets; preserve factual country-of-origin data.
2. Build authenticated server-side enquiry storage, audit trail, customer verification, and a back-office quote review workflow.
3. Separate `requested`, `supplier_verified`, `quoted`, `customer_accepted`, `payment_pending`, `paid`, `purchased`, `in_transit`, `delivered`, `cancelled` with valid transitions and authorization.
4. Replace synthetic local reference numbers with real server-generated persistent references only once backend is connected.
5. Never display generated prices or ETA as confirmed without supplier verification.
6. Confirm returns/import-compliance rules and copyright permission for brand media.
7. Browser test mobile and desktop; do not merge or deploy until QA approval.
8. Validate Vercel preview and connected environment; production remains out of scope.

## Caution
The current static request page has no configured real backend endpoint. The bag's generated reference is a preview identifier only. Future code must not treat it as a genuine submitted order.
