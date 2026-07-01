-- =============================================================================
-- FINDORA — Phase 3 Fix: Update feature_flags RLS for Anonymous Guest Access
-- Migration: 20260701000000_fix_feature_flags_rls_anon.sql
-- =============================================================================

-- Drop the old authenticated-only policy
DROP POLICY IF EXISTS "feature_flags_select_authenticated" ON public.feature_flags;

-- Create a new unified select policy for both authenticated and anonymous guest users
CREATE POLICY "feature_flags_select_public"
    ON public.feature_flags FOR SELECT
    TO public
    USING (true);
