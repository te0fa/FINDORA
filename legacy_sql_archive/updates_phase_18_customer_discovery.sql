-- Phase 18: Customer & Merchant Discovery Tables & Security

-- 1. CUSTOMER DISCOVERY INTERVIEWS
CREATE TABLE IF NOT EXISTS public.customer_discovery_interviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    interviewer_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    what_wanted_to_buy text,
    how_searches_currently text,
    biggest_frustration text,
    will_pay boolean DEFAULT false,
    potential_commission_egp numeric(12,2) DEFAULT 0.00,
    additional_notes text,
    visited_pages text, -- Optional pages visited
    used_features text, -- Optional features used
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. MERCHANT DISCOVERY STUDIES
CREATE TABLE IF NOT EXISTS public.merchant_discovery_studies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    researcher_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    specialization text,
    estimated_daily_customers integer DEFAULT 0,
    biggest_selling_challenge text,
    accepts_commission boolean DEFAULT false,
    accepts_bidding boolean DEFAULT false,
    conversion_hook text, -- What will make them use Findora
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_cust_discovery_customer_id ON public.customer_discovery_interviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_merchant_discovery_merchant_id ON public.merchant_discovery_studies(merchant_id);

-- Enable RLS
ALTER TABLE public.customer_discovery_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_discovery_studies ENABLE ROW LEVEL SECURITY;

-- Security Policies (Active Staff members can manage all discovery records)
DO $$ 
BEGIN
    -- Customer Discovery Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_discovery_interviews' AND policyname = 'Staff manage customer discovery') THEN
        CREATE POLICY "Staff manage customer discovery" ON public.customer_discovery_interviews FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Merchant Discovery Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_discovery_studies' AND policyname = 'Staff manage merchant discovery') THEN
        CREATE POLICY "Staff manage merchant discovery" ON public.merchant_discovery_studies FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- 3. COMPANY EXPERIMENTS & DECISION LOGS
CREATE TABLE IF NOT EXISTS public.company_experiments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    hypothesis text,
    methodology text,
    status text NOT NULL DEFAULT 'not_started', -- 'not_started', 'active', 'completed_success', 'completed_fail'
    impact_analysis text,
    created_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS and define policies (Only active admins/staff can manage)
ALTER TABLE public.company_experiments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_experiments' AND policyname = 'Staff manage experiments') THEN
        CREATE POLICY "Staff manage experiments" ON public.company_experiments FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- 4. MARKET HEALTH & NETWORK EFFECTS INDICATORS
CREATE TABLE IF NOT EXISTS public.market_health_indicators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    specialization text NOT NULL DEFAULT 'global' UNIQUE, -- 'global' or category name
    goal_quotes_per_request numeric(5,2) DEFAULT 3.0,
    goal_response_time_hours numeric(5,2) DEFAULT 4.0,
    goal_merchant_win_rate_pct numeric(5,2) DEFAULT 30.0,
    goal_active_merchants_week integer DEFAULT 8,
    goal_request_conversion_rate_pct numeric(5,2) DEFAULT 25.0,
    goal_avg_deal_value_egp numeric(10,2) DEFAULT 5000.0,
    shortfalls_comments text, -- عوامل التقصير في هذا المجال
    strength_merchants_comments text, -- البنود والتجار الأقوياء القابلة للتكبير
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS and define policies (Only active admins/staff can manage)
ALTER TABLE public.market_health_indicators ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'market_health_indicators' AND policyname = 'Staff manage market health') THEN
        CREATE POLICY "Staff manage market health" ON public.market_health_indicators FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- 5. PROJECT PHASES & ROADMAP PLANNER
CREATE TABLE IF NOT EXISTS public.project_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_number integer UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    tip_en text,
    tip_ar text,
    status text NOT NULL DEFAULT 'locked', -- 'active', 'next', 'locked'
    tags text[], -- e.g. ARRAY['AI', 'UX']
    target_merchants integer DEFAULT 0,
    target_customers integer DEFAULT 0,
    target_deals integer DEFAULT 0,
    target_requests integer DEFAULT 0,
    progress_override integer, -- Optional override
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS and define policies (Only active admins/staff can manage)
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'Staff manage project phases') THEN
        CREATE POLICY "Staff manage project phases" ON public.project_phases FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Insert Seed Data for project phases matching the mockup
INSERT INTO public.project_phases (phase_number, title_en, title_ar, description_en, description_ar, tip_en, tip_ar, status, tags, target_merchants, target_customers, target_deals, target_requests)
VALUES
    (0, 'Validation', 'Validation', 'Verify idea in the electronics category first.', 'إثبات الفكرة في فئة الإلكترونيات أولاً.', 'Before building anything we must prove there is real demand.', 'قبل أي بناء لازم نثبت إن في طلب حقيقي.', 'active', ARRAY['Validation'], 10, 20, 5, 0),
    (1, 'Smart Concierge', 'Smart Concierge', 'Customer describes needs - AI extracts specifications.', 'العميل يصف احتياجه – AI يستخرج المواصفات.', 'Makes you different from every price comparison site.', 'بيخليك مختلف عن كل موقع مقارنة أسعار.', 'next', ARRAY['AI', 'UX'], 0, 100, 0, 50),
    (2, 'Supplier Network', 'Supplier Network', '100 suppliers with professional profiles.', '100 تاجر بملفات شخصية احترافية.', 'The network is the real muscle.', 'الشبكة هي العضلة الحقيقية.', 'locked', ARRAY['CRM'], 100, 0, 0, 0),
    (3, 'Reverse Auction', 'Reverse Auction', 'Customer requests, suppliers compete with a live price.', 'العميل يطلب، التجار يتنافسون بسعر حي.', 'Suppliers chase the customer - not the other way around.', 'التجار يطاردون العميل – مش العكس.', 'locked', ARRAY['AI', 'Marketplace'], 0, 0, 0, 1000),
    (4, 'Findora Protection', 'Findora Protection', 'Escrow - Deposit secures receipt confirmation.', 'Escrow — العربون يحجز حق تأكيد الاستلام.', 'Trust is not just talk - must have a financial system.', 'الثقة مش كلام – لازم نظام مالي.', 'locked', ARRAY['Payments', 'Trust'], 0, 0, 100, 0)
ON CONFLICT (phase_number) DO UPDATE
SET title_en = EXCLUDED.title_en,
    title_ar = EXCLUDED.title_ar,
    description_en = EXCLUDED.description_en,
    description_ar = EXCLUDED.description_ar,
    tip_en = EXCLUDED.tip_en,
    tip_ar = EXCLUDED.tip_ar,
    status = EXCLUDED.status,
    tags = EXCLUDED.tags,
    target_merchants = EXCLUDED.target_merchants,
    target_customers = EXCLUDED.target_customers,
    target_deals = EXCLUDED.target_deals,
    target_requests = EXCLUDED.target_requests;
