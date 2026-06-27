-- ============================================================
-- FINDORA Platform — Phase 29: Performance Indexes for Scale
-- Target: 1M+ user capacity
-- File: updates_phase_29_indexes.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: Contributors
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contributors_status
  ON public.contributors(status);

CREATE INDEX IF NOT EXISTS idx_contributors_phone
  ON public.contributors(phone_number);

CREATE INDEX IF NOT EXISTS idx_contributors_trust
  ON public.contributors(trust_score DESC);

CREATE INDEX IF NOT EXISTS idx_contributors_created
  ON public.contributors(created_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECTION 2: Wallet Transactions
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wallet_tx_contributor
  ON public.wallet_transactions(contributor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_type
  ON public.wallet_transactions(tx_type, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECTION 3: Fraud Audit Log
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fraud_log_contributor
  ON public.fraud_audit_log(contributor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_log_decision
  ON public.fraud_audit_log(decision, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECTION 4: Referrals
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.contributor_referrals(referrer_id, status);

CREATE INDEX IF NOT EXISTS idx_referrals_referred
  ON public.contributor_referrals(referred_id);


-- ────────────────────────────────────────────────────────────
-- SECTION 5: Platform Tasks & Claims
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_platform_tasks_status
  ON public.platform_tasks(status, min_level);

CREATE INDEX IF NOT EXISTS idx_task_claims_contributor
  ON public.task_claims(contributor_id, status);


-- ────────────────────────────────────────────────────────────
-- SECTION 6: Risk Scores & Withdrawals
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contributor_risk_score
  ON public.contributor_risk_scores(risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status
  ON public.contributor_withdrawals(status, created_at DESC);


-- ============================================================
-- END OF FILE: updates_phase_29_indexes.sql
-- ============================================================
