-- =============================================================================
-- FINDORA — Product Intelligence Platform
-- Migration: 001_product_catalog.sql
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ─── 1. PRODUCTS TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar         TEXT NOT NULL,
  title_en         TEXT,
  brand            TEXT,
  category         TEXT NOT NULL,
  subcategory      TEXT,
  current_price    NUMERIC(12, 2),
  currency_code    TEXT NOT NULL DEFAULT 'EGP',
  source           TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'research_item' | 'vendor_feed'
  source_url       TEXT,
  vendor_id        UUID REFERENCES vendors(id) ON DELETE SET NULL,
  research_item_id UUID,   -- soft-ref to research_items (may not always exist)
  specifications   JSONB NOT NULL DEFAULT '{}',
  image_url        TEXT,
  popularity_score INT NOT NULL DEFAULT 0,          -- incremented on views/requests
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_by       UUID,                             -- staff auth user id
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price      ON products(current_price);
CREATE INDEX IF NOT EXISTS idx_products_vendor     ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_specs      ON products USING GIN(specifications);
CREATE INDEX IF NOT EXISTS idx_products_source     ON products(source);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. PRICE HISTORY TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price         NUMERIC(12, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'EGP',
  source        TEXT,         -- 'staff_update', 'auto_sync', 'vendor_feed'
  captured_by   UUID,         -- staff auth user id or NULL for system
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent capturing the exact same price more than once per 30 minutes per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_dedup
  ON price_history(product_id, price, date_trunc('hour', captured_at AT TIME ZONE 'UTC'));

-- Fast time-series queries
CREATE INDEX IF NOT EXISTS idx_price_history_product_time
  ON price_history(product_id, captured_at DESC);

-- ─── 3. PRICE EVENTS TABLE ───────────────────────────────────────────────────
-- Generated columns automatically compute change/direction

CREATE TABLE IF NOT EXISTS price_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price         NUMERIC(12, 2) NOT NULL,
  new_price         NUMERIC(12, 2) NOT NULL,
  absolute_change   NUMERIC(12, 2) NOT NULL,    -- computed on insert
  percentage_change NUMERIC(10, 4) NOT NULL,    -- computed on insert
  direction         TEXT NOT NULL,              -- 'up' | 'down' | 'no_change'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_events_product
  ON price_events(product_id, created_at DESC);

-- ─── 4. PRICE TRENDS TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_trends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  trend_7d        TEXT,             -- 'stable'|'slow_decline'|'fast_decline'|'slow_increase'|'fast_increase'
  trend_30d       TEXT,
  trend_90d       TEXT,
  pct_change_7d   NUMERIC(10, 4),
  pct_change_30d  NUMERIC(10, 4),
  pct_change_90d  NUMERIC(10, 4),
  lowest_price    NUMERIC(12, 2),
  highest_price   NUMERIC(12, 2),
  average_price   NUMERIC(12, 2),
  trend_score     SMALLINT,         -- 0-100 (100 = best buying opportunity)
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. USER WATCHLISTS TABLE ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_watchlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_customer ON user_watchlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_product  ON user_watchlists(product_id);

-- ─── 6. PRICE ALERTS TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,     -- 'any_drop' | 'pct_5' | 'pct_10' | 'pct_20' | 'custom_pct' | 'target_price'
  target_price    NUMERIC(12, 2),    -- for 'target_price' type
  target_pct      NUMERIC(6, 2),     -- for 'custom_pct' type
  channels        TEXT[] NOT NULL DEFAULT '{sms}', -- 'sms','email','push','whatsapp'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  triggered_count INT NOT NULL DEFAULT 0,
  last_triggered  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, product_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_customer ON price_alerts(customer_id);

-- ─── 7. ALERT EVENTS TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id       UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  customer_id    UUID NOT NULL REFERENCES customers(id),
  trigger_price  NUMERIC(12, 2) NOT NULL,
  old_price      NUMERIC(12, 2) NOT NULL,
  savings_amount NUMERIC(12, 2),
  savings_pct    NUMERIC(8, 4),
  channel        TEXT NOT NULL,        -- which channel this event is for
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'sent'|'failed'
  error_message  TEXT,
  sent_at        TIMESTAMPTZ,
  retry_count    SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_pending
  ON alert_events(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_alert_events_customer
  ON alert_events(customer_id, created_at DESC);

-- ─── 8. ROW LEVEL SECURITY ───────────────────────────────────────────────────

-- Products: readable by all authenticated users
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "products_staff_all" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid() AND is_active = true)
);

-- Price history: readable by all authenticated users
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history_read" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "price_history_staff_insert" ON price_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM staff_members WHERE auth_user_id = auth.uid() AND is_active = true)
);

-- Price trends: readable by all
ALTER TABLE price_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_trends_read" ON price_trends FOR SELECT TO authenticated USING (true);

-- Watchlists: own records only
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlists_own" ON user_watchlists FOR ALL USING (
  customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);

-- Price alerts: own records only
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_own" ON price_alerts FOR ALL USING (
  customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);

-- ─── 9. pg_cron JOB — Recompute Trends Every 6 Hours ─────────────────────────
-- Run this AFTER pg_cron extension is enabled in Supabase Dashboard:
-- SELECT cron.schedule('recompute-price-trends', '0 */6 * * *',
--   $$ SELECT compute_all_price_trends(); $$
-- );

-- ─── 10. HELPER FUNCTION — Compute All Trends ────────────────────────────────
CREATE OR REPLACE FUNCTION compute_all_price_trends()
RETURNS void AS $$
DECLARE
  prod RECORD;
BEGIN
  FOR prod IN SELECT id FROM products WHERE is_active = true LOOP
    PERFORM compute_product_trend(prod.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Per-product trend computation
CREATE OR REPLACE FUNCTION compute_product_trend(p_product_id UUID)
RETURNS void AS $$
DECLARE
  v_current     NUMERIC;
  v_price_7d    NUMERIC;
  v_price_30d   NUMERIC;
  v_price_90d   NUMERIC;
  v_lowest      NUMERIC;
  v_highest     NUMERIC;
  v_average     NUMERIC;
  v_pct_7d      NUMERIC;
  v_pct_30d     NUMERIC;
  v_pct_90d     NUMERIC;
BEGIN
  -- Current price
  SELECT current_price INTO v_current FROM products WHERE id = p_product_id;

  -- Price N days ago (first record in that window)
  SELECT price INTO v_price_7d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '7 days'
  ORDER BY captured_at ASC LIMIT 1;

  SELECT price INTO v_price_30d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '30 days'
  ORDER BY captured_at ASC LIMIT 1;

  SELECT price INTO v_price_90d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '90 days'
  ORDER BY captured_at ASC LIMIT 1;

  -- Aggregate stats from all-time history
  SELECT MIN(price), MAX(price), ROUND(AVG(price), 2)
  INTO v_lowest, v_highest, v_average
  FROM price_history WHERE product_id = p_product_id;

  -- % changes
  v_pct_7d  := CASE WHEN v_price_7d  IS NOT NULL AND v_price_7d  <> 0
                    THEN ROUND(((v_current - v_price_7d)  / v_price_7d)  * 100, 4) END;
  v_pct_30d := CASE WHEN v_price_30d IS NOT NULL AND v_price_30d <> 0
                    THEN ROUND(((v_current - v_price_30d) / v_price_30d) * 100, 4) END;
  v_pct_90d := CASE WHEN v_price_90d IS NOT NULL AND v_price_90d <> 0
                    THEN ROUND(((v_current - v_price_90d) / v_price_90d) * 100, 4) END;

  -- Upsert into price_trends
  INSERT INTO price_trends (
    product_id, trend_7d, trend_30d, trend_90d,
    pct_change_7d, pct_change_30d, pct_change_90d,
    lowest_price, highest_price, average_price,
    trend_score, computed_at
  )
  VALUES (
    p_product_id,
    classify_trend(v_pct_7d),
    classify_trend(v_pct_30d),
    classify_trend(v_pct_90d),
    v_pct_7d, v_pct_30d, v_pct_90d,
    v_lowest, v_highest, v_average,
    compute_trend_score(v_current, v_lowest, v_highest, v_pct_30d),
    NOW()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    trend_7d = EXCLUDED.trend_7d,
    trend_30d = EXCLUDED.trend_30d,
    trend_90d = EXCLUDED.trend_90d,
    pct_change_7d = EXCLUDED.pct_change_7d,
    pct_change_30d = EXCLUDED.pct_change_30d,
    pct_change_90d = EXCLUDED.pct_change_90d,
    lowest_price = EXCLUDED.lowest_price,
    highest_price = EXCLUDED.highest_price,
    average_price = EXCLUDED.average_price,
    trend_score = EXCLUDED.trend_score,
    computed_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Classify trend direction from % change
CREATE OR REPLACE FUNCTION classify_trend(pct_change NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF pct_change IS NULL THEN RETURN NULL; END IF;
  IF pct_change > 10  THEN RETURN 'fast_increase'; END IF;
  IF pct_change > 2   THEN RETURN 'slow_increase'; END IF;
  IF pct_change < -10 THEN RETURN 'fast_decline'; END IF;
  IF pct_change < -2  THEN RETURN 'slow_decline'; END IF;
  RETURN 'stable';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trend score: 100 = near all-time low (great to buy), 0 = near all-time high
CREATE OR REPLACE FUNCTION compute_trend_score(
  current_price NUMERIC,
  lowest_price  NUMERIC,
  highest_price NUMERIC,
  pct_30d       NUMERIC
) RETURNS SMALLINT AS $$
DECLARE
  price_score    NUMERIC;
  momentum_score NUMERIC;
BEGIN
  IF lowest_price IS NULL OR highest_price IS NULL OR highest_price = lowest_price
  THEN RETURN 50; END IF;

  -- Price position score (0-70): closer to low = higher score
  price_score := 70 * (1 - (current_price - lowest_price) / (highest_price - lowest_price));

  -- Momentum score (0-30): declining = good buying opportunity
  momentum_score := CASE
    WHEN pct_30d IS NULL THEN 15
    WHEN pct_30d < -10   THEN 30
    WHEN pct_30d < -5    THEN 22
    WHEN pct_30d < 0     THEN 17
    WHEN pct_30d < 5     THEN 12
    ELSE 5
  END;

  RETURN LEAST(100, GREATEST(0, ROUND(price_score + momentum_score)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
