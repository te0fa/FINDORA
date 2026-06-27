-- ============================================================
-- BEACHHEAD MARKET SYSTEM SCHEMA & SEED DATA — Batch 9A
-- ============================================================

-- ── 1. ADD BEACHHEAD COLUMNS TO SPECIALIZATIONS ────────────────
ALTER TABLE public.specializations
  ADD COLUMN IF NOT EXISTS is_beachhead BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_stars INT NOT NULL DEFAULT 1 CHECK (priority_stars BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS target_merchants INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS target_deals INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create an index on is_beachhead for fast filter queries
CREATE INDEX IF NOT EXISTS idx_specializations_beachhead ON public.specializations(is_beachhead);


-- ── 2. SEED BEACHHEAD AND TARGET CONFIGURATIONS ───────────────

-- A. Active Beachhead Market: Electronics
UPDATE public.specializations
SET 
  is_beachhead = true,
  priority_stars = 3,
  description_ar = 'الجبهة الأولى – سيطر عليها قبل أي شيء آخر',
  description_en = 'The first front – dominate it before anything else',
  target_merchants = 10,
  target_deals = 5,
  criteria_json = '[
    {"label_ar": "أعلى تكرار شراء", "label_en": "Highest Purchase Frequency", "checked": true},
    {"label_ar": "سهل التحقق من السعر", "label_en": "Easy Price Validation", "checked": true},
    {"label_ar": "قاعدة تجار كبيرة", "label_en": "Large Merchant Base", "checked": true},
    {"label_ar": "Price Data متاحة", "label_en": "Price Data Available", "checked": true},
    {"label_ar": "Reverse Auction يشتغل أحسن", "label_en": "Reverse Auction Works Better", "checked": true}
  ]'::jsonb
WHERE slug = 'electronics';

-- B. Target Market: Furniture (أثاث ومفروشات)
UPDATE public.specializations
SET 
  priority_stars = 2,
  description_ar = 'قيمة عالية + B2B طبيعي',
  description_en = 'High value + natural B2B',
  target_merchants = 15,
  target_deals = 8,
  criteria_json = '[
    {"label_ar": "قيمة عالية", "label_en": "High Average Value", "checked": false},
    {"label_ar": "B2B طبيعي", "label_en": "Natural B2B", "checked": false}
  ]'::jsonb
WHERE slug = 'furniture';

-- C. Target Market: Building Materials (مواد البناء - we will seed this category if not exists)
INSERT INTO public.specializations (slug, name_en, name_ar, parent_id, display_order, priority_stars, description_ar, description_en, target_merchants, target_deals, criteria_json)
VALUES (
  'building_materials',
  'Building Materials',
  'مواد البناء',
  null,
  13,
  2,
  'B2B ضخم',
  'Huge B2B',
  12,
  6,
  '[{"label_ar": "طلب متكرر للمشاريع", "label_en": "Frequent Project Demand", "checked": false}]'::jsonb
)
ON CONFLICT (slug) DO UPDATE
SET 
  priority_stars = 2,
  description_ar = 'B2B ضخم',
  description_en = 'Huge B2B',
  target_merchants = 12,
  target_deals = 6;

-- D. Target Market: Fashion (ملابس وأزياء)
UPDATE public.specializations
SET 
  priority_stars = 1,
  description_ar = 'منافسة عالية جدا',
  description_en = 'Very high competition',
  target_merchants = 20,
  target_deals = 10,
  criteria_json = '[
    {"label_ar": "موسمية متغيرة", "label_en": "High Seasonality", "checked": false},
    {"label_ar": "هوامش ربح مرتفعة", "label_en": "High Profit Margins", "checked": false}
  ]'::jsonb
WHERE slug = 'fashion';
