-- ============================================================
-- PHASE 34: FINDORA AI Sourcing Quotes Analysis Schema
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.online_merchant_quotes
ADD COLUMN IF NOT EXISTS ai_match_score integer CHECK (ai_match_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS ai_rating_stars numeric(3,2),
ADD COLUMN IF NOT EXISTS ai_advantages_en text,
ADD COLUMN IF NOT EXISTS ai_advantages_ar text,
ADD COLUMN IF NOT EXISTS ai_verdict_en text,
ADD COLUMN IF NOT EXISTS ai_verdict_ar text,
ADD COLUMN IF NOT EXISTS ai_rank integer;
