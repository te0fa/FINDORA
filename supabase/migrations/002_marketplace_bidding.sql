-- =============================================================================
-- FINDORA — Marketplace Bidding & Demand Intelligence
-- Migration: 002_marketplace_bidding.sql
-- Run this in Supabase SQL Editor or CLI migration runner
-- =============================================================================

-- ─── 1. ALTER REQUESTS TABLE ──────────────────────────────────────────────────
-- Add columns for buyer requirements and auction parameters

ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS accepts_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'price', -- 'price' | 'quality' | 'speed'
  ADD COLUMN IF NOT EXISTS auction_duration_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;

-- ─── 2. CREATE VENDOR BIDS TABLE ──────────────────────────────────────────────
-- Bids/offers submitted by merchants in response to requests

CREATE TABLE IF NOT EXISTS vendor_bids (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  vendor_id             UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  price_amount          NUMERIC(12, 2) NOT NULL,
  currency_code         TEXT NOT NULL DEFAULT 'EGP',
  delivery_days         INTEGER NOT NULL,                    -- Delivery timeframe in days
  warranty_months       INTEGER NOT NULL DEFAULT 0,          -- Warranty in months (0 if none)
  product_condition     TEXT NOT NULL DEFAULT 'new',         -- 'new' | 'used' | 'refurbished'
  installation_included BOOLEAN NOT NULL DEFAULT false,       -- Is installation/assembly included?
  after_sales_service   TEXT,                                -- Post-purchase support description
  freebies              TEXT,                                -- Gift/bonus items included
  deal_score            NUMERIC(5, 2) NOT NULL DEFAULT 0,    -- Computed automatically (0-100)
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id, vendor_id)                              -- One bid per vendor per request
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bids_request ON vendor_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_vendor  ON vendor_bids(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_score   ON vendor_bids(deal_score DESC);

-- Alter requests to reference the winning bid
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS selected_bid_id UUID REFERENCES vendor_bids(id) ON DELETE SET NULL;

-- ─── 3. CREATE CUSTOMER RELIABILITY VIEW ──────────────────────────────────────
-- Calculates real-time stats and trust score for each customer

CREATE OR REPLACE VIEW customer_reliability_stats AS
SELECT 
  c.id AS customer_id,
  COALESCE(r.total_requests, 0) AS total_requests,
  COALESCE(r.completed_requests, 0) AS completed_requests,
  CASE 
    -- Purchase rate: completed requests with selected bids / total requests
    WHEN COALESCE(r.total_requests, 0) = 0 THEN 100.0
    ELSE ROUND((COALESCE(r.completed_requests, 0)::NUMERIC / r.total_requests) * 100, 2)
  END AS purchase_rate,
  CASE
    -- Response rate: how often customer responds to communications / updates
    -- Fallback default of 95% if they haven't had interactions yet
    WHEN COALESCE(r.total_requests, 0) = 0 THEN 95.0
    ELSE GREATEST(ROUND(100.0 - (COALESCE(r.abandoned_requests, 0)::NUMERIC / r.total_requests) * 100, 2), 0)
  END AS response_rate,
  CASE
    -- Reliability Score: 60% purchase rate + 40% response rate
    WHEN COALESCE(r.total_requests, 0) = 0 THEN null -- Flagged as 'New Buyer'
    ELSE ROUND(
      (0.6 * (COALESCE(r.completed_requests, 0)::NUMERIC / r.total_requests) * 100) + 
      (0.4 * GREATEST(100.0 - (COALESCE(r.abandoned_requests, 0)::NUMERIC / r.total_requests) * 100, 0)), 
      2
    )
  END AS reliability_score
FROM customers c
LEFT JOIN (
  SELECT 
    customer_id,
    COUNT(id) AS total_requests,
    COUNT(id) FILTER (WHERE selected_bid_id IS NOT NULL OR current_status IN ('completed', 'released')) AS completed_requests,
    COUNT(id) FILTER (WHERE current_status IN ('cancelled', 'expired') AND selected_bid_id IS NULL) AS abandoned_requests
  FROM requests
  GROUP BY customer_id
) r ON r.customer_id = c.id;

-- ─── 4. SECURITY (RLS) ────────────────────────────────────────────────────────
ALTER TABLE vendor_bids ENABLE ROW LEVEL SECURITY;

-- Policy 1: Vendors can manage their own bids
CREATE POLICY "Vendors can manage their own bids" 
  ON vendor_bids FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors v 
      WHERE v.id = vendor_bids.vendor_id AND v.portal_email = auth.email()
    )
  );

-- Policy 2: Customers can view all bids on their own requests
CREATE POLICY "Customers can view bids on their requests"
  ON vendor_bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = vendor_bids.request_id AND r.customer_id = (
        SELECT id FROM customers WHERE email = auth.email() LIMIT 1
      )
    )
  );

-- Policy 3: Staff/Admins can see and manage all bids
CREATE POLICY "Staff can manage all bids"
  ON vendor_bids FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid()
    )
  );
