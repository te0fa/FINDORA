-- ============================================================
-- Force Recreate Economy Stabilizer Functions V2 (Column name fix)
-- ============================================================

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
  BEGIN
    SELECT COALESCE(SUM(amount_egp), 0) INTO v_current_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now());

    SELECT COALESCE(SUM(amount_egp), 0) INTO v_last_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now() - INTERVAL '1 week')
      AND created_at < date_trunc('week', now());
  EXCEPTION WHEN undefined_table THEN
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
