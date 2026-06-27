-- ============================================================
-- FINDORA ECONOMY OS — Phase 1D: Economy Stabilizer Engine
-- Monitors payout growth, detects inflation, auto-adjusts multipliers
-- ============================================================

-- ── 1. ECONOMY CONFIG TABLE ───────────────────────────────────
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

-- Seed default economy configuration
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES
  ('global',
   '{"referral_system_enabled": true, "withdrawals_enabled": true, "gamification_enabled": true, "stabilizer_enabled": true}'::jsonb,
   'Global system toggles', 'إعدادات النظام العامة', false),

  ('referral_settings',
   '{"max_referrals_per_day_new_user": 2, "max_referrals_per_week": 10, "activity_window_days": 30, "l2_passive_percentage": 0.07}'::jsonb,
   'Referral velocity and L2 chain settings', 'إعدادات سرعة الإحالة وسلسلة المستوى الثاني', false),

  ('withdrawal_settings',
   '{"delay_hours": 24, "min_withdrawal_egp": 50, "max_daily_withdrawal_egp": 2000}'::jsonb,
   'Withdrawal delay and limits', 'تأخير وحدود السحب', false),

  ('decay_thresholds',
   '{"10": 1.0, "7": 0.8, "5": 0.6, "3": 0.4, "0": 0.3}'::jsonb,
   'Network decay multiplier by active referral count', 'مضاعف التراجع حسب عدد الإحالات النشطة', false),

  ('stabilizer_config',
   '{"weekly_growth_warning_pct": 25, "weekly_growth_critical_pct": 50, "auto_reduce_multiplier_warning": 0.85, "auto_reduce_multiplier_critical": 0.70, "check_interval_hours": 24}'::jsonb,
   'Economy stabilizer thresholds and auto-adjustment rules', 'عتبات المثبت الاقتصادي وقواعد الضبط التلقائي', true)

ON CONFLICT (config_key) DO NOTHING;

-- ── 2. ECONOMY STABILIZER SNAPSHOTS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.economy_stabilizer_snapshots (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date          date        NOT NULL,
  -- Payout metrics
  total_payouts_egp      numeric(14,2) NOT NULL DEFAULT 0,
  total_referral_rewards_egp numeric(14,2) NOT NULL DEFAULT 0,
  total_task_rewards_egp numeric(14,2) NOT NULL DEFAULT 0,
  -- Growth metrics
  active_contributors    integer     NOT NULL DEFAULT 0,
  new_contributors       integer     NOT NULL DEFAULT 0,
  new_referrals          integer     NOT NULL DEFAULT 0,
  -- Computed growth rates
  payout_growth_pct_wow  numeric(7,2), -- week-over-week payout growth %
  contributor_growth_pct_wow numeric(7,2),
  -- Stabilizer state
  stabilizer_status      text        NOT NULL DEFAULT 'normal'
                         CHECK (stabilizer_status IN ('normal', 'warning', 'critical', 'frozen')),
  multiplier_adjustment  numeric(5,2) NOT NULL DEFAULT 1.0,
  auto_action_taken      text,
  computed_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 3. STABILIZER EVENTS LOG ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.economy_stabilizer_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type           text        NOT NULL
                       CHECK (event_type IN ('warning_triggered', 'critical_triggered', 'multiplier_reduced', 'multiplier_restored', 'admin_override', 'system_frozen')),
  trigger_metric       text,        -- e.g. 'weekly_payout_growth'
  trigger_value        numeric,     -- e.g. 32.5 (%)
  threshold_value      numeric,     -- e.g. 25 (%)
  action_taken         text,
  old_multiplier       numeric(5,2),
  new_multiplier       numeric(5,2),
  triggered_by         text        NOT NULL DEFAULT 'cron',
  staff_override_id    uuid        REFERENCES public.staff_members(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 4. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stabilizer_snapshots_date ON public.economy_stabilizer_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_stabilizer_events_created ON public.economy_stabilizer_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_config_key ON public.economy_config(config_key);

-- ── 5. STABILIZER COMPUTATION FUNCTION ───────────────────────
-- TypeScript equivalent: if (weekly_payout_growth > 25%) reduce_multiplier(0.85)
CREATE OR REPLACE FUNCTION public.fn_run_economy_stabilizer()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config            jsonb;
  v_warn_pct          numeric;
  v_crit_pct          numeric;
  v_reduce_warn       numeric;
  v_reduce_crit       numeric;
  v_current_week_payout numeric;
  v_last_week_payout  numeric;
  v_growth_pct        numeric;
  v_status            text := 'normal';
  v_multiplier        numeric := 1.0;
  v_action            text := 'none';
  v_global_enabled    boolean;
BEGIN
  -- Read stabilizer config
  SELECT value INTO v_config FROM public.economy_config WHERE config_key = 'stabilizer_config';
  v_warn_pct    := (v_config->>'weekly_growth_warning_pct')::numeric;
  v_crit_pct    := (v_config->>'weekly_growth_critical_pct')::numeric;
  v_reduce_warn := (v_config->>'auto_reduce_multiplier_warning')::numeric;
  v_reduce_crit := (v_config->>'auto_reduce_multiplier_critical')::numeric;

  -- Check if stabilizer is enabled
  SELECT (value->>'stabilizer_enabled')::boolean INTO v_global_enabled
  FROM public.economy_config WHERE config_key = 'global';
  IF NOT v_global_enabled THEN
    RETURN jsonb_build_object('status', 'disabled', 'action', 'none');
  END IF;

  -- Compute current week vs last week payouts
  -- Uses wallet_transactions if available, otherwise returns early
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_current_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now());

    SELECT COALESCE(SUM(amount), 0) INTO v_last_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now() - INTERVAL '1 week')
      AND created_at < date_trunc('week', now());
  EXCEPTION WHEN undefined_table THEN
    -- wallet_transactions not yet created (Phase 4)
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'wallet_transactions table not yet active');
  END;

  -- Calculate growth rate
  IF v_last_week_payout > 0 THEN
    v_growth_pct := ((v_current_week_payout - v_last_week_payout) / v_last_week_payout) * 100;
  ELSE
    v_growth_pct := 0;
  END IF;

  -- Apply stabilizer rules
  IF v_growth_pct >= v_crit_pct THEN
    v_status     := 'critical';
    v_multiplier := v_reduce_crit;   -- 0.70
    v_action     := format('AUTO_REDUCE_MULTIPLIER to %s (critical growth: %s%%)', v_reduce_crit, v_growth_pct);

    INSERT INTO public.economy_stabilizer_events
      (event_type, trigger_metric, trigger_value, threshold_value, action_taken, new_multiplier)
    VALUES
      ('critical_triggered', 'weekly_payout_growth', v_growth_pct, v_crit_pct, v_action, v_multiplier);

    -- Alert admins via contributor_alerts (broadcast)
    -- (admin notifications handled by TypeScript layer)

  ELSIF v_growth_pct >= v_warn_pct THEN
    v_status     := 'warning';
    v_multiplier := v_reduce_warn;   -- 0.85
    v_action     := format('AUTO_REDUCE_MULTIPLIER to %s (warning growth: %s%%)', v_reduce_warn, v_growth_pct);

    INSERT INTO public.economy_stabilizer_events
      (event_type, trigger_metric, trigger_value, threshold_value, action_taken, new_multiplier)
    VALUES
      ('warning_triggered', 'weekly_payout_growth', v_growth_pct, v_warn_pct, v_action, v_multiplier);
  ELSE
    v_status     := 'normal';
    v_multiplier := 1.0;
    v_action     := 'none';
  END IF;

  -- Record snapshot
  INSERT INTO public.economy_stabilizer_snapshots
    (snapshot_date, total_payouts_egp, payout_growth_pct_wow, stabilizer_status, multiplier_adjustment, auto_action_taken)
  VALUES
    (CURRENT_DATE, v_current_week_payout, v_growth_pct, v_status, v_multiplier, v_action)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'status',          v_status,
    'growth_pct',      v_growth_pct,
    'multiplier',      v_multiplier,
    'action',          v_action,
    'this_week_egp',   v_current_week_payout,
    'last_week_egp',   v_last_week_payout
  );
END; $$;

-- ── 6. GET ACTIVE STABILIZER MULTIPLIER ──────────────────────
-- Called by wallet.ts before any reward calculation
CREATE OR REPLACE FUNCTION public.fn_get_stabilizer_multiplier()
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  v_latest record;
BEGIN
  SELECT multiplier_adjustment, stabilizer_status
  INTO v_latest
  FROM public.economy_stabilizer_snapshots
  ORDER BY snapshot_date DESC
  LIMIT 1;

  IF NOT FOUND OR v_latest.stabilizer_status = 'normal' THEN
    RETURN 1.0;
  END IF;

  RETURN v_latest.multiplier_adjustment;
END; $$;

-- ── 7. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.economy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_stabilizer_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_stabilizer_events ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_economy_config"    ON public.economy_config                 FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_stabilizer_snap"   ON public.economy_stabilizer_snapshots   FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_stabilizer_events" ON public.economy_stabilizer_events      FOR ALL TO service_role USING (true);

-- Contributors: read global config (public toggles)
CREATE POLICY "economy_config_public_read"
  ON public.economy_config FOR SELECT USING (config_key = 'global' OR config_key = 'referral_settings');

-- Admin manage all config
CREATE POLICY "economy_config_admin"
  ON public.economy_config FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());

-- Stabilizer data: admin read
CREATE POLICY "stabilizer_snap_admin"
  ON public.economy_stabilizer_snapshots FOR SELECT TO authenticated
  USING (public.fn_is_contributor_hr());

CREATE POLICY "stabilizer_events_admin"
  ON public.economy_stabilizer_events FOR SELECT TO authenticated
  USING (public.fn_is_contributor_hr());
