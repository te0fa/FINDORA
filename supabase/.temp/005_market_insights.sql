-- FINDORA — Market Insights (Deal Hunter Community)
-- Migration: 005_market_insights.sql

CREATE TABLE IF NOT EXISTS market_insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_name   TEXT NOT NULL,
  deal_price     NUMERIC(12, 2) NOT NULL,
  store_name     TEXT NOT NULL,
  proof_url      TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE market_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their market insights" ON market_insights;
CREATE POLICY "Users can manage their market insights"
  ON market_insights FOR ALL TO authenticated
  USING (customer_id = (SELECT id FROM customers WHERE email = auth.email() LIMIT 1));

DROP POLICY IF EXISTS "Staff can manage all market insights" ON market_insights;
CREATE POLICY "Staff can manage all market insights"
  ON market_insights FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid()));
