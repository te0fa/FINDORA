-- =============================================================================
-- FINDORA — Remediation P2-05: Public-Safe Feature Flags Read Boundary
-- Migration: 20260927000000_p2_05_public_feature_flags_boundary.sql
--
-- Objective:
--   Reduce the unauthenticated public data surface on feature flags to ONLY
--   the minimal projection required by the public customer request wizard:
--     (key, enabled, config)
--
--   Revoke unauthenticated anon access to the base public.feature_flags table,
--   protecting internal/management metadata:
--     (id, title, title_ar, description, category, updated_by, created_at, updated_at)
--
--   Preserve full staff/admin management capabilities on public.feature_flags.
--   Preserve existing staff-only protection on public.feature_flags_audit.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DEDICATED PUBLIC-SAFE VIEW
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.public_feature_flags
WITH (security_barrier = true) AS
SELECT
    key,
    enabled,
    config
FROM public.feature_flags
WHERE key IN (
    'voice_input',
    'image_upload',
    'ai_concierge_text',
    'manual_builder_v2',
    'product_link_input',
    'request_history_lookup'
);

COMMENT ON VIEW public.public_feature_flags IS
    'Public-safe read-only projection of feature flags for customer wizard clients. Excludes internal descriptions, categories, timestamps, and staff metadata.';

-- Grant read-only access to anon, authenticated, and service_role
REVOKE ALL ON public.public_feature_flags FROM anon, authenticated;
GRANT SELECT ON public.public_feature_flags TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HARDEN BASE TABLE (public.feature_flags) RLS & PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the legacy public SELECT policy that permitted anon access to all columns
DROP POLICY IF EXISTS "feature_flags_select_public" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_select_authenticated" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_select_staff" ON public.feature_flags;

-- Restrict SELECT on the base table strictly to authenticated staff (admin/owner/ai_manager)
CREATE POLICY "feature_flags_select_staff"
    ON public.feature_flags FOR SELECT
    TO authenticated
    USING (
        public.fn_staff_has_role('admin')
        OR public.fn_staff_has_role('owner')
        OR public.fn_staff_has_role('ai_manager')
    );

-- Ensure anon has no table-level privileges on the base table
REVOKE ALL ON public.feature_flags FROM anon;
