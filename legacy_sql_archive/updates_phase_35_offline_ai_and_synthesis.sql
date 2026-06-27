-- ============================================================
-- PHASE 35: FINDORA Offline Quotes AI Analysis & Sourcing Synthesis
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.merchant_quotes
ADD COLUMN IF NOT EXISTS ai_match_score integer CHECK (ai_match_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS ai_rating_stars numeric(3,2),
ADD COLUMN IF NOT EXISTS ai_advantages_en text,
ADD COLUMN IF NOT EXISTS ai_advantages_ar text,
ADD COLUMN IF NOT EXISTS ai_verdict_en text,
ADD COLUMN IF NOT EXISTS ai_verdict_ar text,
ADD COLUMN IF NOT EXISTS ai_rank integer;

ALTER TABLE public.report_option_snapshots
ADD COLUMN IF NOT EXISTS disadvantages_en text,
ADD COLUMN IF NOT EXISTS disadvantages_ar text;
