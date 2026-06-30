-- =============================================================================
-- FINDORA — Phase 1: AI Concierge Feature Flags & Multimodal Intake
-- Migration: 20260630000000_phase1_ai_concierge.sql
-- Apply manually via Supabase SQL Editor — idempotent (safe to re-run)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FEATURE FLAGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text UNIQUE NOT NULL,
    enabled     boolean NOT NULL DEFAULT false,
    title       text NOT NULL,
    title_ar    text NOT NULL,
    description text,
    category    text NOT NULL DEFAULT 'ai_concierge',
    config      jsonb DEFAULT '{}'::jsonb,
    updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at  timestamptz DEFAULT now(),
    created_at  timestamptz DEFAULT now()
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.fn_feature_flags_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.fn_feature_flags_touch_updated_at();

-- Seed the 4 required feature flags (idempotent)
INSERT INTO public.feature_flags (key, enabled, title, title_ar, description, category, config) VALUES
(
    'voice_input',
    true,
    'Voice Input',
    'الإدخال الصوتي',
    'Enables the microphone button in the request wizard using browser Web Speech API',
    'ai_concierge',
    '{"languages":["ar","en"]}'::jsonb
),
(
    'image_upload',
    true,
    'Image Upload',
    'رفع الصور',
    'Allows customers to upload product images, invoices, or catalogs in the request wizard',
    'ai_concierge',
    '{"max_size_mb":8,"max_files":3,"allowed_types":["image/jpeg","image/png","image/webp"]}'::jsonb
),
(
    'ai_concierge_text',
    true,
    'AI Text Concierge',
    'المساعد الذكي - نص',
    'Enables the AI-powered natural language text intake in the request wizard',
    'ai_concierge',
    '{}'::jsonb
),
(
    'manual_builder_v2',
    true,
    'Expanded Manual Form',
    'الفورم اليدوي الموسع',
    'Shows extended manual form fields (brand, condition, budget range, urgency, color, size, notes, reference link)',
    'request_wizard',
    '{}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FEATURE FLAGS AUDIT TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags_audit (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key        text NOT NULL,
    old_value       boolean,
    new_value       boolean,
    changed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_role text,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_audit_key ON public.feature_flags_audit(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_audit_changed_by ON public.feature_flags_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_feature_flags_audit_created_at ON public.feature_flags_audit(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ALTER requests TABLE (add AI tracking columns if not already present)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.requests
    ADD COLUMN IF NOT EXISTS metadata    jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ai_confidence numeric,
    ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual';

-- Add a check constraint on source_type (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'requests' AND constraint_name = 'ck_requests_source_type'
    ) THEN
        ALTER TABLE public.requests
            ADD CONSTRAINT ck_requests_source_type
            CHECK (source_type IN ('manual', 'ai_text', 'ai_voice', 'ai_image'));
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKET — ai-concierge-uploads (private)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ai-concierge-uploads',
    'ai-concierge-uploads',
    false,                          -- private bucket
    10485760,                       -- 10 MB hard cap at storage level
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on both tables
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags_audit ENABLE ROW LEVEL SECURITY;

-- ── feature_flags ──

-- SELECT: any authenticated user (frontend needs to read flags)
DROP POLICY IF EXISTS "feature_flags_select_authenticated" ON public.feature_flags;
CREATE POLICY "feature_flags_select_authenticated"
    ON public.feature_flags FOR SELECT
    TO authenticated
    USING (true);

-- UPDATE: only admin / owner / ai_manager via existing fn_staff_has_role()
DROP POLICY IF EXISTS "feature_flags_update_admin" ON public.feature_flags;
CREATE POLICY "feature_flags_update_admin"
    ON public.feature_flags FOR UPDATE
    TO authenticated
    USING (
        public.fn_staff_has_role('admin')
        OR public.fn_staff_has_role('owner')
        OR public.fn_staff_has_role('ai_manager')
    )
    WITH CHECK (
        public.fn_staff_has_role('admin')
        OR public.fn_staff_has_role('owner')
        OR public.fn_staff_has_role('ai_manager')
    );

-- ── feature_flags_audit ──

-- INSERT: only admin / owner / ai_manager
DROP POLICY IF EXISTS "feature_flags_audit_insert_admin" ON public.feature_flags_audit;
CREATE POLICY "feature_flags_audit_insert_admin"
    ON public.feature_flags_audit FOR INSERT
    TO authenticated
    WITH CHECK (
        public.fn_staff_has_role('admin')
        OR public.fn_staff_has_role('owner')
        OR public.fn_staff_has_role('ai_manager')
    );

-- SELECT: only admin / owner / ai_manager
DROP POLICY IF EXISTS "feature_flags_audit_select_admin" ON public.feature_flags_audit;
CREATE POLICY "feature_flags_audit_select_admin"
    ON public.feature_flags_audit FOR SELECT
    TO authenticated
    USING (
        public.fn_staff_has_role('admin')
        OR public.fn_staff_has_role('owner')
        OR public.fn_staff_has_role('ai_manager')
    );

-- ── Storage RLS for ai-concierge-uploads ──

-- Only service role (server-side) can INSERT objects
DROP POLICY IF EXISTS "ai_uploads_insert_service_role" ON storage.objects;
CREATE POLICY "ai_uploads_insert_service_role"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'ai-concierge-uploads');

-- Service role can SELECT (for signed URL generation)
DROP POLICY IF EXISTS "ai_uploads_select_service_role" ON storage.objects;
CREATE POLICY "ai_uploads_select_service_role"
    ON storage.objects FOR SELECT
    TO service_role
    USING (bucket_id = 'ai-concierge-uploads');

-- Service role can DELETE (cleanup)
DROP POLICY IF EXISTS "ai_uploads_delete_service_role" ON storage.objects;
CREATE POLICY "ai_uploads_delete_service_role"
    ON storage.objects FOR DELETE
    TO service_role
    USING (bucket_id = 'ai-concierge-uploads');

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
