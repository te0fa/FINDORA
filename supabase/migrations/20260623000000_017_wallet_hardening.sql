-- ============================================================
-- FINDORA ECONOMY OS — 017_wallet_hardening.sql
-- Concurrency, Idempotency, and Audit hardening for Wallet System
-- ============================================================

-- 0. Clean and reset current test data
TRUNCATE TABLE public.wallet_transactions CASCADE;
UPDATE public.contributor_wallets
SET balance_egp = 0.00,
    points_balance = 0,
    pending_withdrawal_egp = 0.00,
    lifetime_earned_egp = 0.00,
    lifetime_withdrawn_egp = 0.00;

-- 1. Enforce non-negative wallet balance (CHECK constraint)
ALTER TABLE public.contributor_wallets DROP CONSTRAINT IF EXISTS chk_balance_non_negative;
ALTER TABLE public.contributor_wallets
  ADD CONSTRAINT chk_balance_non_negative
  CHECK (balance_egp >= 0.00);

-- 2. Add idempotency key to wallet_transactions
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DROP INDEX IF EXISTS public.idx_wallet_transactions_idempotency;
CREATE UNIQUE INDEX idx_wallet_transactions_idempotency
  ON public.wallet_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Performance index on wallet_id
DROP INDEX IF EXISTS public.idx_wallet_transactions_wallet_id;
CREATE INDEX idx_wallet_transactions_wallet_id
  ON public.wallet_transactions(wallet_id);

-- 4. Update check constraint on tx_type to allow 'withdrawal_hold'
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_tx_type_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_tx_type_check
  CHECK (tx_type IN ('task_reward', 'referral_reward', 'streak_bonus', 'network_revenue_share', 'withdrawal', 'withdrawal_hold', 'manual_adjustment', 'fraud_clawback'));

-- 5. Hardened Transaction Trigger Function
CREATE OR REPLACE FUNCTION public.fn_process_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- 1. If adding funds (reward or positive manual adjustment)
  IF NEW.amount_egp > 0 THEN
    UPDATE public.contributor_wallets
    SET balance_egp = balance_egp + NEW.amount_egp,
        points_balance = points_balance + NEW.amount_points,
        lifetime_earned_egp = lifetime_earned_egp + NEW.amount_egp,
        last_transaction_at = now()
    WHERE id = NEW.wallet_id;
  
  -- 2. If removing/adjusting funds (negative amount)
  ELSIF NEW.amount_egp < 0 THEN
    -- A. If it is completing a withdrawal payout (funds move out of pending)
    IF NEW.tx_type = 'withdrawal' THEN
      UPDATE public.contributor_wallets
      SET pending_withdrawal_egp = pending_withdrawal_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          lifetime_withdrawn_egp = lifetime_withdrawn_egp - NEW.amount_egp, -- amount_egp is negative, so this adds
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
      
    -- B. If it is creating a withdrawal hold (funds move from balance to pending)
    ELSIF NEW.tx_type = 'withdrawal_hold' THEN
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          pending_withdrawal_egp = pending_withdrawal_egp - NEW.amount_egp, -- amount_egp is negative, so this adds (double negative)
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
      
    -- C. Generic negative adjustments (clawbacks, negative manual adjustments)
    ELSE
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          points_balance = GREATEST(0, points_balance + NEW.amount_points),
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_process_wallet_transaction ON public.wallet_transactions;
CREATE TRIGGER trg_process_wallet_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_process_wallet_transaction();

-- 6. Wallet Reconciliation Check Function
CREATE OR REPLACE FUNCTION public.fn_wallet_reconciliation_check()
RETURNS TABLE (
  wallet_id uuid,
  contributor_id uuid,
  expected_total numeric,
  actual_total numeric,
  difference numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS wallet_id,
    w.contributor_id,
    COALESCE(t.expected_sum, 0.00) AS expected_total,
    (w.balance_egp + w.pending_withdrawal_egp) AS actual_total,
    (COALESCE(t.expected_sum, 0.00) - (w.balance_egp + w.pending_withdrawal_egp)) AS difference
  FROM public.contributor_wallets w
  LEFT JOIN (
    SELECT 
      tx.wallet_id,
      SUM(tx.amount_egp) AS expected_sum
    FROM public.wallet_transactions tx
    WHERE tx.tx_type != 'withdrawal_hold' AND tx.status != 'pending'
    GROUP BY tx.wallet_id
  ) t ON w.id = t.wallet_id
  WHERE ABS(COALESCE(t.expected_sum, 0.00) - (w.balance_egp + w.pending_withdrawal_egp)) > 0.001;
END; $$;
