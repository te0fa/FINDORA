-- PHASE 14: FINDORA Monetization Engine & Exit Strategy

-- 1. Extend Platform Tasks for Financial Tracking
-- This allows us to track EXACTLY how much margin we made per unit of work
ALTER TABLE public.platform_tasks 
ADD COLUMN IF NOT EXISTS customer_price_egp NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS platform_profit_egp NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC(5,2) DEFAULT 0.00;

-- Ensure constraints: base_reward_egp + platform_profit_egp = customer_price_egp
-- (Handled by application logic, but tracked here)

-- 2. Create Investor Metrics Snapshots Table
-- Used for the Exit Strategy dashboards to show historical growth and LTV/CAC
CREATE TABLE IF NOT EXISTS public.investor_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    
    -- Growth Metrics
    daily_active_contributors INTEGER NOT NULL DEFAULT 0,
    new_requests_count INTEGER NOT NULL DEFAULT 0,
    retention_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    
    -- Financial Metrics
    daily_revenue_egp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    daily_net_profit_egp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    
    -- Unit Economics
    avg_customer_acquisition_cost_egp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    avg_lifetime_value_egp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    avg_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick graphing
CREATE INDEX IF NOT EXISTS idx_investor_snapshots_date 
ON public.investor_metrics_snapshots(snapshot_date DESC);
