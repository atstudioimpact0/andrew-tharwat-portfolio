# ROZY STORE — Phase 1 implementation handoff

Date: 2026-10-08
Source branch: `codex/rozy-premium-brands` at commit `156d706f2db9d8a765020f0b0b369fdd85c35267`

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
