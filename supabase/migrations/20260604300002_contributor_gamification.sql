-- ============================================================
-- FINDORA ECONOMY OS — Phase 1C: Gamification Layer
-- contributor_levels (Access System), badges, streaks, challenges
-- No financial tables in this migration.
-- ============================================================

-- ── 1. CONTRIBUTOR LEVELS (ACCESS SYSTEM, NOT REWARD SYSTEM) ─
-- Referrals unlock CAPABILITIES, not direct cash rewards.
CREATE TABLE IF NOT EXISTS public.contributor_levels (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number             integer     UNIQUE NOT NULL,
  name_en                  text        NOT NULL,
  name_ar                  text        NOT NULL,
  -- Access unlock conditions
  required_active_referrals integer    NOT NULL DEFAULT 0,
  required_performance_pts  numeric    NOT NULL DEFAULT 0,
  -- Economy parameters (admin-editable)
  cash_multiplier          numeric(5,2) NOT NULL DEFAULT 1.0,
  monthly_cap_egp          numeric(12,2),       -- NULL = unlimited
  -- Unlocked features (JSON flags)
  unlocked_features        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Display
  badge_color              text        NOT NULL DEFAULT '#6B7280',
  badge_icon               text        NOT NULL DEFAULT '⭐',
  description_en           text,
  description_ar           text,
  is_active                boolean     NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- Seed the 5-tier Access System
INSERT INTO public.contributor_levels
  (level_number, name_en, name_ar, required_active_referrals, required_performance_pts,
   cash_multiplier, monthly_cap_egp, unlocked_features, badge_color, badge_icon,
   description_en, description_ar)
VALUES
  (1, 'Starter', 'مبتدئ', 0, 0, 1.0, 300,
   '{"can_earn": true, "can_withdraw": false, "premium_tasks": false, "revenue_share": false}'::jsonb,
   '#6B7280', '🌱',
   'Start working immediately. Earn up to 300 EGP/month.',
   'ابدأ الشغل فورًا. اكسب حتى 300 جنيه شهريًا.'),

  (2, 'Builder', 'بانٍ', 3, 50, 1.0, 1000,
   '{"can_earn": true, "can_withdraw": true, "premium_tasks": false, "revenue_share": false}'::jsonb,
   '#10B981', '🔓',
   '3 active referrals unlock cash withdrawal + 1,000 EGP/month cap.',
   '3 إحالات نشطة تفتح سحب النقود + حد 1000 جنيه شهريًا.'),

  (3, 'Grower', 'نامٍ', 5, 150, 1.2, 3000,
   '{"can_earn": true, "can_withdraw": true, "premium_tasks": false, "revenue_share": false}'::jsonb,
   '#3B82F6', '📈',
   '5 active referrals unlock 1.2x multiplier + 3,000 EGP/month cap.',
   '5 إحالات نشطة تفتح مضاعف 1.2x + حد 3000 جنيه شهريًا.'),

  (4, 'Network', 'شبكة', 10, 400, 1.5, NULL,
   '{"can_earn": true, "can_withdraw": true, "premium_tasks": true, "revenue_share": false}'::jsonb,
   '#F59E0B', '🌐',
   '10 active referrals: 1.5x multiplier + premium tasks + unlimited cap.',
   '10 إحالات نشطة: مضاعف 1.5x + مهام مميزة + بلا حد.'),

  (5, 'Legend', 'أسطورة', 25, 1000, 2.0, NULL,
   '{"can_earn": true, "can_withdraw": true, "premium_tasks": true, "revenue_share": true}'::jsonb,
   '#8B5CF6', '👑',
   '25 active referrals: 2x multiplier + revenue share from your network.',
   '25 إحالة نشطة: مضاعف 2x + حصة من إيرادات شبكتك.')

ON CONFLICT (level_number) DO NOTHING;

-- ── 2. CONTRIBUTOR BADGES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_badges (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  badge_type             text        NOT NULL
                         CHECK (badge_type IN ('bronze', 'silver', 'gold', 'elite', 'legend', 'streak_7', 'streak_30', 'first_task', 'top_earner')),
  badge_label_en         text        NOT NULL,
  badge_label_ar         text        NOT NULL,
  earned_at              timestamptz NOT NULL DEFAULT now(),
  referral_count_at_earn integer,
  metadata               jsonb       DEFAULT '{}'::jsonb,
  UNIQUE(contributor_id, badge_type)
);

-- ── 3. CONTRIBUTOR STREAKS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_streaks (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  daily_streak_count     integer     NOT NULL DEFAULT 0,
  weekly_streak_count    integer     NOT NULL DEFAULT 0,
  monthly_streak_count   integer     NOT NULL DEFAULT 0,
  best_daily_streak      integer     NOT NULL DEFAULT 0,
  last_active_date       date,
  streak_bonus_active    boolean     NOT NULL DEFAULT false,
  streak_multiplier      numeric(4,2) NOT NULL DEFAULT 1.0,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 4. REFERRAL CHALLENGES (10-user challenge) ────────────────
CREATE TABLE IF NOT EXISTS public.referral_challenges (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  challenge_type         text        NOT NULL DEFAULT 'standard_10'
                         CHECK (challenge_type IN ('standard_10', 'elite_25', 'sprint_7day')),
  target_count           integer     NOT NULL DEFAULT 10,
  current_active_count   integer     NOT NULL DEFAULT 0,
  reward_description_en  text,
  reward_description_ar  text,
  started_at             timestamptz NOT NULL DEFAULT now(),
  completed_at           timestamptz,
  is_active              boolean     NOT NULL DEFAULT true
);

-- ── 5. CONTRIBUTOR ALERTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_alerts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  alert_type             text        NOT NULL
                         CHECK (alert_type IN ('network_decay', 'earnings_at_risk', 'unlock_available', 'tier_upgrade', 'fraud_flag', 'hr_decision')),
  title_en               text        NOT NULL,
  title_ar               text        NOT NULL,
  body_en                text,
  body_ar                text,
  is_read                boolean     NOT NULL DEFAULT false,
  action_url             text,
  expires_at             timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 6. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contributor_badges_contributor ON public.contributor_badges(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributor_streaks_contributor ON public.contributor_streaks(contributor_id);
CREATE INDEX IF NOT EXISTS idx_referral_challenges_contributor ON public.referral_challenges(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_contributor ON public.contributor_alerts(contributor_id, is_read);

-- ── 7. AUTO-INIT STREAK + CHALLENGE ON NEW CONTRIBUTOR ────────
CREATE OR REPLACE FUNCTION public.fn_init_contributor_gamification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.contributor_streaks (contributor_id)
  VALUES (NEW.id) ON CONFLICT DO NOTHING;

  INSERT INTO public.referral_challenges
    (contributor_id, challenge_type, target_count,
     reward_description_en, reward_description_ar)
  VALUES
    (NEW.id, 'standard_10', 10,
     'Reach 10 active referrals to unlock premium tasks and unlimited earnings.',
     'وصّل لـ 10 إحالات نشطة لتفتح المهام المميزة وإرباح بلا حد.')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_init_contributor_gamification
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_init_contributor_gamification();

-- ── 8. RESOLVE CONTRIBUTOR LEVEL FUNCTION ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_resolve_contributor_level(
  p_active_referrals integer,
  p_performance_pts  numeric DEFAULT 0
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_level integer := 1;
BEGIN
  SELECT level_number INTO v_level
  FROM public.contributor_levels
  WHERE is_active = true
    AND required_active_referrals <= p_active_referrals
    AND required_performance_pts <= p_performance_pts
  ORDER BY level_number DESC
  LIMIT 1;
  RETURN COALESCE(v_level, 1);
END; $$;

-- ── 9. CHECK AND AWARD BADGES ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_award_badges(
  p_contributor_id uuid,
  p_active_referrals integer
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Bronze: 3 referrals
  IF p_active_referrals >= 3 THEN
    INSERT INTO public.contributor_badges
      (contributor_id, badge_type, badge_label_en, badge_label_ar, referral_count_at_earn)
    VALUES (p_contributor_id, 'bronze', 'Bronze Networker', 'شبكي برونزي', p_active_referrals)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Silver: 5 referrals
  IF p_active_referrals >= 5 THEN
    INSERT INTO public.contributor_badges
      (contributor_id, badge_type, badge_label_en, badge_label_ar, referral_count_at_earn)
    VALUES (p_contributor_id, 'silver', 'Silver Builder', 'بانٍ فضي', p_active_referrals)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Gold: 10 referrals
  IF p_active_referrals >= 10 THEN
    INSERT INTO public.contributor_badges
      (contributor_id, badge_type, badge_label_en, badge_label_ar, referral_count_at_earn)
    VALUES (p_contributor_id, 'gold', 'Gold Network', 'شبكة ذهبية', p_active_referrals)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Elite: 25 referrals
  IF p_active_referrals >= 25 THEN
    INSERT INTO public.contributor_badges
      (contributor_id, badge_type, badge_label_en, badge_label_ar, referral_count_at_earn)
    VALUES (p_contributor_id, 'elite', 'Elite Legend', 'أسطورة النخبة', p_active_referrals)
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;

-- ── 10. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.contributor_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_alerts ENABLE ROW LEVEL SECURITY;

-- Service role
CREATE POLICY "service_role_levels"     ON public.contributor_levels     FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_badges"     ON public.contributor_badges     FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_streaks"    ON public.contributor_streaks    FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_challenges" ON public.referral_challenges    FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_alerts"     ON public.contributor_alerts     FOR ALL TO service_role USING (true);

-- Public read levels
CREATE POLICY "levels_public_read"
  ON public.contributor_levels FOR SELECT USING (is_active = true);

-- Contributors read own data
CREATE POLICY "badges_own_read"
  ON public.contributor_badges FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "streaks_own_read"
  ON public.contributor_streaks FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "challenges_own_read"
  ON public.referral_challenges FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "alerts_own_read"
  ON public.contributor_alerts FOR ALL TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

-- HR manage all
CREATE POLICY "levels_hr_manage"      ON public.contributor_levels     FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "badges_hr_read"        ON public.contributor_badges     FOR SELECT TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "challenges_hr_read"    ON public.referral_challenges    FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "alerts_hr_manage"      ON public.contributor_alerts     FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
