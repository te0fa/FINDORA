-- =============================================================================
-- FINDORA — Phase 2: Product Link Input Feature Flag + source_type Constraint
-- Migration: 20260630000001_phase2_product_link.sql
-- Apply manually via Supabase SQL Editor — idempotent (safe to re-run)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PRE-EXECUTION SNAPSHOT (recorded before this migration was written):
--   requests table: 12 rows, all source_type = 'manual'
--   No ai_text / ai_voice / ai_image / product_link rows exist yet.
--   Zero data risk from the constraint ALTER below.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. INSERT NEW FEATURE FLAG ROW (idempotent — ON CONFLICT DO NOTHING)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.feature_flags (key, enabled, title, title_ar, description, category, config)
VALUES (
    'product_link_input',
    true,
    'Product Link Input',
    'إدخال رابط منتج',
    'Allows customers to paste a product URL (Amazon, Noon, AliExpress) and auto-extract product name, price, and specs via Open Graph / JSON-LD — zero scraping',
    'ai_concierge',
    '{"allowed_domains": ["amazon.com","amazon.eg","amazon.sa","noon.com","aliexpress.com","ar.aliexpress.com"]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ALTER source_type CHECK CONSTRAINT to include 'product_link'
--
-- IDEMPOTENCY GUARANTEE:
--   This DO block is safe to run multiple times because:
--   a. It checks `information_schema.table_constraints` BEFORE dropping — if
--      the constraint with the old name doesn't exist, the DROP is skipped.
--   b. It checks again BEFORE the ADD to avoid duplicate constraint errors.
--   c. Both checks use the constraint NAME, not the constraint BODY — so even
--      if someone ran a partial version of this migration, this block will
--      correctly detect the current state and act accordingly.
--
-- SAFETY: All 12 existing rows have source_type = 'manual', which is included
-- in both the old and new constraint — zero rows will violate the new check.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_constraint_exists boolean;
BEGIN
    -- Check if the OLD constraint (without 'product_link') currently exists
    SELECT EXISTS (
        SELECT 1
        FROM   information_schema.table_constraints
        WHERE  table_schema    = 'public'
        AND    table_name      = 'requests'
        AND    constraint_name = 'ck_requests_source_type'
        AND    constraint_type = 'CHECK'
    ) INTO v_constraint_exists;

    -- Drop only if it exists (idempotent — no error if already gone)
    IF v_constraint_exists THEN
        ALTER TABLE public.requests DROP CONSTRAINT ck_requests_source_type;
        RAISE NOTICE 'ck_requests_source_type: dropped old constraint (4-value version)';
    ELSE
        RAISE NOTICE 'ck_requests_source_type: constraint not found — skipping drop';
    END IF;

    -- Re-check: add the new constraint only if it still does not exist
    -- (handles the case where this block was partially run before)
    SELECT EXISTS (
        SELECT 1
        FROM   information_schema.table_constraints
        WHERE  table_schema    = 'public'
        AND    table_name      = 'requests'
        AND    constraint_name = 'ck_requests_source_type'
        AND    constraint_type = 'CHECK'
    ) INTO v_constraint_exists;

    IF NOT v_constraint_exists THEN
        ALTER TABLE public.requests
            ADD CONSTRAINT ck_requests_source_type
            CHECK (source_type IN ('manual', 'ai_text', 'ai_voice', 'ai_image', 'product_link'));
        RAISE NOTICE 'ck_requests_source_type: created new constraint (5-value version including product_link)';
    ELSE
        RAISE NOTICE 'ck_requests_source_type: constraint already exists — skipping add (already idempotent-applied)';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
