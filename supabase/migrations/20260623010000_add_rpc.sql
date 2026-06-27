-- ============================================================
-- FINDORA ECONOMY OS — 20260623010000_add_rpc.sql
-- Add fn_lock_and_insert_transaction for row-level locking
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_lock_and_insert_transaction(
  p_contributor_id uuid,
  p_wallet_id uuid,
  p_tx_type text,
  p_amount_egp numeric,
  p_amount_points integer,
  p_reference_type text,
  p_reference_id uuid,
  p_description_en text,
  p_description_ar text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_tx_id uuid;
BEGIN
  -- 1. Explicit row lock
  SELECT balance_egp, pending_withdrawal_egp INTO v_balance, v_pending
  FROM public.contributor_wallets
  WHERE id = p_wallet_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- 2. Pre-check for negative balance (overdraft)
  -- For withdrawal_hold, manual_adjustment, or fraud_clawback, check if balance goes negative
  IF p_amount_egp < 0 AND p_tx_type IN ('withdrawal_hold', 'fraud_clawback', 'manual_adjustment') AND (v_balance + p_amount_egp) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- For completed withdrawal, check if pending goes negative
  IF p_amount_egp < 0 AND p_tx_type = 'withdrawal' AND (v_pending + p_amount_egp) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient pending balance');
  END IF;

  -- 3. Insert transaction
  INSERT INTO public.wallet_transactions (
    contributor_id, wallet_id, tx_type, amount_egp, amount_points,
    reference_type, reference_id, description_en, description_ar, metadata, idempotency_key
  ) VALUES (
    p_contributor_id, p_wallet_id, p_tx_type, p_amount_egp, p_amount_points,
    p_reference_type, p_reference_id, p_description_en, p_description_ar, p_metadata, p_idempotency_key
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id);
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;
