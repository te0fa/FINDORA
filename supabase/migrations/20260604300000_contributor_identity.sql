-- ============================================================
-- FINDORA ECONOMY OS — Phase 1A: Identity Layer
-- contributors, verification, device fingerprints
-- ============================================================

-- ── 1. STAFF ROLE CONSTRAINT: add contributor management roles ─
ALTER TABLE public.staff_member_roles DROP CONSTRAINT IF EXISTS ck_role_code_allowed;
ALTER TABLE public.staff_member_roles ADD CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
  'admin', 'owner', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support',
  'content_manager', 'deals_manager', 'news_manager', 'pricing_manager',
  'quality_reviewer', 'payment_reviewer', 'vendor_relations',
  'contributor_hr', 'contributor_admin', 'fraud_reviewer'
));

-- ── 2. CONTRIBUTORS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributors (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id           uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role                   text        NOT NULL DEFAULT 'casual'
                         CHECK (role IN ('field_scout', 'store_insider', 'casual')),
  status                 text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'active', 'suspended', 'under_review', 'frozen')),
  -- Identity
  full_name              text        NOT NULL,
  phone_number           text        UNIQUE NOT NULL,
  national_id_number     text,
  governorate            text,
  -- Referral system (access-based, not reward-based)
  referral_code          text        UNIQUE NOT NULL,
  referred_by_id         uuid        REFERENCES public.contributors(id) ON DELETE SET NULL,
  referral_count         integer     NOT NULL DEFAULT 0,
  active_referral_count  integer     NOT NULL DEFAULT 0,
  -- Trust & scoring
  trust_score            integer     NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  network_health_score   numeric(5,2) NOT NULL DEFAULT 100,
  -- Economy (computed, not hardcoded)
  earning_multiplier     numeric(5,2) NOT NULL DEFAULT 1.0,
  monthly_cap_egp        numeric(12,2),         -- NULL = unlimited
  -- Timestamps
  phone_verified_at      timestamptz,
  id_verified_at         timestamptz,
  approved_at            timestamptz,
  last_activity_at       timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 3. CONTRIBUTOR VERIFICATION REQUESTS ─────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_verification_requests (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  -- Document paths (stored in Supabase Storage)
  id_front_path          text,
  id_back_path           text,
  selfie_path            text,
  -- Identity data
  phone_number           text        NOT NULL,
  otp_verified           boolean     NOT NULL DEFAULT false,
  otp_verified_at        timestamptz,
  -- AI screening
  ai_screening_result    jsonb       DEFAULT '{}'::jsonb,
  ai_risk_flags          text[]      DEFAULT '{}',
  ai_confidence_score    numeric(5,2),
  -- HR decision (human-in-loop)
  hr_decision            text        NOT NULL DEFAULT 'pending'
                         CHECK (hr_decision IN ('pending', 'approved', 'rejected', 'info_requested')),
  hr_reviewer_staff_id   uuid        REFERENCES public.staff_members(id),
  hr_notes               text,
  hr_decided_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 4. DEVICE FINGERPRINTS (fraud detection) ──────────────────
CREATE TABLE IF NOT EXISTS public.contributor_device_fingerprints (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  ip_address             inet,
  user_agent             text,
  screen_fingerprint     text,       -- hash of screen resolution + color depth + timezone
  timezone               text,
  is_flagged             boolean     NOT NULL DEFAULT false,
  flag_reason            text,
  first_seen_at          timestamptz NOT NULL DEFAULT now(),
  last_seen_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 5. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contributors_auth_user ON public.contributors(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_contributors_referral_code ON public.contributors(referral_code);
CREATE INDEX IF NOT EXISTS idx_contributors_referred_by ON public.contributors(referred_by_id);
CREATE INDEX IF NOT EXISTS idx_contributors_status ON public.contributors(status);
CREATE INDEX IF NOT EXISTS idx_contributors_phone ON public.contributors(phone_number);
CREATE INDEX IF NOT EXISTS idx_verif_requests_contributor ON public.contributor_verification_requests(contributor_id);
CREATE INDEX IF NOT EXISTS idx_verif_requests_hr_decision ON public.contributor_verification_requests(hr_decision);
CREATE INDEX IF NOT EXISTS idx_device_fp_contributor ON public.contributor_device_fingerprints(contributor_id);
CREATE INDEX IF NOT EXISTS idx_device_fp_ip ON public.contributor_device_fingerprints(ip_address);

-- ── 6. AUTO-UPDATE TIMESTAMPS ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_contributors_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_contributors_updated_at
  BEFORE UPDATE ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_contributors_set_updated_at();

CREATE TRIGGER trg_verif_requests_updated_at
  BEFORE UPDATE ON public.contributor_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_contributors_set_updated_at();

-- ── 7. REFERRAL CODE GENERATOR ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generate_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   text := '';
  i      integer;
BEGIN
  FOR i IN 1..10 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  -- Ensure uniqueness
  IF EXISTS (SELECT 1 FROM public.contributors WHERE referral_code = code) THEN
    RETURN public.fn_generate_referral_code();
  END IF;
  RETURN code;
END; $$;

-- ── 8. DEFAULT REFERRAL CODE ON INSERT ───────────────────────
CREATE OR REPLACE FUNCTION public.fn_contributors_auto_referral_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.fn_generate_referral_code();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_contributors_auto_referral_code
  BEFORE INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_contributors_auto_referral_code();

-- ── 9. HELPER: check if user is contributor_hr staff ─────────
CREATE OR REPLACE FUNCTION public.fn_is_contributor_hr()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_members s
    WHERE s.auth_user_id = auth.uid() AND s.is_active = true
    AND (s.staff_role IN ('admin', 'owner')
      OR EXISTS (
        SELECT 1 FROM public.staff_member_roles r
        WHERE r.staff_member_id = s.id AND r.is_active = true
        AND r.role_code IN ('admin', 'owner', 'contributor_hr', 'contributor_admin', 'fraud_reviewer')
      ))
  );
END; $$;

-- ── 10. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_contributors"
  ON public.contributors FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_verif_requests"
  ON public.contributor_verification_requests FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_device_fp"
  ON public.contributor_device_fingerprints FOR ALL TO service_role USING (true);

-- Contributors can read/update their own profile
CREATE POLICY "contributors_read_own"
  ON public.contributors FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "contributors_update_own"
  ON public.contributors FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Public can insert (apply) — status starts as 'pending', enforced by DEFAULT
CREATE POLICY "contributors_public_insert"
  ON public.contributors FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() AND status = 'pending');

-- HR staff can manage all contributors
CREATE POLICY "contributor_hr_manage"
  ON public.contributors FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());

-- Verification requests: contributor reads own, HR manages all
CREATE POLICY "verif_requests_own_read"
  ON public.contributor_verification_requests FOR SELECT TO authenticated
  USING (contributor_id IN (
    SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "verif_requests_own_insert"
  ON public.contributor_verification_requests FOR INSERT TO authenticated
  WITH CHECK (contributor_id IN (
    SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "verif_requests_hr"
  ON public.contributor_verification_requests FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());

-- Device fingerprints: HR + fraud_reviewer only
CREATE POLICY "device_fp_hr"
  ON public.contributor_device_fingerprints FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());
