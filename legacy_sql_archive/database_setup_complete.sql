-- ============================================================
-- FINDORA ECONOMY OS — COMPLETE SCHEMA SETUP (Phases 1 - 5)
-- ============================================================

-- ── 1. STAFF ROLES ENFORCEMENT ───────────────────────────────
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
  full_name              text        NOT NULL,
  phone_number           text        UNIQUE NOT NULL,
  national_id_number     text,
  governorate            text,
  referral_code          text        UNIQUE NOT NULL,
  referred_by_id         uuid        REFERENCES public.contributors(id) ON DELETE SET NULL,
  referral_count         integer     NOT NULL DEFAULT 0,
  active_referral_count  integer     NOT NULL DEFAULT 0,
  trust_score            integer     NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  network_health_score   numeric(5,2) NOT NULL DEFAULT 100,
  earning_multiplier     numeric(5,2) NOT NULL DEFAULT 1.0,
  monthly_cap_egp        numeric(12,2),
  phone_verified_at      timestamptz,
  id_verified_at         timestamptz,
  approved_at            timestamptz,
  last_activity_at       timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 3. VERIFICATION & SECURITY LAYERS ─────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_verification_requests (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  id_front_path          text,
  id_back_path           text,
  selfie_path            text,
  phone_number           text        NOT NULL,
  otp_verified           boolean     NOT NULL DEFAULT false,
  otp_verified_at        timestamptz,
  ai_screening_result    jsonb       DEFAULT '{}'::jsonb,
  ai_risk_flags          text[]      DEFAULT '{}',
  ai_confidence_score    numeric(5,2),
  hr_decision            text        NOT NULL DEFAULT 'pending'
                         CHECK (hr_decision IN ('pending', 'approved', 'rejected', 'info_requested')),
  hr_reviewer_staff_id   uuid        REFERENCES public.staff_members(id),
  hr_notes               text,
  hr_decided_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_device_fingerprints (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  ip_address             inet,
  user_agent             text,
  screen_fingerprint     text,
  timezone               text,
  is_flagged             boolean     NOT NULL DEFAULT false,
  flag_reason            text,
  first_seen_at          timestamptz NOT NULL DEFAULT now(),
  last_seen_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 4. TRUST & FRAUD SYSTEM ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fraud_audit_log (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  action_type            text        NOT NULL,
  risk_score             integer     NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  decision               text        NOT NULL CHECK (decision IN ('ALLOW', 'REQUIRE_REVIEW', 'BLOCK')),
  trigger_reason         text        NOT NULL,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_risk_scores (
  contributor_id         uuid        PRIMARY KEY REFERENCES public.contributors(id) ON DELETE CASCADE,
  risk_score             integer     NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  account_state          text        NOT NULL DEFAULT 'safe' CHECK (account_state IN ('safe', 'suspicious', 'blocked')),
  last_evaluated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_hr_reviews (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  fraud_audit_id         uuid        NOT NULL REFERENCES public.fraud_audit_log(id),
  review_status          text        NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  staff_reviewer_id      uuid        REFERENCES public.staff_members(id),
  staff_notes            text,
  decided_at             timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 5. GAMIFICATION LAYER ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_levels (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number               integer     UNIQUE NOT NULL,
  name_en                    text        NOT NULL,
  name_ar                    text        NOT NULL,
  description_en             text        NOT NULL,
  description_ar             text        NOT NULL,
  required_active_referrals  integer     NOT NULL,
  cash_multiplier            numeric(5,2) NOT NULL DEFAULT 1.00,
  monthly_cap_egp            numeric(12,2),
  unlocked_features          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  badge_color                text        NOT NULL DEFAULT 'hsl(220, 10%, 60%)',
  badge_icon                 text        NOT NULL DEFAULT '⭐️',
  is_active                  boolean     NOT NULL DEFAULT true,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.contributor_levels (level_number, name_en, name_ar, description_en, description_ar, required_active_referrals, cash_multiplier, monthly_cap_egp, unlocked_features, badge_color, badge_icon)
VALUES
  (1, 'Novice', 'مبتدئ', 'Start your journey, unlock base cap.', 'ابدأ رحلتك، حد كسب أساسي.', 0, 1.00, 300.00, '{"can_earn": true, "can_withdraw": false, "premium_tasks": false, "revenue_share": false}'::jsonb, 'hsl(220, 10%, 60%)', '🌱'),
  (2, 'Builder', 'مُشيّد', 'Unlock withdrawal capabilities.', 'افتح إمكانية السحب المالي.', 3, 1.10, 1000.00, '{"can_earn": true, "can_withdraw": true, "premium_tasks": false, "revenue_share": false}'::jsonb, 'hsl(152, 69%, 51%)', '🔨'),
  (3, 'Networker', 'مُوسّع شبكات', 'Unlock premium tasks with higher yields.', 'افتح المهام المميزة بعوائد أعلى.', 10, 1.25, 3000.00, '{"can_earn": true, "can_withdraw": true, "premium_tasks": true, "revenue_share": false}'::jsonb, 'hsl(43, 96%, 56%)', '⚡'),
  (4, 'Leader', 'قائد', 'Increased payout caps and speeds.', 'حدود سحب وسرعة أكبر.', 15, 1.50, 8000.00, '{"can_earn": true, "can_withdraw": true, "premium_tasks": true, "revenue_share": false}'::jsonb, 'hsl(258, 89%, 66%)', '🔥'),
  (5, 'Legend', 'أسطورة', 'Unlock L2 network revenue share & unlimited cap.', 'افتح أرباح الشبكة L2 وبدون سقف أرباح.', 25, 2.00, NULL, '{"can_earn": true, "can_withdraw": true, "premium_tasks": true, "revenue_share": true}'::jsonb, 'hsl(0, 84%, 60%)', '👑')
ON CONFLICT (level_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contributor_badges (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  badge_type             text        NOT NULL,
  badge_label_en         text        NOT NULL,
  badge_label_ar         text        NOT NULL,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  earned_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contributor_badge UNIQUE (contributor_id, badge_type)
);

CREATE TABLE IF NOT EXISTS public.contributor_streaks (
  contributor_id         uuid        PRIMARY KEY REFERENCES public.contributors(id) ON DELETE CASCADE,
  daily_streak_count     integer     NOT NULL DEFAULT 0 CHECK (daily_streak_count >= 0),
  weekly_streak_count    integer     NOT NULL DEFAULT 0 CHECK (weekly_streak_count >= 0),
  monthly_streak_count   integer     NOT NULL DEFAULT 0 CHECK (monthly_streak_count >= 0),
  best_daily_streak      integer     NOT NULL DEFAULT 0,
  last_active_date       date,
  streak_bonus_active    boolean     NOT NULL DEFAULT false,
  streak_multiplier      numeric(4,2) NOT NULL DEFAULT 1.00,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_challenges (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  target_count           integer     NOT NULL CHECK (target_count > 0),
  current_active_count   integer     NOT NULL DEFAULT 0,
  completed_at           timestamptz,
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_alerts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  alert_type             text        NOT NULL,
  title_en               text        NOT NULL,
  title_ar               text        NOT NULL,
  body_en                text,
  body_ar                text,
  is_read                boolean     NOT NULL DEFAULT false,
  expires_at             timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 6. ECONOMY STABILIZER ENGINE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.economy_config (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key           text    UNIQUE NOT NULL,
  value                jsonb   NOT NULL DEFAULT '{}'::jsonb,
  description_en       text,
  description_ar       text,
  is_system_controlled boolean NOT NULL DEFAULT false,
  updated_by_staff_id  uuid    REFERENCES public.staff_members(id),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES
  ('global', '{"referral_system_enabled": true, "withdrawals_enabled": true, "gamification_enabled": true, "stabilizer_enabled": true}'::jsonb, 'Global system toggles', 'إعدادات النظام العامة', false),
  ('referral_settings', '{"max_referrals_per_day_new_user": 2, "max_referrals_per_week": 10, "activity_window_days": 30, "l2_passive_percentage": 0.07}'::jsonb, 'Referral velocity and L2 chain settings', 'إعدادات سرعة الإحالة وسلسلة المستوى الثاني', false),
  ('withdrawal_settings', '{"delay_hours": 24, "min_withdrawal_egp": 50, "max_daily_withdrawal_egp": 2000}'::jsonb, 'Withdrawal delay and limits', 'تأخير وحدود السحب', false),
  ('decay_thresholds', '{"10": 1.0, "7": 0.8, "5": 0.6, "3": 0.4, "0": 0.3}'::jsonb, 'Network decay multiplier by active referral count', 'مضاعف التراجع حسب عدد الإحالات النشطة', false),
  ('stabilizer_config', '{"weekly_growth_warning_pct": 25, "weekly_growth_critical_pct": 50, "auto_reduce_multiplier_warning": 0.85, "auto_reduce_multiplier_critical": 0.70, "check_interval_hours": 24}'::jsonb, 'Economy stabilizer thresholds and auto-adjustment rules', 'عتبات المثبت الاقتصادي وقواعد الضبط التلقائي', true)
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.economy_stabilizer_snapshots (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date          date        NOT NULL,
  total_payouts_egp      numeric(14,2) NOT NULL DEFAULT 0,
  total_referral_rewards_egp numeric(14,2) NOT NULL DEFAULT 0,
  total_task_rewards_egp numeric(14,2) NOT NULL DEFAULT 0,
  active_contributors    integer     NOT NULL DEFAULT 0,
  new_contributors       integer     NOT NULL DEFAULT 0,
  new_referrals          integer     NOT NULL DEFAULT 0,
  payout_growth_pct_wow  numeric(7,2),
  contributor_growth_pct_wow numeric(7,2),
  stabilizer_status      text        NOT NULL DEFAULT 'normal' CHECK (stabilizer_status IN ('normal', 'warning', 'critical', 'frozen')),
  multiplier_adjustment  numeric(5,2) NOT NULL DEFAULT 1.0,
  auto_action_taken      text,
  computed_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.economy_stabilizer_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type           text        NOT NULL CHECK (event_type IN ('warning_triggered', 'critical_triggered', 'multiplier_reduced', 'multiplier_restored', 'admin_override', 'system_frozen')),
  trigger_metric       text,
  trigger_value        numeric,
  threshold_value      numeric,
  action_taken         text,
  old_multiplier       numeric(5,2),
  new_multiplier       numeric(5,2),
  triggered_by         text        NOT NULL DEFAULT 'cron',
  staff_override_id    uuid        REFERENCES public.staff_members(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 7. FINANCIAL LAYER (WALLETS & WITHDRAWALS) ─────────────────
CREATE TABLE IF NOT EXISTS public.contributor_wallets (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  balance_egp            numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (balance_egp >= 0),
  points_balance         integer     NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  pending_withdrawal_egp numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (pending_withdrawal_egp >= 0),
  lifetime_earned_egp    numeric(14,2) NOT NULL DEFAULT 0.00,
  lifetime_withdrawn_egp numeric(14,2) NOT NULL DEFAULT 0.00,
  last_transaction_at    timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  wallet_id              uuid        NOT NULL REFERENCES public.contributor_wallets(id) ON DELETE RESTRICT,
  tx_type                text        NOT NULL CHECK (tx_type IN ('task_reward', 'referral_reward', 'streak_bonus', 'network_revenue_share', 'withdrawal', 'manual_adjustment', 'fraud_clawback')),
  amount_egp             numeric(12,2) NOT NULL,
  amount_points          integer     NOT NULL DEFAULT 0,
  reference_type         text        CHECK (reference_type IN ('task', 'referral', 'withdrawal_request', 'admin_adjustment')),
  reference_id           uuid,
  fraud_audit_id         uuid        REFERENCES public.fraud_audit_log(id),
  description_en         text,
  description_ar         text,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_referrals (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id            uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  referred_id            uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  level                  integer     NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
  status                 text        NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'approved', 'active', 'inactive', 'frozen')),
  first_activity_at      timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contributor_withdrawals (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  wallet_id              uuid        NOT NULL REFERENCES public.contributor_wallets(id) ON DELETE RESTRICT,
  amount_egp             numeric(12,2) NOT NULL CHECK (amount_egp > 0),
  payment_method         text        NOT NULL CHECK (payment_method IN ('instapay', 'vodafone_cash', 'bank_transfer')),
  payment_details        jsonb       NOT NULL,
  status                 text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected', 'held_for_review')),
  fraud_audit_id         uuid        REFERENCES public.fraud_audit_log(id),
  staff_reviewer_id      uuid        REFERENCES public.staff_members(id),
  rejection_reason       text,
  processed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 8. SCARCITY ENGINE (REGISTRATION CAPS) ───────────────────
CREATE TABLE IF NOT EXISTS public.contributor_scarcity_limits (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  max_slots              integer     NOT NULL DEFAULT 50 CHECK (max_slots >= 0),
  taken_slots            integer     NOT NULL DEFAULT 0 CHECK (taken_slots <= max_slots),
  closes_at              timestamptz NOT NULL,
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.contributor_scarcity_limits (max_slots, taken_slots, closes_at, is_active)
VALUES (50, 0, now() + INTERVAL '7 days', true)
ON CONFLICT DO NOTHING;

-- ── 9. SUPPLY ENGINE: SUBMISSIONS ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_submissions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  submission_type        text        NOT NULL CHECK (submission_type IN ('price_report', 'product_link', 'vendor_offer')),
  product_id             uuid,
  vendor_id              uuid,
  price_reported         numeric(12,2),
  details                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status                 text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 10. REVIEW ENGINE & Real-Time Trust Score Update ─────────
CREATE TABLE IF NOT EXISTS public.contributor_reviews (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  customer_id            uuid,
  rating                 integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment                text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 11. TRIGGERS & FUNCTIONS ──────────────────────────────────

-- A. Auto-Create Wallet
CREATE OR REPLACE FUNCTION public.fn_init_contributor_wallet()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.contributor_wallets (contributor_id)
  VALUES (NEW.id)
  ON CONFLICT (contributor_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER trg_init_contributor_wallet
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_init_contributor_wallet();

-- B. Auto-Link Referrals
CREATE OR REPLACE FUNCTION public.fn_link_referral()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_l1_referrer uuid;
  v_l2_referrer uuid;
BEGIN
  IF NEW.referred_by_id IS NOT NULL THEN
    v_l1_referrer := NEW.referred_by_id;
    INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
    VALUES (v_l1_referrer, NEW.id, 1, 'signed_up');

    SELECT referred_by_id INTO v_l2_referrer FROM public.contributors WHERE id = v_l1_referrer;
    IF v_l2_referrer IS NOT NULL THEN
      INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
      VALUES (v_l2_referrer, NEW.id, 2, 'signed_up');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER trg_link_referral
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_link_referral();

-- C. Real-Time Trust Score Update Trigger
CREATE OR REPLACE FUNCTION public.fn_update_contributor_trust_score()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_avg_rating numeric;
  v_score_delta integer;
  v_new_score integer;
BEGIN
  SELECT COALESCE(AVG(rating), 3.0) INTO v_avg_rating
  FROM public.contributor_reviews
  WHERE contributor_id = NEW.contributor_id;

  v_score_delta := CASE
    WHEN v_avg_rating >= 4.5 THEN 10
    WHEN v_avg_rating >= 3.5 THEN 5
    WHEN v_avg_rating >= 2.5 THEN 0
    WHEN v_avg_rating >= 1.5 THEN -10
    ELSE -20
  END;

  SELECT LEAST(100, GREATEST(0, trust_score + v_score_delta)) INTO v_new_score
  FROM public.contributors
  WHERE id = NEW.contributor_id;

  UPDATE public.contributors
  SET trust_score = v_new_score
  WHERE id = NEW.contributor_id;

  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER trg_update_contributor_trust_score
  AFTER INSERT ON public.contributor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_contributor_trust_score();

-- D. Process Wallet Transactions
CREATE OR REPLACE FUNCTION public.fn_process_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_egp > 0 THEN
    UPDATE public.contributor_wallets
    SET balance_egp = balance_egp + NEW.amount_egp,
        points_balance = points_balance + NEW.amount_points,
        lifetime_earned_egp = lifetime_earned_egp + NEW.amount_egp,
        last_transaction_at = now()
    WHERE id = NEW.wallet_id;
  
  ELSIF NEW.amount_egp < 0 THEN
    IF NEW.tx_type = 'withdrawal' THEN
      UPDATE public.contributor_wallets
      SET pending_withdrawal_egp = pending_withdrawal_egp + NEW.amount_egp,
          lifetime_withdrawn_egp = lifetime_withdrawn_egp - NEW.amount_egp,
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    ELSE
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp,
          points_balance = GREATEST(0, points_balance + NEW.amount_points),
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER trg_process_wallet_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_process_wallet_transaction();

-- E. Auto referral code generator
CREATE OR REPLACE FUNCTION public.fn_generate_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars        text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code         text;
  i            integer;
  attempt      integer := 0;
  max_attempts integer := 10;
  found_unique boolean := false;
BEGIN
  WHILE attempt < max_attempts AND NOT found_unique LOOP
    code := '';
    FOR i IN 1..10 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.contributors WHERE referral_code = code) THEN
      found_unique := true;
    ELSE
      attempt := attempt + 1;
    END IF;
  END LOOP;

  IF NOT found_unique THEN
    RAISE EXCEPTION 'Failed to generate a unique referral code after % attempts.', max_attempts;
  END IF;

  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_contributors_auto_referral_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.fn_generate_referral_code();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER trg_contributors_auto_referral_code
  BEFORE INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_contributors_auto_referral_code();

-- F. HR checks helper
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

-- ============================================================
-- FINDORA ECONOMY OS — Phase 6: Economy Control System
-- Centralized dynamic configurations for multipliers and risk
-- ============================================================

-- ── 1. STAFF ROLES ENFORCEMENT UPDATE ────────────────────────
ALTER TABLE public.staff_member_roles DROP CONSTRAINT IF EXISTS ck_role_code_allowed;
ALTER TABLE public.staff_member_roles ADD CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
  'admin', 'owner', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support',
  'content_manager', 'deals_manager', 'news_manager', 'pricing_manager',
  'quality_reviewer', 'payment_reviewer', 'vendor_relations',
  'contributor_hr', 'contributor_admin', 'fraud_reviewer',
  'economy_architect' -- NEW ROLE ADDED
));

-- ── 2. ECONOMY CONFIG INSERTS ────────────────────────────────
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES
  ('risk_thresholds', '{"require_review": 50, "block": 80}'::jsonb, 'Fraud risk score thresholds for financial actions', 'حدود نقاط الخطر للإجراءات المالية', true),
  ('role_multipliers', '{"field_scout": 1.2, "store_insider": 1.0, "casual": 0.8}'::jsonb, 'Base payout multipliers per contributor role', 'مضاعفات الدفع الأساسية حسب دور المساهم', true),
  ('landing_page_settings', '{"open_slots_scout": 23, "open_slots_insider": 10, "closing_date": "2026-06-15T00:00:00Z", "banner_active": true}'::jsonb, 'Landing page dynamic marketing details', 'إعدادات تسويقية لصفحة الهبوط والتسجيل', false)
ON CONFLICT (config_key) DO UPDATE SET 
  value = EXCLUDED.value;

-- ── 3. UPDATE HR PERMISSIONS ─────────────────────────────────
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
        AND r.role_code IN ('admin', 'owner', 'contributor_hr', 'contributor_admin', 'fraud_reviewer', 'economy_architect')
      ))
  );
END; $$;

-- ── 4. UPDATE GATE ACTION TO USE DYNAMIC THRESHOLDS ──────────
CREATE OR REPLACE FUNCTION public.fn_gate_action(
  p_contributor_id  uuid,
  p_action_type     text,
  p_metadata        jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_risk               record;
  v_decision           text;
  v_reason             text;
  v_review_id          uuid;
  v_log_id             uuid;
  v_thresholds         jsonb;
  v_require_review_val integer := 50;
  v_block_val          integer := 80;
BEGIN
  -- 0. Fetch Dynamic Thresholds
  SELECT value INTO v_thresholds FROM public.economy_config WHERE config_key = 'risk_thresholds';
  IF FOUND AND v_thresholds IS NOT NULL THEN
    v_require_review_val := COALESCE((v_thresholds->>'require_review')::integer, 50);
    v_block_val          := COALESCE((v_thresholds->>'block')::integer, 80);
  END IF;

  -- 1. Fetch current risk
  SELECT * INTO v_risk
  FROM public.contributor_risk_scores
  WHERE contributor_id = p_contributor_id;

  IF NOT FOUND THEN
    -- Auto-initialize and compute
    PERFORM public.fn_compute_risk_score(p_contributor_id);
    SELECT * INTO v_risk
    FROM public.contributor_risk_scores
    WHERE contributor_id = p_contributor_id;
  END IF;

  -- 2. Check account state
  IF v_risk.account_state = 'frozen' THEN
    v_decision := 'BLOCK';
    v_reason   := 'Account is frozen. All financial actions are blocked.';
  ELSIF v_risk.account_state = 'suspended' THEN
    v_decision := 'BLOCK';
    v_reason   := 'Account is suspended.';
  -- 3. Dynamic Risk thresholds
  ELSIF v_risk.risk_score >= v_block_val THEN
    v_decision := 'BLOCK';
    v_reason   := format('Risk score %s >= %s (Block Threshold). Auto-blocked.', v_risk.risk_score, v_block_val);
    -- Freeze account
    UPDATE public.contributor_risk_scores
    SET account_state = 'frozen'
    WHERE contributor_id = p_contributor_id;
    UPDATE public.contributors
    SET status = 'frozen'
    WHERE id = p_contributor_id;
  ELSIF v_risk.risk_score >= v_require_review_val THEN
    v_decision := 'REQUIRE_REVIEW';
    v_reason   := format('Risk score %s >= %s (Review Threshold). Human review required.', v_risk.risk_score, v_require_review_val);
    -- Create HR review task
    INSERT INTO public.contributor_hr_reviews
      (contributor_id, review_type, reason, risk_score)
    VALUES
      (p_contributor_id, 'risk_flagged', v_reason, v_risk.risk_score)
    RETURNING id INTO v_review_id;
  ELSE
    v_decision := 'ALLOW';
    v_reason   := format('Risk score %s < %s. Action permitted.', v_risk.risk_score, v_require_review_val);
  END IF;

  -- 4. Immutable audit log entry
  INSERT INTO public.fraud_audit_log
    (contributor_id, action_type, gate_decision, risk_score_at_time, reason, metadata, triggered_by)
  VALUES
    (p_contributor_id, p_action_type, v_decision, v_risk.risk_score, v_reason, p_metadata, 'api')
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'decision',   v_decision,
    'reason',     v_reason,
    'risk_score', v_risk.risk_score,
    'log_id',     v_log_id,
    'review_id',  v_review_id
  );
END; $$;
