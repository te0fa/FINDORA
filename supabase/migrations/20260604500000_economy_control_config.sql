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
  ('role_multipliers', '{"field_scout": 1.2, "store_insider": 1.0, "casual": 0.8}'::jsonb, 'Base payout multipliers per contributor role', 'مضاعفات الدفع الأساسية حسب دور المساهم', true)
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
