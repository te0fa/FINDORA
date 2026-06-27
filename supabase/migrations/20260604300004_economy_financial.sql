-- ============================================================
-- FINDORA ECONOMY OS — Phase 4: Financial & Economy Layer
-- contributor_wallets, wallet_transactions, contributor_referrals
-- Financial Safety Mode Enforced: All writes must be secure.
-- ============================================================

-- ── 1. WALLETS (CORE FINANCIAL RECORD) ────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_wallets (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  balance_egp            numeric(14,2) NOT NULL DEFAULT 0.00
                         CHECK (balance_egp >= 0), -- STRICT CONSTRAINT: Never negative
  points_balance         integer     NOT NULL DEFAULT 0
                         CHECK (points_balance >= 0),
  pending_withdrawal_egp numeric(14,2) NOT NULL DEFAULT 0.00
                         CHECK (pending_withdrawal_egp >= 0),
  lifetime_earned_egp    numeric(14,2) NOT NULL DEFAULT 0.00,
  lifetime_withdrawn_egp numeric(14,2) NOT NULL DEFAULT 0.00,
  last_transaction_at    timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 2. WALLET TRANSACTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  wallet_id              uuid        NOT NULL REFERENCES public.contributor_wallets(id) ON DELETE RESTRICT,
  tx_type                text        NOT NULL
                         CHECK (tx_type IN (
                           'task_reward', 'referral_reward', 'streak_bonus',
                           'network_revenue_share', 'withdrawal', 'manual_adjustment', 'fraud_clawback'
                         )),
  amount_egp             numeric(12,2) NOT NULL,
  amount_points          integer     NOT NULL DEFAULT 0,
  -- Link to the action that produced this transaction
  reference_type         text        -- e.g., 'task', 'referral', 'withdrawal_request'
                         CHECK (reference_type IN ('task', 'referral', 'withdrawal_request', 'admin_adjustment')),
  reference_id           uuid,
  -- Enforcement log reference (MUST be present for rewards/withdrawals)
  fraud_audit_id         uuid        REFERENCES public.fraud_audit_log(id),
  description_en         text,
  description_ar         text,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 3. REFERRALS (TRACKING FOR UNLOCKS & L2 REVENUE SHARE) ───
CREATE TABLE IF NOT EXISTS public.contributor_referrals (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id            uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  referred_id            uuid        UNIQUE NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  level                  integer     NOT NULL DEFAULT 1 CHECK (level IN (1, 2)), -- 1: direct, 2: network
  status                 text        NOT NULL DEFAULT 'signed_up'
                         CHECK (status IN ('signed_up', 'approved', 'active', 'inactive', 'frozen')),
  first_activity_at      timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 4. WITHDRAWAL REQUESTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributor_withdrawals (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE RESTRICT,
  wallet_id              uuid        NOT NULL REFERENCES public.contributor_wallets(id) ON DELETE RESTRICT,
  amount_egp             numeric(12,2) NOT NULL CHECK (amount_egp > 0),
  payment_method         text        NOT NULL
                         CHECK (payment_method IN ('instapay', 'vodafone_cash', 'bank_transfer')),
  payment_details        jsonb       NOT NULL,
  status                 text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected', 'held_for_review')),
  fraud_audit_id         uuid        REFERENCES public.fraud_audit_log(id),
  staff_reviewer_id      uuid        REFERENCES public.staff_members(id),
  rejection_reason       text,
  processed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 5. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wallets_contributor ON public.contributor_wallets(contributor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.wallet_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.contributor_referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.contributor_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_contributor ON public.contributor_withdrawals(contributor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.contributor_withdrawals(status);

-- ── 6. AUTO-CREATE WALLET TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_init_contributor_wallet()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.contributor_wallets (contributor_id)
  VALUES (NEW.id)
  ON CONFLICT (contributor_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_init_contributor_wallet
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_init_contributor_wallet();

-- ── 7. AUTO-LINK REFERRALS TRIGGER ────────────────────────────
-- When a contributor is inserted, if they have a referred_by_id, link them in contributor_referrals
CREATE OR REPLACE FUNCTION public.fn_link_referral()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_l1_referrer uuid;
  v_l2_referrer uuid;
BEGIN
  IF NEW.referred_by_id IS NOT NULL THEN
    v_l1_referrer := NEW.referred_by_id;

    -- Level 1 Link
    INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
    VALUES (v_l1_referrer, NEW.id, 1, 'signed_up');

    -- Level 2 Link (if the referrer was referred by someone else)
    SELECT referred_by_id INTO v_l2_referrer FROM public.contributors WHERE id = v_l1_referrer;
    IF v_l2_referrer IS NOT NULL THEN
      INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
      VALUES (v_l2_referrer, NEW.id, 2, 'signed_up');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_link_referral
  AFTER INSERT ON public.contributors
  FOR EACH ROW EXECUTE FUNCTION public.fn_link_referral();

-- ── 8. TRANSACTION PROCESSING LOGIC (DB LEVEL ENFORCEMENT) ────
-- Strict update rules for wallets based on transactions
CREATE OR REPLACE FUNCTION public.fn_process_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- We use row-level locking (SELECT FOR UPDATE) implicitly by updating the wallet table directly
  
  -- If adding funds (reward)
  IF NEW.amount_egp > 0 THEN
    UPDATE public.contributor_wallets
    SET balance_egp = balance_egp + NEW.amount_egp,
        points_balance = points_balance + NEW.amount_points,
        lifetime_earned_egp = lifetime_earned_egp + NEW.amount_egp,
        last_transaction_at = now()
    WHERE id = NEW.wallet_id;
  
  -- If removing funds (e.g. withdrawal execution, clawback)
  ELSIF NEW.amount_egp < 0 THEN
    -- For withdrawals, this logic assumes we first put it into pending, 
    -- then later deduct from pending. 
    -- If tx_type = 'withdrawal', we assume it's completing a withdrawal.
    IF NEW.tx_type = 'withdrawal' THEN
      UPDATE public.contributor_wallets
      SET pending_withdrawal_egp = pending_withdrawal_egp + NEW.amount_egp, -- amount is negative, so this subtracts
          lifetime_withdrawn_egp = lifetime_withdrawn_egp - NEW.amount_egp, -- amount is negative, so this adds
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    ELSE
      -- Generic deduction (e.g., fraud_clawback)
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp,
          points_balance = GREATEST(0, points_balance + NEW.amount_points),
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_process_wallet_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_process_wallet_transaction();

-- ── 9. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.contributor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributor_withdrawals ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_wallets" ON public.contributor_wallets FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_transactions" ON public.wallet_transactions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_referrals" ON public.contributor_referrals FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_withdrawals" ON public.contributor_withdrawals FOR ALL TO service_role USING (true);

-- Contributors: Read own data
CREATE POLICY "wallets_own_read"
  ON public.contributor_wallets FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "transactions_own_read"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "referrals_own_read"
  ON public.contributor_referrals FOR SELECT TO authenticated
  USING (referrer_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

CREATE POLICY "withdrawals_own_read"
  ON public.contributor_withdrawals FOR SELECT TO authenticated
  USING (contributor_id IN (SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()));

-- HR/Admin access
CREATE POLICY "wallets_hr" ON public.contributor_wallets FOR SELECT TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "transactions_hr" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "referrals_hr" ON public.contributor_referrals FOR SELECT TO authenticated USING (public.fn_is_contributor_hr());
CREATE POLICY "withdrawals_hr" ON public.contributor_withdrawals FOR ALL TO authenticated USING (public.fn_is_contributor_hr());
