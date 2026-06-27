-- ============================================================
-- FINDORA ECONOMY OS — 20260623011000_fix_trigger_points.sql
-- Fix fn_process_wallet_transaction trigger for points-only rewards
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_process_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- 1. If adding funds or points (positive reward or adjustment)
  IF NEW.amount_egp > 0 OR NEW.amount_points > 0 THEN
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
