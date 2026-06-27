-- ============================================================
-- UNIFIED SPECIALIZATIONS + VENDOR ENHANCEMENTS — Batch 8B
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── 1. SPECIALIZATIONS TABLE ──────────────────────────────────
-- Single source of truth for all categories/specializations on the platform.
-- Used by: vendors, deals, offers, requests, and future features.
CREATE TABLE IF NOT EXISTS public.specializations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        NOT NULL UNIQUE,
  name_en       text        NOT NULL,
  name_ar       text        NOT NULL,
  parent_id     uuid        REFERENCES public.specializations(id) ON DELETE SET NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specializations_parent   ON public.specializations(parent_id);
CREATE INDEX IF NOT EXISTS idx_specializations_active   ON public.specializations(is_active);
CREATE INDEX IF NOT EXISTS idx_specializations_order    ON public.specializations(display_order);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.fn_specializations_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_specializations_updated_at
  BEFORE UPDATE ON public.specializations
  FOR EACH ROW EXECUTE FUNCTION public.fn_specializations_set_updated_at();

-- ── 2. SEED DEFAULT CATEGORIES ────────────────────────────────
-- Root / Main categories
INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order) VALUES
  ('electronics',      'Electronics',         'إلكترونيات',         null, 1),
  ('home_appliances',  'Home Appliances',     'أجهزة منزلية',       null, 2),
  ('furniture',        'Furniture',           'أثاث ومفروشات',      null, 3),
  ('automotive',       'Automotive',          'سيارات ومحركات',     null, 4),
  ('real_estate',      'Real Estate',         'عقارات',             null, 5),
  ('fashion',          'Fashion & Apparel',   'ملابس وأزياء',       null, 6),
  ('food_beverage',    'Food & Beverage',     'طعام ومشروبات',      null, 7),
  ('health_beauty',    'Health & Beauty',     'صحة وجمال',          null, 8),
  ('sports_outdoor',   'Sports & Outdoors',   'رياضة وهواء طلق',    null, 9),
  ('services',         'Professional Services','خدمات متخصصة',      null, 10),
  ('kids_toys',        'Kids & Toys',         'أطفال وألعاب',       null, 11),
  ('industrial',       'Industrial Equipment','معدات صناعية',        null, 12)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Electronics
INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'screens',            'Screens & Displays',   'شاشات وعروض',        s.id, 1 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'smart_electronics',  'Smart Electronics',    'إلكترونيات ذكية',    s.id, 2 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'mobile_phones',      'Mobile Phones',        'هواتف محمولة',       s.id, 3 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'laptops_computers',  'Laptops & Computers',  'لابتوب وأجهزة كمبيوتر',s.id, 4 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'tablets',            'Tablets',              'أجهزة لوحية',        s.id, 5 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'cameras_optics',     'Cameras & Optics',     'كاميرات وبصريات',    s.id, 6 FROM public.specializations s WHERE s.slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Home Appliances
INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'kitchen_appliances', 'Kitchen Appliances',   'أجهزة المطبخ',       s.id, 1 FROM public.specializations s WHERE s.slug = 'home_appliances'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'cooling_heating',    'Cooling & Heating',    'تبريد وتدفئة',       s.id, 2 FROM public.specializations s WHERE s.slug = 'home_appliances'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'washing_machines',   'Washing Machines',     'غسالات',              s.id, 3 FROM public.specializations s WHERE s.slug = 'home_appliances'
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Furniture
INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'bedroom_furniture',  'Bedroom Furniture',    'غرف النوم',           s.id, 1 FROM public.specializations s WHERE s.slug = 'furniture'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'living_room',        'Living Room',          'الصالة والريسبشن',    s.id, 2 FROM public.specializations s WHERE s.slug = 'furniture'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order)
SELECT 'office_furniture',   'Office Furniture',     'أثاث مكتبي',          s.id, 3 FROM public.specializations s WHERE s.slug = 'furniture'
ON CONFLICT (slug) DO NOTHING;

-- ── 3. MIGRATE VENDOR_CATEGORIES TO USE SPECIALIZATION IDs ──
-- Add new FK column
ALTER TABLE public.vendor_categories
  ADD COLUMN IF NOT EXISTS specialization_id uuid REFERENCES public.specializations(id);

-- Migrate existing data from old slug to new FK
UPDATE public.vendor_categories vc
SET specialization_id = s.id
FROM public.specializations s
WHERE s.slug = vc.category;

-- Create index on new FK
CREATE INDEX IF NOT EXISTS idx_vendor_cats_spec ON public.vendor_categories(specialization_id);

-- ── 4. VENDOR REVIEWS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  request_id            uuid,                   -- links to a specific request/order
  customer_id           uuid,                   -- nullable (guest reviews supported)
  -- Platform feedback
  platform_rating       int         CHECK (platform_rating BETWEEN 1 AND 5),
  platform_comment      text,
  -- Vendor-specific feedback
  vendor_rating         int         CHECK (vendor_rating BETWEEN 1 AND 5),
  vendor_availability   int         CHECK (vendor_availability BETWEEN 1 AND 5),
  vendor_price_accuracy int         CHECK (vendor_price_accuracy BETWEEN 1 AND 5),
  vendor_communication  int         CHECK (vendor_communication BETWEEN 1 AND 5),
  -- Meta
  review_token          text        UNIQUE,     -- secure token for public review link
  token_expires_at      timestamptz,
  is_published          boolean     NOT NULL DEFAULT false,
  is_archived           boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor  ON public.vendor_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_token   ON public.vendor_reviews(review_token);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_pub     ON public.vendor_reviews(is_published, is_archived);

-- ── 5. VENDOR PORTAL TOKENS (Foundation for vendor app) ───────
CREATE TABLE IF NOT EXISTS public.vendor_portal_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  portal_email text,
  is_active    boolean     NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by   uuid        REFERENCES public.staff_members(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_vendor ON public.vendor_portal_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_token  ON public.vendor_portal_tokens(token);

-- ── 6. ADD VENDOR_ID TO FINDORA_DEALS ────────────────────────
ALTER TABLE public.findora_deals
  ADD COLUMN IF NOT EXISTS vendor_id            uuid REFERENCES public.vendors(id),
  ADD COLUMN IF NOT EXISTS vendor_name_snapshot text;  -- captured name at deal creation time

CREATE INDEX IF NOT EXISTS idx_findora_deals_vendor ON public.findora_deals(vendor_id);

-- ── 7. RPC: COMPUTE AND UPDATE VENDOR TRUST FROM REVIEWS ─────
CREATE OR REPLACE FUNCTION public.fn_refresh_vendor_trust_from_reviews(p_vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_avg_rating      numeric;
  v_review_count    int;
  v_base_score      int;
  v_review_delta    int;
  v_final_score     int;
BEGIN
  SELECT
    AVG((vendor_rating + vendor_availability + vendor_price_accuracy + vendor_communication) / 4.0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.vendor_reviews
  WHERE vendor_id = p_vendor_id
    AND is_published = true
    AND is_archived = false
    AND vendor_rating IS NOT NULL;

  IF v_review_count = 0 THEN RETURN; END IF;

  -- Base score stays, reviews can influence ±20 points
  SELECT trust_score INTO v_base_score FROM public.vendors WHERE id = p_vendor_id;

  -- avg_rating 1-5 → delta -20 to +10
  v_review_delta := ROUND(((v_avg_rating - 3.0) / 2.0) * 15);
  v_final_score  := GREATEST(0, LEAST(100, v_base_score + v_review_delta));

  UPDATE public.vendors SET trust_score = v_final_score WHERE id = p_vendor_id;

  INSERT INTO public.vendor_audit_log(vendor_id, event_name, new_value)
  VALUES (p_vendor_id, 'TRUST_REFRESHED_FROM_REVIEWS',
          jsonb_build_object('avg_rating', v_avg_rating, 'review_count', v_review_count,
                             'delta', v_review_delta, 'new_score', v_final_score));
END;
$$;

-- ── 8. VENDOR PORTAL COLUMNS ON VENDORS TABLE ────────────────
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_email   text;

-- ── 9. ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.specializations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_tokens  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_specializations"
  ON public.specializations FOR ALL TO service_role USING (true);

CREATE POLICY "anon_read_active_specializations"
  ON public.specializations FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "service_role_vendor_reviews"
  ON public.vendor_reviews FOR ALL TO service_role USING (true);

CREATE POLICY "anon_submit_review_by_token"
  ON public.vendor_reviews FOR UPDATE TO anon
  USING (review_token IS NOT NULL AND token_expires_at > now());

CREATE POLICY "service_role_vendor_portal_tokens"
  ON public.vendor_portal_tokens FOR ALL TO service_role USING (true);
