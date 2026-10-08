# AT Studio — Zoho Mail DNS Readiness (8 Oct 2026)

**Target domain:** atstudioimpact.com
**DNS provider:** Vercel (authoritative NS ns1.vercel-dns.com, ns2.vercel-dns.com)
**Status:** Verification TXT is in place; email routing/authentication records were missing at the last Vercel DNS inspection.
**Production:** Do not replace the zone file, alter website records, or change paid plans. Any DNS change must add/update precisely the necessary mail records after values are verified against the Zoho Admin Console.

## Current Vercel DNS snapshot (read-only)
- Root TXT `zoho-verification=zb67009936.zmverify.zoho.com` (keep)
- Apex site ALIAS pointing to Vercel-managed host (keep)
- Wildcard ALIAS pointing to Vercel-managed host (keep)
- `move` CNAME (keep)
- Move-specific verification TXT values (keep)
- CAA records (keep)
- No apex MX records present in the listed zone records.
- No apex SPF TXT (`v=spf1`) present.
- No DKIM selector record found in the zone records.
- No `_dmarc` record found in the zone records.

## MX records verified from Zoho Admin Console screenshot (8 Oct 2026)
The account-specific **atstudioimpact.com → Email Configuration → MX** page displays these exact records. These are no longer illustrative and are safe to use for the **mail-only DNS change** once an additive write mechanism is available:

| Record type | Host | Priority | Value |
|---|---|---:|---|
| MX | @ | 10 | mx.zoho.com |
| MX | @ | 20 | mx2.zoho.com |
| MX | @ | 50 | mx3.zoho.com |

**Current Vercel DNS:** at the recheck after screenshot delivery, there were no MX records; no SPF, DKIM, or DMARC records were present either.

**Execution blocker:** the connected Vercel actions can READ records, UPDATE an existing record, or REPLACE THE ENTIRE DNS ZONE; they do not expose a safe incremental **create DNS record** operation. Do **not** overwrite the entire zone, because it includes Vercel-managed ALIAS records and Move Now routing/verification records. The safe alternatives are adding these three MX records in the Vercel DNS dashboard or using a connected Work browser capable of clicking Add Record; then verify.

**Zoho console next:** click Verify on the MX screen after propagation. Collect account-specific SPF and DKIM pages before adding mail authentication records.

## Required confirmation FROM THE ACTUAL Zoho account
Open **Zoho Mail Admin Console → Domains → atstudioimpact.com → Email Configuration / View DNS Records**.

Capture these exact values:
1. **Mailbox exists and is enabled** (hello@atstudioimpact.com) — confirm in Users.
2. **Zoho MX records confirmed** from provided Zoho Admin Console image (see table above).
3. **SPF** required by the Zoho account, and any other authorized outbound mail providers. Only ONE SPF TXT record can exist at the apex.
4. **DKIM selector** and full public TXT value generated in the Zoho Admin Console. Never invent a DKIM key/selector; do not post the private key.
5. **DMARC** can be introduced in monitoring mode once an active reporting mailbox is selected; tune enforcement after testing.
6. Confirm whether **Zoho ZeptoMail** will be the approved transactional sender for website OTP/notifications. Zoho Mail itself is not suitable for automated messages. Do not enable or purchase ZeptoMail without approval.

## Zoho reference SPF (still an EXAMPLE — do not apply until the actual account SPF screen is checked)
For some Zoho .com-hosted accounts, the public example is:
| Type | Host | Value | Priority |
|---|---|---|---|
| MX | @ | mx.zoho.com | 10 |
| MX | @ | mx2.zoho.com | 20 |
| MX | @ | mx3.zoho.com | 50 |
| TXT | @ | v=spf1 include:zohomail.com ~all | — |

Zoho explicitly warns that the MX hostname suffix may differ by data center. SPF also depends on **all** services that legitimately send using the domain. The DKIM value is unique and must be obtained from the Admin Console.

References:
- https://www.zoho.com/mail/help/adminconsole/configure-email-delivery.html
- https://www.zoho.com/mail/help/adminconsole/spf-configuration.html
- https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html
- https://www.zoho.com/mail/help/adminconsole/add-domains.html
- https://www.zoho.com/mail/help/usage-policy.html

## Next safe execution
1. Compare Zoho's domain-specific values against the current Vercel zone.
2. Assemble a **mail-only** change list (add MX and verified SPF/DKIM, stage DMARC). Keep ALL nonmail DNS records unchanged.
3. Verify available DNS mutation path supports safe incremental record creation; do **not** use whole-zone replacement casually.
4. Confirm account readiness and obtain approval of the exact change list before applying.
5. Verify authoritative/public DNS, Zoho status and mail sent and received from an external mailbox.
6. Mark setup complete only after mail delivery test passes.

## Separation from ATS login
Zoho Mail = official person-to-person mail. It is NOT an authentication/identity service.
ATS Auth V2 should move away from Supabase Auth using a secured server-side login/session stack. Database stays on Supabase Postgres temporarily, accessible to protected APIs under least-privilege roles. Never expose privileged DB credentials to browsers.

**Not performed:** Zoho console login, mailbox verification, DNS changes, activation of transactional mail, Production deployment.
