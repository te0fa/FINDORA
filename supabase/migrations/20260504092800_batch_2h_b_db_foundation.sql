-- Batch 2H-B: Database Foundation
-- 1. Staff Roles update
-- Preserve: admin, owner, reviewer, researcher, field_agent, reporter, support
-- Add: content_manager, deals_manager, news_manager, pricing_manager

ALTER TABLE public.staff_member_roles DROP CONSTRAINT IF EXISTS ck_role_code_allowed;
ALTER TABLE public.staff_member_roles ADD CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
    'admin', 'owner', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support',
    'content_manager', 'deals_manager', 'news_manager', 'pricing_manager'
));

-- 2. service_catalog
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key text UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed service_catalog
INSERT INTO public.service_catalog (service_key, title_en, title_ar, display_order)
VALUES 
    ('everyday_purchase', 'Everyday Purchase', 'مشتريات يومية', 10),
    ('high_value_asset', 'High-Value Asset', 'أصول عالية القيمة', 20),
    ('project_supply', 'Project Supply', 'توريدات مشروعات', 30),
    ('general_service', 'General Service', 'خدمات عامة', 40)
ON CONFLICT (service_key) DO NOTHING;

-- 3. service_pricing_versions
CREATE TABLE IF NOT EXISTS public.service_pricing_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key text REFERENCES public.service_catalog(service_key),
    version_no integer NOT NULL,
    original_price numeric(12,2),
    current_price numeric(12,2) NOT NULL,
    currency_code text DEFAULT 'EGP',
    promo_label_en text,
    promo_label_ar text,
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean DEFAULT true,
    created_by_staff_id uuid REFERENCES public.staff_members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(service_key, version_no),
    CONSTRAINT ck_current_price_positive CHECK (current_price >= 0),
    CONSTRAINT ck_original_price_valid CHECK (original_price IS NULL OR original_price >= current_price)
);

-- Seed everyday_purchase active version
INSERT INTO public.service_pricing_versions 
    (service_key, version_no, original_price, current_price, promo_label_en, promo_label_ar)
VALUES 
    ('everyday_purchase', 1, 299, 99, 'Limited time', 'لفترة محدودة')
ON CONFLICT (service_key, version_no) DO NOTHING;

-- 4. homepage_announcements
CREATE TABLE IF NOT EXISTS public.homepage_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    body_en text,
    body_ar text,
    announcement_type text NOT NULL DEFAULT 'news',
    image_path text,
    link_url text,
    starts_at timestamptz,
    ends_at timestamptz,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_dismissible boolean DEFAULT true,
    created_by_staff_id uuid REFERENCES public.staff_members(id),
    updated_by_staff_id uuid REFERENCES public.staff_members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT ck_announcement_type CHECK (announcement_type IN ('news','offer','event','system','deal'))
);

-- Seed announcement for everyday purchase
INSERT INTO public.homepage_announcements 
    (slug, title_en, title_ar, body_en, body_ar, announcement_type, link_url)
VALUES 
    ('everyday-purchase-promo', 'Special Offer', 'عرض خاص', 'Get everyday purchase service for only 99 EGP!', 'احصل على خدمة المشتريات اليومية بـ 99 جنيه فقط!', 'offer', '/services/everyday_purchase')
ON CONFLICT (slug) DO NOTHING;

-- 5. findora_deals
CREATE TABLE IF NOT EXISTS public.findora_deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    original_price numeric(12,2),
    deal_price numeric(12,2) NOT NULL,
    currency_code text DEFAULT 'EGP',
    image_path text,
    category text,
    stock_quantity integer,
    deal_status text NOT NULL DEFAULT 'draft',
    featured_on_homepage boolean DEFAULT false,
    display_order integer DEFAULT 0,
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean DEFAULT true,
    created_by_staff_id uuid REFERENCES public.staff_members(id),
    updated_by_staff_id uuid REFERENCES public.staff_members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT ck_deal_status CHECK (deal_status IN ('draft','active','paused','sold_out','expired','archived')),
    CONSTRAINT ck_deal_price_positive CHECK (deal_price >= 0),
    CONSTRAINT ck_original_price_valid CHECK (original_price IS NULL OR original_price >= deal_price),
    CONSTRAINT ck_stock_quantity_non_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0)
);

-- 6. findora_deal_inquiries
CREATE TABLE IF NOT EXISTS public.findora_deal_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id uuid REFERENCES public.findora_deals(id),
    customer_id uuid REFERENCES public.customers(id),
    customer_name text,
    customer_phone text NOT NULL,
    customer_email text,
    notes text,
    inquiry_status text NOT NULL DEFAULT 'new',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT ck_inquiry_status CHECK (inquiry_status IN ('new','contacted','reserved','closed','cancelled'))
);

-- 7. site_content_blocks
CREATE TABLE IF NOT EXISTS public.site_content_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_key text UNIQUE NOT NULL,
    page_key text NOT NULL,
    section_key text NOT NULL,
    title_en text,
    title_ar text,
    body_en text,
    body_ar text,
    image_path text,
    cta_label_en text,
    cta_label_ar text,
    cta_href text,
    content_json jsonb DEFAULT '{}'::jsonb,
    is_published boolean DEFAULT true,
    display_order integer DEFAULT 0,
    updated_by_staff_id uuid REFERENCES public.staff_members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 8. site_content_audit
CREATE TABLE IF NOT EXISTS public.site_content_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_key text NOT NULL,
    old_snapshot jsonb,
    new_snapshot jsonb,
    changed_by_staff_id uuid REFERENCES public.staff_members(id),
    change_reason text,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findora_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findora_deal_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content_audit ENABLE ROW LEVEL SECURITY;

-- Helper function to check if staff has a specific role
CREATE OR REPLACE FUNCTION public.fn_staff_has_role(p_role text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND (s.staff_role = 'admin' OR s.staff_role = 'owner' OR s.staff_role = p_role)
    ) OR EXISTS (
        SELECT 1 FROM public.staff_members s
        JOIN public.staff_member_roles r ON r.staff_member_id = s.id
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND r.is_active = true
        AND (r.role_code = p_role OR r.role_code = 'admin' OR r.role_code = 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Universal Admin Check Helper
CREATE OR REPLACE FUNCTION public.fn_is_staff_manager()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND (s.staff_role = 'admin' OR s.staff_role = 'owner')
    ) OR EXISTS (
        SELECT 1 FROM public.staff_members s
        JOIN public.staff_member_roles r ON r.staff_member_id = s.id
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND r.is_active = true
        AND (r.role_code = 'admin' OR r.role_code = 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for service_catalog
CREATE POLICY "Public read active services" ON public.service_catalog
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manage services" ON public.service_catalog
    FOR ALL USING (public.fn_is_staff_manager());

-- Policies for service_pricing_versions
CREATE POLICY "Public read active pricing" ON public.service_pricing_versions
    FOR SELECT USING (
        is_active = true 
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
    );

CREATE POLICY "Staff manage pricing" ON public.service_pricing_versions
    FOR ALL USING (public.fn_staff_has_role('pricing_manager'));

-- Policies for homepage_announcements
CREATE POLICY "Public read active announcements" ON public.homepage_announcements
    FOR SELECT USING (
        is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
    );

CREATE POLICY "Staff manage news" ON public.homepage_announcements
    FOR ALL USING (
        public.fn_staff_has_role('news_manager') 
        OR public.fn_staff_has_role('content_manager')
    );

-- Policies for findora_deals
CREATE POLICY "Public read active deals" ON public.findora_deals
    FOR SELECT USING (
        is_active = true 
        AND deal_status = 'active'
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
    );

CREATE POLICY "Staff manage deals" ON public.findora_deals
    FOR ALL USING (public.fn_staff_has_role('deals_manager'));

-- Policies for findora_deal_inquiries
CREATE POLICY "Public can insert inquiries" ON public.findora_deal_inquiries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff manage inquiries" ON public.findora_deal_inquiries
    FOR ALL USING (public.fn_staff_has_role('deals_manager'));

-- Policies for site_content_blocks
CREATE POLICY "Public read published content" ON public.site_content_blocks
    FOR SELECT USING (is_published = true);

CREATE POLICY "Staff manage content" ON public.site_content_blocks
    FOR ALL USING (public.fn_staff_has_role('content_manager'));

-- Policies for site_content_audit (Append-only)
CREATE POLICY "Staff read audit" ON public.site_content_audit
    FOR SELECT USING (
        public.fn_staff_has_role('content_manager')
        OR public.fn_is_staff_manager()
    );

CREATE POLICY "Staff insert audit" ON public.site_content_audit
    FOR INSERT WITH CHECK (
        public.fn_staff_has_role('content_manager')
        OR public.fn_is_staff_manager()
    );

-- Note: No UPDATE or DELETE policies for site_content_audit to ensure immutability.
