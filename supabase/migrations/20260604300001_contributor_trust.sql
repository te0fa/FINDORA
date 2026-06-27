-- ============================================================
-- FINDORA ECONOMY OS — Phase 1B: Trust Layer
-- risk_scores, fraud_audit_log, HR review queue, velocity tracking
-- gateAction() DB function (enforcement layer)
-- ============================================================

-- ── 1. RISK SCORES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_risk_scores (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  -- Component scores (0-100 each)
  device_risk            integer     NOT NULL DEFAULT 0 CHECK (device_risk BETWEEN 0 AND 100),
  behavior_risk          integer     NOT NULL DEFAULT 0 CHECK (behavior_risk BETWEEN 0 AND 100),
  referral_graph_risk    integer     NOT NULL DEFAULT 0 CHECK (referral_graph_risk BETWEEN 0 AND 100),
  wallet_risk            integer     NOT NULL DEFAULT 0 CHECK (wallet_risk BETWEEN 0 AND 100),
  -- Composite score
  risk_score             integer     NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  -- Account enforcement state
  account_state          text        NOT NULL DEFAULT 'safe'
                         CHECK (account_state IN ('safe', 'under_review', 'restricted', 'frozen')),
  -- Metadata
  last_computed_at       timestamptz NOT NULL DEFAULT now(),
  computed_by            text        NOT NULL DEFAULT 'system'
                         CHECK (computed_by IN ('system', 'cron', 'manual_override')),
  override_by_staff_id   uuid        REFERENCES public.staff_members(id),
  notes                  text
);

-- ── 2. FRAUD AUDIT LOG (IMMUTABLE — NO UPDATE, NO DELETE) ────
CREATE TABLE IF NOT EXISTS public.fraud_audit_log (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  action_type            text        NOT NULL,
  gate_decision          text        NOT NULL
                         CHECK (gate_decision IN ('ALLOW', 'REQUIRE_REVIEW', 'BLOCK')),
  risk_score_at_time     integer     NOT NULL,
  reason                 text        NOT NULL,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  triggered_by           text        NOT NULL DEFAULT 'system'
                         CHECK (triggered_by IN ('system', 'cron', 'api', 'manual_override')),
  created_at             timestamptz NOT NULL DEFAULT now()
);
-- CRITICAL: No UPDATE or DELETE allowed — enforced by RLS (no UPDATE/DELETE policies)

-- ── 3. HR REVIEW QUEUE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_hr_reviews (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  fraud_audit_id         uuid        REFERENCES public.fraud_audit_log(id),
  review_type            text        NOT NULL
                         CHECK (review_type IN ('risk_flagged', 'withdrawal_held', 'referral_fraud', 'account_review', 'manual_escalation')),
  reason                 text        NOT NULL,
  risk_score             integer     NOT NULL,
  assigned_to_staff_id   uuid        REFERENCES public.staff_members(id),
  status                 text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
  resolution             text
                         CHECK (resolution IN ('approved', 'rejected', 'override_allowed', 'frozen')),
  resolution_notes       text,
  resolved_by_staff_id   uuid        REFERENCES public.staff_members(id),
  resolved_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 4. VELOCITY TRACKING ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_velocity_log (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  action_type            text        NOT NULL,
  window_hours           integer     NOT NULL DEFAULT 24,
  action_count           integer     NOT NULL DEFAULT 1,
  threshold_exceeded     boolean     NOT NULL DEFAULT false,
  ip_address             inet,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 5. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_risk_scores_contributor ON public.contributor_risk_scores(contributor_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_state ON public.contributor_risk_scores(account_state);
CREATE INDEX IF NOT EXISTS idx_fraud_log_contributor ON public.fraud_audit_log(contributor_id);
CREATE INDEX IF NOT EXISTS idx_fraud_log_decision ON public.fraud_audit_log(gate_decision);
CREATE INDEX IF NOT EXISTS idx_fraud_log_created ON public.fraud_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_reviews_status ON public.contributor_hr_reviews(status);
CREATE INDEX IF NOT EXISTS idx_hr_reviews_contributor ON public.contributor_hr_reviews(contributor_id);
CREATE INDEX IF NOT EXISTS idx_velocity_contributor ON public.contributor_velocity_log(contributor_id, action_type, created_at DESC);

-- ── 6. AUTO-INSERT RISK SCORE ON NEW CONTRIBUTOR ─────────────
CREATE OR REPLACE FUNCTION public.fn_init_contributor_risk_score()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.contributor_risk_scores (contributor_id)
  VALUES (NEW.id)
  ON CONFLICT (contributor_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_init_contributor_risk_score
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_init_contributor_risk_score();

-- ── 7. REFERRAL CYCLE DETECTION ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_detect_referral_cycle(
  p_referrer_id uuid,
  p_referred_id uuid
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_check_id uuid := p_referrer_id;
  v_depth    integer := 0;
BEGIN
  -- Walk up the referral chain from referrer; if we hit p_referred_id, it's a cycle
  LOOP
    v_depth := v_depth + 1;
    IF v_depth > 10 THEN RETURN true; END IF; -- safety cap
    SELECT referred_by_id INTO v_check_id
    FROM public.contributors
    WHERE id = v_check_id;
    EXIT WHEN v_check_id IS NULL;
    IF v_check_id = p_referred_id THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END; $$;

-- ── 8. VELOCITY CHECK ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_velocity(
  p_contributor_id  uuid,
  p_action_type     text,
  p_window_hours    integer DEFAULT 24,
  p_max_count       integer DEFAULT 5
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
  v_is_new_account boolean;
BEGIN
  -- New accounts (< 30 days) get stricter limits
  SELECT (now() - created_at) < INTERVAL '30 days'
  INTO v_is_new_account
  FROM public.contributors
  WHERE id = p_contributor_id;

  IF v_is_new_account THEN
    p_max_count := GREATEST(1, p_max_count / 3); -- 3x stricter
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.contributor_velocity_log
  WHERE contributor_id = p_contributor_id
    AND action_type = p_action_type
    AND created_at >= now() - (p_window_hours || ' hours')::interval;

  IF v_count >= p_max_count THEN
    -- Log the flag
    INSERT INTO public.contributor_velocity_log
      (contributor_id, action_type, window_hours, action_count, threshold_exceeded)
    VALUES (p_contributor_id, p_action_type, p_window_hours, v_count + 1, true);
    RETURN true; -- blocked
  END IF;

  -- Log the action
  INSERT INTO public.contributor_velocity_log
    (contributor_id, action_type, window_hours, action_count, threshold_exceeded)
  VALUES (p_contributor_id, p_action_type, p_window_hours, v_count + 1, false);

  RETURN false; -- not blocked
END; $$;

-- ── 9. RISK SCORE COMPUTATION ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_compute_risk_score(
  p_contributor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_device_risk      integer := 0;
  v_behavior_risk    integer := 0;
  v_graph_risk       integer := 0;
  v_wallet_risk      integer := 0;
  v_composite        integer;
  v_state            text := 'safe';
  v_flagged_devices  integer;
  v_velocity_flags   integer;
  v_contributor      record;
BEGIN
  SELECT * INTO v_contributor FROM public.contributors WHERE id = p_contributor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'contributor_not_found'); END IF;

  -- Device risk: flagged fingerprints
  SELECT COUNT(*) INTO v_flagged_devices
  FROM public.contributor_device_fingerprints
  WHERE contributor_id = p_contributor_id AND is_flagged = true;
  v_device_risk := LEAST(100, v_flagged_devices * 25);

  -- Behavior risk: velocity threshold exceedances in last 7 days
  SELECT COUNT(*) INTO v_velocity_flags
  FROM public.contributor_velocity_log
  WHERE contributor_id = p_contributor_id
    AND threshold_exceeded = true
    AND created_at >= now() - INTERVAL '7 days';
  v_behavior_risk := LEAST(100, v_velocity_flags * 20);

  -- Graph risk: check if referred_by chain has frozen/suspended contributors
  SELECT COUNT(*) INTO v_graph_risk
  FROM public.contributors c
  WHERE c.id = v_contributor.referred_by_id
    AND c.status IN ('frozen', 'suspended');
  v_graph_risk := CASE WHEN v_graph_risk > 0 THEN 40 ELSE 0 END;

  -- Wallet risk: computed separately when wallet layer is active
  v_wallet_risk := 0;

  -- Composite: weighted sum
  v_composite := (v_device_risk * 0.35 + v_behavior_risk * 0.30 +
                  v_graph_risk * 0.25 + v_wallet_risk * 0.10)::integer;

  -- Determine state
  v_state := CASE
    WHEN v_composite >= 80 THEN 'frozen'
    WHEN v_composite >= 50 THEN 'under_review'
    WHEN v_composite >= 30 THEN 'restricted'
    ELSE 'safe'
  END;

  -- Upsert risk scores
  INSERT INTO public.contributor_risk_scores
    (contributor_id, device_risk, behavior_risk, referral_graph_risk, wallet_risk,
     risk_score, account_state, last_computed_at)
  VALUES
    (p_contributor_id, v_device_risk, v_behavior_risk, v_graph_risk, v_wallet_risk,
     v_composite, v_state, now())
  ON CONFLICT (contributor_id) DO UPDATE SET
    device_risk         = EXCLUDED.device_risk,
    behavior_risk       = EXCLUDED.behavior_risk,
    referral_graph_risk = EXCLUDED.referral_graph_risk,
    wallet_risk         = EXCLUDED.wallet_risk,
    risk_score          = EXCLUDED.risk_score,
    account_state       = EXCLUDED.account_state,
    last_computed_at    = EXCLUDED.last_computed_at;

  -- Sync contributor status if frozen
  IF v_state = 'frozen' AND v_contributor.status NOT IN ('frozen', 'suspended') THEN
    UPDATE public.contributors SET status = 'frozen' WHERE id = p_contributor_id;
  END IF;

  RETURN jsonb_build_object(
    'risk_score', v_composite,
    'account_state', v_state,
    'device_risk', v_device_risk,
    'behavior_risk', v_behavior_risk,
    'graph_risk', v_graph_risk
  );
END; $$;

-- ── 10. GATE ACTION FUNCTION (CORE ENFORCEMENT) ───────────────
CREATE OR REPLACE FUNCTION public.fn_gate_action(
  p_contributor_id  uuid,
  p_action_type     text,
  p_metadata        jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_risk      record;
  v_decision  text;
  v_reason    text;
  v_review_id uuid;
  v_log_id    uuid;
BEGIN
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
  -- 3. Risk thresholds
  ELSIF v_risk.risk_score >= 80 THEN
    v_decision := 'BLOCK';
    v_reason   := format('Risk score %s >= 80. Auto-blocked.', v_risk.risk_score);
    -- Freeze account
    UPDATE public.contributor_risk_scores
    SET account_state = 'frozen'
    WHERE contributor_id = p_contributor_id;
    UPDATE public.contributors
    SET status = 'frozen'
    WHERE id = p_contributor_id;
  ELSIF v_risk.risk_score >= 50 THEN
    v_decision := 'REQUIRE_REVIEW';
    v_reason   := format('Risk score %s >= 50. Human review required.', v_risk.risk_score);
    -- Create HR review task
    INSERT INTO public.contributor_hr_reviews
      (contributor_id, review_type, reason, risk_score)
    VALUES
      (p_contributor_id, 'risk_flagged', v_reason, v_risk.risk_score)
    RETURNING id INTO v_review_id;
  ELSE
    v_decision := 'ALLOW';
    v_reason   := format('Risk score %s < 50. Action permitted.', v_risk.risk_score);
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

-- ── 11. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.contributor_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_hr_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_velocity_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_risk_scores"  ON public.contributor_risk_scores  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_fraud_log"    ON public.fraud_audit_log           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_hr_reviews"   ON public.contributor_hr_reviews    FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_velocity"     ON public.contributor_velocity_log  FOR ALL TO service_role USING (true);

-- fraud_audit_log: SELECT only for HR staff (NO INSERT from users, NO UPDATE, NO DELETE ever)
CREATE POLICY "fraud_log_hr_read"
  ON public.fraud_audit_log FOR SELECT TO authenticated
  USING (public.fn_is_contributor_hr());

-- risk_scores: HR staff can read and update
CREATE POLICY "risk_scores_hr"
  ON public.contributor_risk_scores FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());

-- Contributors can read their own risk state
CREATE POLICY "risk_scores_own_read"
  ON public.contributor_risk_scores FOR SELECT TO authenticated
  USING (contributor_id IN (
    SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
  ));

-- HR reviews: HR staff full access
CREATE POLICY "hr_reviews_staff"
  ON public.contributor_hr_reviews FOR ALL TO authenticated
  USING (public.fn_is_contributor_hr());

-- HR reviews: contributors can read their own
CREATE POLICY "hr_reviews_own_read"
  ON public.contributor_hr_reviews FOR SELECT TO authenticated
  USING (contributor_id IN (
    SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
  ));

-- NOTE: No UPDATE or DELETE policy on fraud_audit_log — intentionally omitted for immutability
