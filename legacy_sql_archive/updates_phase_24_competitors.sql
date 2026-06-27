-- Phase 24: Competitors Intel & Feature Comparisons
CREATE TABLE IF NOT EXISTS public.competitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL UNIQUE,
    name_ar text NOT NULL UNIQUE,
    category_en text NOT NULL,
    category_ar text NOT NULL,
    strength_rating integer DEFAULT 3 CHECK (strength_rating BETWEEN 1 AND 5), -- Findora's standing vs them
    gap_analysis_en text,
    gap_analysis_ar text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitor_feature_comparisons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id uuid REFERENCES public.competitors(id) ON DELETE CASCADE,
    feature_name_en text NOT NULL,
    feature_name_ar text NOT NULL,
    status_in_competitor_en text NOT NULL,
    status_in_competitor_ar text NOT NULL,
    required_phase_number integer NOT NULL, -- Triggers advantage if project_phases.phase_number is active/completed
    advantage_desc_en text NOT NULL,
    advantage_desc_ar text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_feature_comparisons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitors' AND policyname = 'Staff manage competitors') THEN
        CREATE POLICY "Staff manage competitors" ON public.competitors FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitor_feature_comparisons' AND policyname = 'Staff manage comparisons') THEN
        CREATE POLICY "Staff manage comparisons" ON public.competitor_feature_comparisons FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed Competitors
INSERT INTO public.competitors (name_en, name_ar, category_en, category_ar, strength_rating, gap_analysis_en, gap_analysis_ar)
VALUES
    ('Compareit4me', 'Compareit4me', 'Price Comparison', 'مقارنة الأسعار', 4, 'Need to launch the automated AI negotiation bots (Phase 13) to fully scale the price bidding over them.', 'نحتاج لإطلاق روبوتات التفاوض الآلية المدعومة بالذكاء الاصطناعي (المرحلة 13) لتوسيع نطاق عروض الأسعار بالكامل وتجاوزهم.'),
    ('Amazon / Noon', 'Amazon / Noon', 'E-commerce Platforms', 'منصات التجارة الإلكترونية', 3, 'Requires full buyer representation policy enforcement and a verified local merchant badge network (Phase 15).', 'يتطلب تطبيق سياسة تمثيل المشتري بالكامل وتفعيل شبكة شارات التجار المحليين الموثقين (المرحلة 15).'),
    ('OLX / Khamsat', 'أولكس / خمسات', 'Classifieds & Services', 'الإعلانات المبوبة والخدمات', 5, 'Findora is much stronger due to payment protection and trust layer. We just need to expand the scout coverage.', 'فايندورا أقوى بكثير بفضل حماية الدفع وجدار الثقة. نحتاج فقط لتوسيع تغطية المناديب في المحافظات.'),
    ('Traditional Broker', 'وسيط تقليدي', 'Manual Brokerage', 'الوساطة التقليدية اليدوية', 5, 'Completely automated. We just need to make the mobile app interface simpler for older merchants.', 'مؤتمت بالكامل. نحتاج فقط لجعل واجهة تطبيق الموبايل أبسط للتجار كبار السن.'),
    ('MaxAB / Capiter / Suppy', 'ماكس آب / كابيتير / سبي', 'B2B Sourcing & Logistics', 'توزيع الجملة وسلاسل الإمداد B2B', 3, 'They have warehousing and fleet logistics. We can beat them by remaining asset-light and expanding our physical scout sourcing network.', 'لديهم مخازن وأسطول شحن. يمكننا التفوق عليهم بالبقاء بدون أصول ثقيلة (Asset-light) وتوسيع شبكة المناديب الميدانية لتسجيل صغار الموردين.'),
    ('Facebook Groups / Social Commerce', 'مجموعات فيسبوك / التجارة الاجتماعية', 'Unorganized Social Sales', 'البيع العشوائي على السوشيال ميديا', 4, 'We need to deploy automated fraud audits (Phase 6) and absolute escrow-like payment locks to ensure 100% safety over social sales.', 'نحتاج لتفعيل الفحص التلقائي للاحتيال (المرحلة 6) وقفل المدفوعات لضمان أمان كامل يتفوق على فوضى السوشيال ميديا.')
ON CONFLICT (name_en) DO NOTHING;

-- Seed Feature Comparisons
INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Price Negotiation', 'التفاوض على السعر', '❌ Static lists only', '❌ قوائم ثابتة فقط', 13, 'Live price bidding / Reverse Auction with AI negotiating agents.', 'مناقصات حية وعروض أسعار عكسية مع وكلاء تفاوض بالذكاء الاصطناعي.'
FROM public.competitors WHERE name_en = 'Compareit4me'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'AI Agent Integration', 'دمج الذكاء الاصطناعي', '❌ None', '❌ غير موجود', 13, 'AI pricing recommendations and automated intake classifiers.', 'توصيات تسعير بالذكاء الاصطناعي ومصنفات تلقائية للطلبات الواردة.'
FROM public.competitors WHERE name_en = 'Compareit4me'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Custom Request Bids', 'طلبات مخصصة بالوصف', '❌ Catalog search only', '❌ بحث كتالوج جاهز فقط', 1, 'Customer describes what they need in plain text; scouts find it.', 'العميل يصف ما يحتاجه باللغة الدارجة، والمناديب يجدونه ميدانياً.'
FROM public.competitors WHERE name_en = 'Amazon / Noon'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Buyer Advocacy', 'تمثيل ودعم المشتري', '❌ Represents merchants/sellers to maximize commission', '❌ يمثل التاجر لزيادة العمولة', 2, 'We represent the buyer and act as their procurement advocate.', 'نحن نمثل المشتري وندافع عن حقوقه ومصالحه السعرية ضد احتكار الموردين.'
FROM public.competitors WHERE name_en = 'Amazon / Noon'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Trust & Review Badging', 'نظام الثقة والتقييم', '⚠️ Low trust (unverified reviews)', '⚠️ تقييمات عشوائية غير موثقة', 5, 'Verified merchant badge and blockchain-like trust history.', 'شارات تجار موثقة وسجل تاريخي موثوق لكل معاملة.'
FROM public.competitors WHERE name_en = 'OLX / Khamsat'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Escrow Payment Protection', 'حماية الدفع والوساطة المالي', '❌ None / Direct cash danger', '❌ غير متوفر / خطر الكاش المباشر', 7, 'Locked payments until the buyer receives and verifies the product.', 'مدفوعات مؤمنة ومغلقة حتى يستلم المشتري المنتج ويتأكد منه.'
FROM public.competitors WHERE name_en = 'OLX / Khamsat'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Digital Scalability', 'التوسع الرقمي السريع', '❌ Localized, manual calls', '❌ محلي، اتصالات تليفونية يدوية مجهدة', 3, 'Automated Scout Coordination and digital geographic grids.', 'تنسيق آلي للمناديب وشبكات جغرافية رقمية واسعة.'
FROM public.competitors WHERE name_en = 'Traditional Broker'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Local Merchant Access', 'الوصول للموردين المحليين الشعبين', '❌ Only registers wholesalers', '❌ تسجيل تجار الجملة الكبار فقط', 8, 'Physical scout network reaches small traditional alley shops.', 'شبكة مناديب ميدانية تصل لورش وأزقة الموردين التقليديين.'
FROM public.competitors WHERE name_en = 'MaxAB / Capiter / Suppy'
ON CONFLICT DO NOTHING;

INSERT INTO public.competitor_feature_comparisons (competitor_id, feature_name_en, feature_name_ar, status_in_competitor_en, status_in_competitor_ar, required_phase_number, advantage_desc_en, advantage_desc_ar)
SELECT id, 'Fraud Auditing', 'كشف ومنع الاحتيال', '❌ High risk of spam and scams', '❌ خطر احتيال ونصب مرتفع جداً', 6, 'Dynamic IP/Device fingerprint audits and automated system reviews.', 'فحص ديناميكي للبصمة الرقمية للأجهزة وحسابات المستخدمين بالاحتيال.'
FROM public.competitors WHERE name_en = 'Facebook Groups / Social Commerce'
ON CONFLICT DO NOTHING;
