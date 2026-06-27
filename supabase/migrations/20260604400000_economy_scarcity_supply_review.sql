-- ============================================================
-- FINDORA ECONOMY OS — Phase 5: Scarcity, Supply & Review Layer
-- ============================================================

-- ── 1. SCARCITY REGISTRATION LIMITS ───────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_scarcity_limits (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  max_slots              integer     NOT NULL DEFAULT 50 CHECK (max_slots >= 0),
  taken_slots            integer     NOT NULL DEFAULT 0 CHECK (taken_slots <= max_slots),
  closes_at              timestamptz NOT NULL,
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Seed default registration scarcity slot
INSERT INTO public.contributor_scarcity_limits (max_slots, taken_slots, closes_at, is_active)
VALUES (50, 0, now() + INTERVAL '7 days', true)
ON CONFLICT DO NOTHING;

-- ── 2. SUPPLY ENGINE: SUBMISSIONS ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_submissions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  submission_type        text        NOT NULL CHECK (submission_type IN ('price_report', 'product_link', 'vendor_offer')),
  product_id             uuid,       -- optional link to systems products table if mapped
  vendor_id              uuid,       -- optional link to systems vendors table if mapped
  price_reported         numeric(12,2),
  details                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status                 text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 3. REVIEW ENGINE: CUSTOMER RATINGS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_reviews (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  customer_id            uuid,       -- optional link to customer table if applicable
  rating                 integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment                text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 4. REAL-TIME TRUST SCORE UPDATER (TRIGGER) ─────────────────
CREATE OR REPLACE FUNCTION public.fn_update_contributor_trust_score()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_avg_rating numeric;
  v_score_delta integer;
  v_new_score integer;
BEGIN
  -- Compute average rating of the contributor
  SELECT COALESCE(AVG(rating), 3.0) INTO v_avg_rating
  FROM public.contributor_reviews
  WHERE contributor_id = NEW.contributor_id;

  -- Map average rating (1 to 5) to trust score updates
  -- Base trust score is 50. 
  -- Rating 5.0 -> +10 trust score
  -- Rating 4.0 -> +5 trust score
  -- Rating 3.0 -> +0 trust score
  -- Rating 2.0 -> -10 trust score
  -- Rating 1.0 -> -20 trust score
  v_score_delta := CASE
    WHEN v_avg_rating >= 4.5 THEN 10
    WHEN v_avg_rating >= 3.5 THEN 5
    WHEN v_avg_rating >= 2.5 THEN 0
    WHEN v_avg_rating >= 1.5 THEN -10
    ELSE -20
  END;

  -- Ensure trust score stays within [0, 100]
  SELECT LEAST(100, GREATEST(0, trust_score + v_score_delta)) INTO v_new_score
  FROM public.contributors
  WHERE id = NEW.contributor_id;

  UPDATE public.contributors
  SET trust_score = v_new_score
  WHERE id = NEW.contributor_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_update_contributor_trust_score
  AFTER INSERT ON public.contributor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_contributor_trust_score();

-- ── 5. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_contributor ON public.contributor_submissions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.contributor_submissions(status);
CREATE INDEX IF NOT EXISTS idx_reviews_contributor ON public.contributor_reviews(contributor_id);

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.contributor_scarcity_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_reviews ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_scarcity" ON public.contributor_scarcity_limits FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_submissions" ON public.contributor_submissions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_reviews" ON public.contributor_reviews FOR ALL TO service_role USING (true);

-- Read access for landing page scarcity bar (public/authenticated)
CREATE POLICY "scarcity_read_all" ON public.contributor_scarcity_limits FOR SELECT USING (is_active = true);

-- Submissions: own read/write
CREATE POLICY "submissions_own_read" ON public.contributor_submissions FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "submissions_own_insert" ON public.contributor_submissions FOR INSERT TO authenticated
  WITH CHECK (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

-- HR / Admin controls
CREATE POLICY "submissions_hr_manage" ON public.contributor_submissions FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "scarcity_admin_manage" ON public.contributor_scarcity_limits FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "reviews_hr_read" ON public.contributor_reviews FOR SELECT TO authenticated USING (public.fn_is_contributor_hr());
