-- Phase 22: Platform Moats & Competitor Threats Tracking

CREATE TABLE IF NOT EXISTS public.platform_moats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    moat_number integer UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text,
    description_ar text,
    moat_type text NOT NULL, -- 'network_effects', 'data_moat', 'algorithmic', 'switching_cost', 'asset_lockin', 'brand', 'insight', 'scout_network'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moat_competitor_threats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    moat_id uuid REFERENCES public.platform_moats(id) ON DELETE CASCADE,
    competitor_name text NOT NULL,
    threat_description_ar text NOT NULL,
    threat_description_en text NOT NULL,
    counter_strategy_ar text NOT NULL,
    counter_strategy_en text NOT NULL,
    severity_level text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    logged_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_moats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moat_competitor_threats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_moats' AND policyname = 'Staff manage moats') THEN
        CREATE POLICY "Staff manage moats" ON public.platform_moats FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'moat_competitor_threats' AND policyname = 'Staff manage threats') THEN
        CREATE POLICY "Staff manage threats" ON public.moat_competitor_threats FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed initial 7 moats + 1 unique Sourcing/Scout Moat
INSERT INTO public.platform_moats (moat_number, title_en, title_ar, description_en, description_ar, moat_type)
VALUES
    (1, 'Supplier Network', 'Supplier Network', 'Value Loop accumulates over time - each new merchant increases the platform utility for everyone.', 'Value Loop تتراكم مع الوقت – كل تاجر جديد يزيد قيمة المنصة وفائدتها.', 'network_effects'),
    (2, 'Historical Price Database', 'Historical Price Database', 'After two years: the largest, most accurate granular price history database in Egypt.', 'بعد سنتين: أكبر وأدق قاعدة بيانات أسعار تاريخية في مصر.', 'data_moat'),
    (3, 'Findora Score Algorithm', 'Findora Score Algorithm', 'Scores improve dynamically with every transaction – accumulated knowledge that cannot be bought or faked.', 'تتحسن خوارزميات التقييم تلقائياً مع كل صفقة – معرفة متراكمة حقيقية لا تشترى.', 'algorithmic'),
    (4, 'Trust + Verification', 'Trust + Verification', 'Verified, high-scoring merchants will not leave – transferring means losing their hard-earned rating assets.', 'التاجر الموثوق لن ينتقل لمنصة أخرى – الخروج يعني فقدان تقييماته وجدارته الائتمانية.', 'switching_cost'),
    (5, 'Business Pages', 'Business Pages', 'The merchant''s verified profile page becomes their primary digital business asset.', 'صفحة المورد الموثقة تصبح أصله الرقمي الأساسي لإثبات نشاطه ونجاحه.', 'asset_lockin'),
    (6, 'Customer First Brand', 'Customer First Brand', 'We do not compete with Amazon - we represent the buyer and act as their procurement advocate.', 'لا ننافس أمازون – نحن نمثل المشتري وندافع عن حقوقه ومصالحه السعرية.', 'brand'),
    (7, 'Discovery Data', 'Discovery Data', 'Real-world customer and merchant discovery logs - unique granular understanding of local market gaps.', 'بيانات Customer + Merchant Discovery – فهم دقيق وعميق لفجوات السوق المحلي لا يملكه أحد.', 'insight'),
    (8, 'Capillary Scout Network', 'شبكة المناديب الميدانية', 'Capillary physical sourcing - scouts onboard traditional merchants in alleys and local markets that search engines cannot reach.', 'الوصول الميداني العميق – مناديب مؤهلون لتسجيل الموردين التقليديين في الحواري والأسواق التي تعجز خوارزميات الويب عن فهرستها.', 'scout_network')
ON CONFLICT (moat_number) DO UPDATE
SET title_en = EXCLUDED.title_en,
    title_ar = EXCLUDED.title_ar,
    description_en = EXCLUDED.description_en,
    description_ar = EXCLUDED.description_ar,
    moat_type = EXCLUDED.moat_type;
