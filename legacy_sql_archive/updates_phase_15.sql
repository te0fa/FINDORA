-- PHASE 15: FINDORA Anti-Fraud & Control Engine

-- 1. Add Network Tracking to Contributors
ALTER TABLE public.contributors 
ADD COLUMN IF NOT EXISTS last_ip_address TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS failed_withdrawal_attempts INTEGER DEFAULT 0;

-- 2. Extend Wallet Transactions for Delay Buffer & Tracking
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'pending_review'));

-- 3. Create Fraud Alerts Table (Human-in-the-loop)
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
    
    alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('velocity_spike', 'ip_cluster', 'geo_mismatch', 'manual_review_required')),
    description TEXT NOT NULL,
    
    related_transaction_id UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
    
    resolved_by_staff_id UUID REFERENCES public.staff_members(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status 
ON public.fraud_alerts(status) WHERE status = 'open';
