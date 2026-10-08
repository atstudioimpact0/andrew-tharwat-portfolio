# ATS × ZOHO — Maximum Relevant Use, Minimum Dependency
**Status:** architecture recommendation; no Zoho Directory app or ZeptoMail account connected/activated yet.
**Updated:** 2026-10-08
**Scope:** AT Studio corporate access and customer communications. Existing Supabase Postgres data remains as currently hosted.

## Design intent
Choose Zoho where it does a better job than building our own system. Don't force Zoho CRM/Creator into AT Studio simply because the vendor is already connected for mail. Keep ATS as a single coherent product; use integrated infrastructure with clear boundaries.

## Decision matrix
| Area | Proposed provider | Status | Cost / limitation |
|---|---|---|---|
| Business mailbox / replies | Zoho Mail on hello@atstudioimpact.com | Operational, send and receive tested by owner | Existing mail plan; verify its renewal and sending limits |
| Founder + internal-team SSO | **Zoho Directory** with OIDC custom app and Zoho OneAuth/MFA | Candidate; not configured | Official Free: up to **10 users**, **3 non-Zoho apps**, default MFA and 7-day audit logs; availability/capacity must be checked on the actual organization |
| Automatic case/OTP/notification emails | **Zoho ZeptoMail** | Candidate; **not activated** | Zoho says normal Mail cannot send automated or transactional messages. ZeptoMail uses credits; free first credit advertised for some signups, with time-limited validity. No purchase or auto-recharge until explicitly approved |
| Client portal identity | ATS protected backend plus short-lived verification, optionally through approved ZeptoMail for the email delivery step | Not implemented | Do NOT use the 10-user Zoho Directory free tier as a general external-client user database |
| Access control and sessions | Verified server-side OIDC authorization code flow (PKCE/state/nonce, issuer/audience/JWKS checks) + server session cookie, scoped RBAC and audits | Policy pilot exists; no real identity provider connected | Sessions/access must be checked by server on every privileged API call; Directory SSO does not replace app-specific authorization |
| Main application records | Existing Supabase-hosted PostgreSQL | Retained temporarily | Keep data / RLS / migrations unchanged until authorized migration |
| Enterprise/customer management | ATS Client Case Workspace | In UX development | Do NOT duplicate leads/projects into Zoho CRM by default; consider it only if a verified need arises |
| Zoho Inbox integration | Zoho's approved OAuth API, read-only case attachment / message referencing after scopes/privacy reviews | Future optional | No API secrets in the browser; founder approval before reading mail with service permissions |

## Why Zoho Directory
Official Zoho sources confirm:
- Zoho Directory supports **OpenID Connect** as a provider for third-party custom apps.
- Free plan supports up to **10 users** and **3 non-Zoho apps** (pricing as published); different paid plans add capabilities.
- Directory setup for a custom OIDC application provides Client ID, Client Secret, Authorization Endpoint, Token Endpoint, User Info Endpoint to configure on the relying party.

References:
https://help.zoho.com/portal/en/kb/directory/admin-guide/applications/add-applications/articles/adding-a-custom-oidc-app
https://help.zoho.com/portal/en/kb/directory/admin-guide/applications/add-applications/articles/using-open-id-connect-oidc-in-zoho-directory
https://www.zoho.com/directory/pricing.html

**Avoid security confusion:** Zoho Directory's authenticated user identity is just an identity. ATS must map OIDC subject + issuer to an **explicit, approved internal staff member** in the ATS database. Never grant founder/admin by email suffix or frontend role selection. Audit MFA and offboarding, revoke sessions when staff access changes.

## Why ZeptoMail is separate
Zoho Mail officially says it cannot be used for automated or transactional emails such as OTPs. ZeptoMail is their purpose-built service. Its landing/pricing pages advertise pay-as-you-go credits and sometimes a first free credit; do not assume the old USD price applies to new signups because pricing announcements and regional conditions can differ.

References:
https://www.zoho.com/mail/help/usage-policy.html
https://www.zoho.com/zeptomail/pricing.html
https://www.zoho.com/ar/zeptomail/

**Pilot before spending:** request account-scoped terms and rates, check automatic recharge disabled, and compare manual first-credit testing. Need domain/subdomain strategy for additional sender SPF/DKIM alignment while protecting the existing Zoho Mail SPF (never introduce duplicate SPF records).

## Implementation order — NOT approval to enable spending
1. Owner reviews the Premium Control Room V2 UX and confirmed organizational needs.
2. Inspect actual Zoho Directory organization status/eligibility; no subscriptions; verify **free app/user limits**.
3. Create a private OIDC client for **ATS INTERNAL STAFF ONLY** using a staging callback after owner approval, with controlled assignment. Never put client secret in GitHub or browser.
4. Build server-only OIDC callback, state/nonce/PKCE, strict issuer/audience/JWKS validation and server-side session control. Generate no tokens in the preview.
5. Implement **least-privilege business API** backed by current PostgreSQL, using server-resolved role and case ownership. Protect MFA and offboarding, test negative access.
6. Review ZeptoMail program/region and cost; only then set up automated OTP for client portal if approved. Rate-limit/account-enumeration protections must be in place first.
7. Test case visibility, admin/reviewer/member boundaries, drafts, payment approvals and revocation in isolated staging. Formal owner gate before switching any Production login.

## Current state / hard no's
- **Zoho Mail: working** for regular correspondence according to outbound/inbound owner test and DNS MX/SPF/DKIM/DMARC records.
- **Zoho Directory/OneAuth: recommendation only**, not connected.
- **ZeptoMail: recommendation only**, not connected or billed.
- **ATS authentication: not yet migrated**; current Production continues to use legacy Supabase Auth/device flows.
- **No paid plan, auto-billing, DNS modification, Production route change, customer emails or production database writes made.**

