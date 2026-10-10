-- AT STUDIO RC16 — REVIEW PROPOSAL ONLY — DO NOT AUTO-APPLY
-- Target: isolated Supabase Staging ktzjthouyrasawxqrrop, ats_core PRIVATE schema
-- Purpose: provide the V2 verified server with a tenant-scoped CASE INDEX
-- without granting service_role broad SELECT privileges over client tables.
--
-- IMPORTANT: NO migration is performed by adding this file to GitHub.
-- Installation is a separate, manually reviewed and explicitly authorized task.
-- Verify role, permissions, schema ownership, grants, SQL plan and rollback
-- BEFORE executing anywhere. NEVER install in Production via this proposal.
--
-- Auth boundary: server validates active Founder opaque session and obtains
-- tenant from the verified staff mapping before passing p_tenant_id.
-- Function alone is not authorization of an arbitrary client.
-- service_role remains PRIVATE to the server; never exposed to a browser.

BEGIN;

CREATE OR REPLACE FUNCTION ats_core.ats_list_scoped_case_index_v1(
  p_tenant_id text,
  p_before_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE(
  case_id uuid,
  cursor_updated text,
  analysis_state text,
  label text,
  service text,
  project_goal text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, ats_core
AS $ats_rc16$
BEGIN
  IF p_tenant_id IS NULL
     OR length(btrim(p_tenant_id)) NOT BETWEEN 4 AND 150
     OR (p_before_at IS NULL) <> (p_before_id IS NULL)
  THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT c.id AS case_id,
      to_char(c.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')::text AS cursor_updated,
      c.analysis_state::text,
      COALESCE(
        NULLIF(btrim(l.company_name),''),
        NULLIF(btrim(l.full_name),''),
        'Case'
      )::text AS label,
      l.service::text,
      l.project_goal::text
    FROM ats_core.studio_case_tenant_scope sc
    INNER JOIN ats_core.studio_discovery_cases c ON c.id=sc.case_id
    INNER JOIN ats_core.studio_leads l ON l.id=c.lead_id
    WHERE sc.tenant_id=p_tenant_id
      AND (
        p_before_at IS NULL
        OR (c.updated_at,c.id)<(p_before_at,p_before_id)
      )
    ORDER BY c.updated_at DESC,c.id DESC
    LIMIT 26;
END;
$ats_rc16$;

-- Explicit least-privilege grants, never automatic PUBLIC exposure.
REVOKE ALL ON FUNCTION
 ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
 ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)
 TO service_role;

COMMIT;

-- Post-install read-only verification (SEPARATE MANUAL RUN):
-- SELECT
--   has_function_privilege('service_role',
--     'ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)',
--     'EXECUTE') AS service_role_execute,
--   has_function_privilege('anon',
--     'ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)',
--     'EXECUTE') AS anon_execute,
--   has_function_privilege('authenticated',
--     'ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid)',
--     'EXECUTE') AS authenticated_execute;
-- SELECT * FROM ats_core.ats_list_scoped_case_index_v1(
--   'ats-rc16-nonexistent-test-tenant',NULL::timestamptz,NULL::uuid
-- );
--
-- Rollback (manual with approval):
-- DROP FUNCTION IF EXISTS
--   ats_core.ats_list_scoped_case_index_v1(text,timestamptz,uuid);
