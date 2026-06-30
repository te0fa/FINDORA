-- =============================================================================
-- FINDORA — Phase 3: Returning Customer Lookup Feature Flag + Phone Index
-- Migration: 20260630000003_phase3_history_lookup.sql
-- Apply manually via Supabase SQL Editor — idempotent (safe to re-run)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. INSERT NEW FEATURE FLAG ROW
--
--    config JSON stores operational parameters so they can be changed from
--    the Admin Feature Flags dashboard without a code deploy:
--      • max_results   — how many past requests to return per lookup (default 3)
--      • lookback_days — how far back to search in history (default 365)
--
--    The server code reads these from DB and uses hardcoded defaults ONLY as
--    a final fallback if the config key is absent.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.feature_flags (key, enabled, title, title_ar, description, category, config)
VALUES (
    'request_history_lookup',
    true,
    'Returning Customer Lookup',
    'استرجاع طلبات العميل القديمة',
    'Optional first step in the request wizard — lets returning customers find and reuse their previous requests by phone number. 100% skippable, no auth required.',
    'request_wizard',
    '{"max_results": 3, "lookback_days": 365}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PERFORMANCE INDEX — phone lookups on customer_requests
--
--    The lookup endpoint queries:
--      SELECT ... FROM customer_requests
--      WHERE customer_phone = $1
--      AND created_at >= now() - interval '$2 days'
--      ORDER BY created_at DESC
--      LIMIT $3;
--
--    customer_phone is the column used by the wizard's existing intake step
--    (confirmed by inspection of create/route.ts and fn_create_sourcing_request).
--    Do NOT add a second phone column anywhere — this index covers the existing one.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customer_requests_phone
    ON public.customer_requests (customer_phone);

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
