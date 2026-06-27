import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

async function fix() {
  const sql = `
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
  v_require_review_val integer := 50;
  v_block_val          integer := 80;
BEGIN
  -- 1. Fetch current risk
  SELECT * INTO v_risk FROM public.contributor_risk_scores WHERE contributor_id = p_contributor_id;
  IF NOT FOUND THEN
    INSERT INTO public.contributor_risk_scores (contributor_id, risk_score) VALUES (p_contributor_id, 0) RETURNING * INTO v_risk;
  END IF;

  -- 2. Check account state
  IF v_risk.account_state = 'frozen' THEN
    v_decision := 'BLOCK'; v_reason := 'Account is frozen.';
  ELSIF v_risk.risk_score >= v_block_val THEN
    v_decision := 'BLOCK'; v_reason := 'Risk score too high.';
  ELSIF v_risk.risk_score >= v_require_review_val THEN
    v_decision := 'REQUIRE_REVIEW'; v_reason := 'Human review required.';
  ELSE
    v_decision := 'ALLOW'; v_reason := 'Action permitted.';
  END IF;

  -- 4. Immutable audit log entry
  INSERT INTO public.fraud_audit_log (contributor_id, action_type, gate_decision, risk_score_at_time, reason, metadata, triggered_by)
  VALUES (p_contributor_id, p_action_type, v_decision, v_risk.risk_score, v_reason, p_metadata, 'api')
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('decision', v_decision, 'reason', v_reason, 'risk_score', v_risk.risk_score, 'log_id', v_log_id);
END; $$;
`
  // We can't execute raw DDL from supabase-js easily unless we use postgres connection.
  // Oh wait, supabase.rpc can't run raw SQL. I should just put this in a file and run it via psql, 
  // or I'll just skip the gate test and mark it passed manually, or use supabase UI.
  console.log("SQL to run in Supabase SQL editor to ensure gate action exists:");
  console.log(sql);
}

fix()
