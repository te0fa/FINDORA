-- =============================================================================
-- FINDORA — Advanced Sourcing Marketplace Additions (Phase 3)
-- Migration: 004_advanced_marketplace_additions.sql
-- =============================================================================

-- ─── 1. ALTER REQUESTS TABLE FOR AUTO-REORDER & BUSINESS RFQ ──────────────────
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reorder_interval_months INTEGER DEFAULT 0, -- 0 if not recurring
  ADD COLUMN IF NOT EXISTS last_reordered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rfq_document TEXT;

-- ─── 2. PRICE GUARANTEE REPORTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_guarantees (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  request_id     UUID REFERENCES requests(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  lower_price    NUMERIC(12, 2) NOT NULL,
  proof_details  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_guarantees_cust ON price_guarantees(customer_id);

-- ─── 3. ASK PREVIOUS BUYERS (Q&A COMMUNITY) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_qa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name   TEXT NOT NULL,
  question       TEXT NOT NULL,
  answer         TEXT,
  asker_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  answerer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'flagged')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_qa_product ON buyer_qa(product_name);

-- ─── 4. VERIFIED PURCHASE FOR REVIEWS ──────────────────────────────────────────
ALTER TABLE vendor_reviews
  ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;

-- ─── 5. SECURITY (RLS) ────────────────────────────────────────────────────────
ALTER TABLE price_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their price guarantees"
  ON price_guarantees FOR ALL TO authenticated
  USING (customer_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Staff can manage all price guarantees"
  ON price_guarantees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can ask questions"
  ON buyer_qa FOR ALL TO authenticated
  USING (asker_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Anyone authenticated can view answered QA"
  ON buyer_qa FOR SELECT TO authenticated
  USING (status = 'answered' OR asker_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

CREATE POLICY "Previous buyers can answer questions"
  ON buyer_qa FOR UPDATE TO authenticated
  USING (status = 'pending');
