-- AT STUDIO / ATS AUTH V2 / STAGING ONLY
-- Proposal reviewed in PR #16. DO NOT APPLY TO PRODUCTION.
-- A dedicated isolated staging database (not the shared live ATS/Move Now
-- Supabase project) is required for the first executable migration.
--
-- Source of truth: authenticated Zoho Directory OIDC issuer + subject.
-- NEVER auto-provision staff or assign founder by email, domain, or browser role.
-- This schema introduces NO grants or RLS policies permitting anon/authenticated.
-- A purpose-built least-privilege backend DB role/policy must be reviewed later.
BEGIN;

CREATE SCHEMA IF NOT EXISTS ats_identity_v2;
REVOKE ALL ON SCHEMA ats_identity_v2 FROM PUBLIC;
REVOKE ALL ON SCHEMA ats_identity_v2 FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS ats_identity_v2.staff_identity (
  issuer text NOT NULL,
  subject text NOT NULL,
  staff_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('founder','studio_admin','reviewer','contributor')),
  active boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject),
  CONSTRAINT staff_id_not_nil CHECK (staff_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  CONSTRAINT staff_issuer_https CHECK (issuer LIKE 'https://%'),
  CONSTRAINT staff_subject_nonempty CHECK (length(subject) BETWEEN 1 AND 300),
  CONSTRAINT staff_activation_requires_approval CHECK (
    NOT active OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- One-time transactions must be atomically consumed (DELETE ... RETURNING).
-- Store the PKCE verifier/nonce payload as authenticated encryption (AEAD)
-- ciphertext only. Encrypt outside SQL with a staging-only server secret.
-- The raw browser-binding token must never be stored.
CREATE TABLE IF NOT EXISTS ats_identity_v2.oidc_pending (
  state_hash char(64) PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  encrypted_payload bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT pending_lifetime CHECK (expires_at > created_at AND expires_at <= created_at + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS oidc_pending_expiry_idx ON ats_identity_v2.oidc_pending (expires_at);

-- Session tokens remain in a Secure HttpOnly __Host- cookie.
-- Persist only SHA-256 token digests; never persist raw bearer tokens.
CREATE TABLE IF NOT EXISTS ats_identity_v2.staff_sessions (
  session_hash char(64) PRIMARY KEY CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  issuer text NOT NULL,
  subject text NOT NULL,
  staff_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('founder','studio_admin','reviewer','contributor')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY (issuer, subject) REFERENCES ats_identity_v2.staff_identity (issuer, subject) ON DELETE CASCADE,
  CONSTRAINT session_lifetime CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '2 hours')
);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx ON ats_identity_v2.staff_sessions (expires_at);
CREATE INDEX IF NOT EXISTS staff_sessions_subject_idx ON ats_identity_v2.staff_sessions (issuer, subject);

CREATE TABLE IF NOT EXISTS ats_identity_v2.security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN (
    'staff_login','login_rejected','session_revoked','session_expired',
    'staff_deactivated','role_changed','permission_denied'
  )),
  staff_id uuid,
  tenant_id uuid,
  correlation_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS security_events_occurred_at_idx
  ON ats_identity_v2.security_events (occurred_at DESC);

ALTER TABLE ats_identity_v2.staff_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.staff_identity FORCE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.oidc_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.oidc_pending FORCE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.staff_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_identity_v2.security_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA ats_identity_v2 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA ats_identity_v2 FROM PUBLIC, anon, authenticated;

COMMIT;

-- SECURITY / OPERATIONAL REQUIREMENTS (before integration):
-- 1. Use a separate staging database; this SQL is NOT executable authorization.
-- 2. Define backend DB role and narrow grants, RLS policies or audited SECURITY
--    DEFINER routines; no browser/Supabase-anon credentials may access this schema.
-- 3. Provide transactional atomic consume of state and revoke/expiry cleanup.
-- 4. Encrypt verifier/nonce + browser-binding hash with AEAD, staging-only key.
-- 5. Never log tokens, cookies, PKCE verifiers, or encrypted transaction payload.
-- 6. Zero automatic founder creation. Approve each staff identity out of band.
-- 7. Test the migration on disposable staging first, with rollback review.
