-- ============================================================
-- FLYWHEEL ENGINE & WHALE CUSTOMER SEGMENT SCHEMA — Batch 9B
-- ============================================================

-- Create service_role, anon, authenticated if not exist (for local standard pg environment compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

-- ── 1. FLYWHEEL STAGES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flywheel_stages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        NOT NULL UNIQUE,
  name_en         text        NOT NULL,
  name_ar         text        NOT NULL,
  metric_key      text        NOT NULL,
  current_value   numeric     NOT NULL DEFAULT 0.0,
  target_value    numeric     NOT NULL DEFAULT 100.0,
  display_order   int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed default Flywheel stages matching the mockup
INSERT INTO public.flywheel_stages (slug, name_en, name_ar, metric_key, current_value, target_value, display_order) VALUES
  ('new_customers',      'New Customers',       'عميل جديد',       'new_customers',      0, 100, 1),
  ('more_orders',       'More Orders',         'طلبات أكثر',       'more_orders',       0, 50,  2),
  ('more_merchants',    'More Merchants',      'تجار أكثر',       'more_merchants',    0, 20,  3),
  ('better_deals',      'Better Deals',        'عروض أفضل',       'better_deals',      0, 10,  4),
  ('better_prices',     'Better Prices',       'أسعار أفضل',       'better_prices',     0, 100, 5),
  ('higher_satisfaction','Higher Satisfaction', 'رضا أعلى',        'higher_satisfaction',0, 100, 6)
ON CONFLICT (slug) DO NOTHING;

-- RLS for Flywheel
ALTER TABLE public.flywheel_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_flywheel"
  ON public.flywheel_stages FOR ALL TO service_role USING (true);

CREATE POLICY "anon_read_flywheel"
  ON public.flywheel_stages FOR SELECT TO anon, authenticated USING (true);
