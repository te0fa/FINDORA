-- =============================================================================
-- FINDORA — Phase 2 Extensions: AI Stage Config + Domain Table + Attempt Logs
-- Migration: 20260630000002_phase2_extensions.sql
-- Idempotent — safe to re-run.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — Extend ai_agent_configs with system_prompt_override
-- Adds the column if it doesn't exist (never fails on re-run).
-- All 8 existing rows get NULL = "use hardcoded default prompt" — correct.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_agent_configs
  ADD COLUMN IF NOT EXISTS system_prompt_override text;

-- Insert the product_link_gap_fill stage row.
-- Provider = gemini (matches AI_PROVIDER env var — the only active provider in this project).
-- Model = gemini-2.5-flash (matches AI_MODEL env var used by all other AI calls today).
-- temperature=0.1 (very low — we want deterministic category/condition extraction, not creativity).
-- max_tokens=512  (tight budget — we only need 4 fields: productName, category, condition, confidence).
INSERT INTO public.ai_agent_configs (agent_code, enabled, provider, model, temperature, max_tokens)
VALUES ('product_link_gap_fill', true, 'gemini', 'gemini-2.5-flash', 0.1, 512)
ON CONFLICT (agent_code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — allowed_link_domains
-- Replaces feature_flags.config.allowed_domains as source-of-truth.
-- The master feature ON/OFF toggle (feature_flags.enabled) still controls the
-- feature globally — this table controls domain-level granularity on top of it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.allowed_link_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      text UNIQUE NOT NULL,           -- bare domain only, e.g. 'amazon.eg' (no http://)
  label       text NOT NULL,                  -- human-readable name, Arabic-friendly
  enabled     boolean NOT NULL DEFAULT true,  -- soft-disable without deleting
  added_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- RLS: staff can read & write; non-staff cannot see this table at all
ALTER TABLE public.allowed_link_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage allowed link domains" ON public.allowed_link_domains;
CREATE POLICY "Staff manage allowed link domains" ON public.allowed_link_domains
  FOR ALL TO authenticated
  USING (public.fn_is_active_staff_7b())
  WITH CHECK (public.fn_is_active_staff_7b());

-- Seed initial 6 allowed domains (matching the previous feature_flags.config)
INSERT INTO public.allowed_link_domains (domain, label) VALUES
  ('amazon.com',        'Amazon (International)'),
  ('amazon.eg',         'Amazon Egypt'),
  ('amazon.sa',         'Amazon Saudi Arabia'),
  ('noon.com',          'Noon'),
  ('aliexpress.com',    'AliExpress'),
  ('ar.aliexpress.com', 'AliExpress Arabic')
ON CONFLICT (domain) DO NOTHING;

-- Indexes for fast lookup in link-guard.ts
CREATE INDEX IF NOT EXISTS idx_allowed_link_domains_domain  ON public.allowed_link_domains (domain);
CREATE INDEX IF NOT EXISTS idx_allowed_link_domains_enabled ON public.allowed_link_domains (enabled);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — link_attempt_logs
-- Records every customer link submission attempt (accepted & rejected).
-- Used by /admin/link-analytics and the staff hub threshold banner.
--
-- PRIVACY NOTE: raw_url stores protocol+domain+path ONLY — query strings
-- are stripped by the API route before inserting (prevents leaking session
-- tokens that some e-commerce sites append).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.link_attempt_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_url     text NOT NULL,    -- proto+domain+path only, query stripped
  domain      text,             -- extracted hostname; null if URL was unparseable
  outcome     text NOT NULL,    -- 'accepted'|'rejected_domain'|'rejected_malformed'|'rejected_disabled'|'fetch_failed'
  ip_address  text,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

-- RLS: staff can READ; nobody can INSERT via client (API route uses service role)
ALTER TABLE public.link_attempt_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read link attempt logs" ON public.link_attempt_logs;
CREATE POLICY "Staff read link attempt logs" ON public.link_attempt_logs
  FOR SELECT TO authenticated
  USING (public.fn_is_active_staff_7b());

-- Performance indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_link_attempts_domain   ON public.link_attempt_logs (domain);
CREATE INDEX IF NOT EXISTS idx_link_attempts_outcome  ON public.link_attempt_logs (outcome);
CREATE INDEX IF NOT EXISTS idx_link_attempts_created  ON public.link_attempt_logs (created_at DESC);
-- Composite for the "hot domains" banner query (domain + outcome + created_at)
CREATE INDEX IF NOT EXISTS idx_link_attempts_hot      ON public.link_attempt_logs (outcome, domain, created_at DESC);


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
