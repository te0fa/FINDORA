-- =============================================================================
-- FINDORA — Advanced Marketplace Sourcing & Demand Intelligence (Phase 2)
-- Migration: 003_marketplace_advanced_features.sql
-- =============================================================================

-- ─── 1. SEPARATE LEDGER TABLES FOR POINTS SYSTEM ──────────────────────────────

-- Ledger for Customer Points (Redeemable for VIP features)
CREATE TABLE IF NOT EXISTS customer_points_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points       INTEGER NOT NULL,                     -- Positive for earned, negative for redeemed
  action_type  TEXT NOT NULL,                       -- 'request_created', 'review_submitted', 'purchase_confirmed', 'friend_referred', 'vip_redeemed'
  reference_id UUID,                                 -- References request, review, or referral log
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_points_cust ON customer_points_ledger(customer_id);

-- Ledger for Partner/Scout Points (Redeemable for Cash/Commissions later)
CREATE TABLE IF NOT EXISTS partner_points_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  points       INTEGER NOT NULL,
  action_type  TEXT NOT NULL,                       -- 'valid_bid_placed', 'lead_confirmed', 'sale_completed', 'payout'
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_points_partner ON partner_points_ledger(partner_id);

-- ─── 2. WAITLISTS & GROUP BUYING POOLS ────────────────────────────────────────

-- Product Waitlists (When product is searched but out of stock)
CREATE TABLE IF NOT EXISTS product_waitlists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_product_waitlists_name ON product_waitlists(product_name);

-- Group Buying Pools (Grouping matching buyer demands for volume discount)
CREATE TABLE IF NOT EXISTS group_buying_pools (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name     TEXT NOT NULL,
  category         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'negotiating' | 'completed' | 'expired'
  target_quantity  INTEGER NOT NULL DEFAULT 10,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members in Group Buying Pools
CREATE TABLE IF NOT EXISTS group_buying_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id     UUID NOT NULL REFERENCES group_buying_pools(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  request_id  UUID REFERENCES requests(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pool_id, customer_id)
);

-- ─── 3. REVIEWS & DISPUTES ───────────────────────────────────────────────────

-- Add multi-dimensional rating columns to vendor_reviews
ALTER TABLE vendor_reviews
  ADD COLUMN IF NOT EXISTS recommend BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_rating INTEGER,       -- 1-5
  ADD COLUMN IF NOT EXISTS response_rating INTEGER,    -- 1-5
  ADD COLUMN IF NOT EXISTS commitment_rating INTEGER,  -- 1-5
  ADD COLUMN IF NOT EXISTS quality_rating INTEGER,     -- 1-5
  ADD COLUMN IF NOT EXISTS review_tags TEXT[],         -- e.g. {'Fair price', 'Fast response'}
  ADD COLUMN IF NOT EXISTS image_url TEXT,             -- Buyer upload proof
  ADD COLUMN IF NOT EXISTS video_url TEXT;             -- Buyer upload proof video

-- Dispute Center Table
CREATE TABLE IF NOT EXISTS request_disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id        UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  dispute_reason   TEXT NOT NULL,                   -- 'price_discrepancy' | 'item_mismatch' | 'execution_issue' | 'other'
  details          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'under_review' | 'resolved' | 'closed'
  resolution_notes TEXT,
  resolved_by      UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_disputes_request ON request_disputes(request_id);

-- ─── 4. VENDORS TRUST SCORE METRICS ──────────────────────────────────────────

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS response_speed_hours NUMERIC DEFAULT 24,
  ADD COLUMN IF NOT EXISTS bid_win_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_satisfaction_rate NUMERIC DEFAULT 85,
  ADD COLUMN IF NOT EXISTS price_reliability_rate NUMERIC DEFAULT 95,
  ADD COLUMN IF NOT EXISTS trusted_score NUMERIC(5,2) DEFAULT 85;

-- ─── 5. REFERRALS LEDGER ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID NOT NULL,                      -- references customers, vendors, or staff
  referrer_type  TEXT NOT NULL,                      -- 'customer' | 'vendor' | 'partner'
  referred_email TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'signed_up' | 'first_transaction'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_email)
);

-- ─── 6. SECURITY (RLS) ────────────────────────────────────────────────────────

ALTER TABLE customer_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies
CREATE POLICY "Users can view their own points ledger"
  ON customer_points_ledger FOR SELECT TO authenticated
  USING (customer_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Partners can view their own points ledger"
  ON partner_points_ledger FOR SELECT TO authenticated
  USING (partner_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can manage their waitlists"
  ON product_waitlists FOR ALL TO authenticated
  USING (customer_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Users can manage their disputes"
  ON request_disputes FOR ALL TO authenticated
  USING (customer_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Staff can manage all disputes"
  ON request_disputes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid()));
