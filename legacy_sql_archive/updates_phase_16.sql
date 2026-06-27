-- ============================================================
-- PHASE 16: FINDORA Marketplace (Vendors & Deals Engine)
-- ============================================================

-- 1. Vendors Table (Merchants)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- Future use: Vendor Login
    business_name_en TEXT NOT NULL,
    business_name_ar TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    logo_url TEXT,
    address TEXT,
    location_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_by_staff_id UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Marketplace Products Table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    product_name_en TEXT NOT NULL,
    product_name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    category TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    base_price_egp NUMERIC(12,2) NOT NULL, -- The amount the Vendor wants
    stock_quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Marketplace Deals Table
-- A Deal is a product being explicitly featured on the deals page with a specific markup.
CREATE TABLE IF NOT EXISTS public.marketplace_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
    deal_title_en TEXT NOT NULL,
    deal_title_ar TEXT NOT NULL,
    platform_markup_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00, -- e.g. 5% dynamic fee added on top
    final_customer_price_egp NUMERIC(12,2) NOT NULL, -- Calculated: base_price + markup
    is_featured BOOLEAN NOT NULL DEFAULT false,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'expired')),
    created_by_staff_id UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Dynamic Commission Config Update
-- We insert a setting into economy_config so the admin can change the default commission globally.
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES (
  'deals_commission', 
  '{"default_markup_pct": 5.0, "min_markup_egp": 50}'::jsonb, 
  'Default platform commission added on top of vendor price for marketplace deals.', 
  'عمولة المنصة الافتراضية التي يتم إضافتها فوق سعر التاجر לעروض السوق.', 
  false
) ON CONFLICT (config_key) DO NOTHING;
