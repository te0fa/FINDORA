-- Phase 25: Vision, Long-Term Milestones & Expansion Plans
CREATE TABLE IF NOT EXISTS public.vision_pillars (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en text NOT NULL UNIQUE,
    title_ar text NOT NULL UNIQUE,
    subtitle_en text NOT NULL,
    subtitle_ar text NOT NULL,
    icon text DEFAULT '🎯',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_timeline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_year text NOT NULL UNIQUE, -- e.g. "2025", "2035"
    title_en text NOT NULL,
    title_ar text NOT NULL,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_future_ideas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en text NOT NULL UNIQUE,
    title_ar text NOT NULL UNIQUE,
    description_en text NOT NULL,
    description_ar text NOT NULL,
    target_phase text NOT NULL, -- e.g. "+Phase 14"
    icon text DEFAULT '💡',
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_future_ideas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vision_pillars' AND policyname = 'Staff manage pillars') THEN
        CREATE POLICY "Staff manage pillars" ON public.vision_pillars FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vision_timeline' AND policyname = 'Staff manage timeline') THEN
        CREATE POLICY "Staff manage timeline" ON public.vision_timeline FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vision_future_ideas' AND policyname = 'Staff manage vision ideas') THEN
        CREATE POLICY "Staff manage vision ideas" ON public.vision_future_ideas FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed Vision Pillars
INSERT INTO public.vision_pillars (title_en, title_ar, subtitle_en, subtitle_ar, icon)
VALUES
    ('AI Buyer Agent', 'AI Buyer Agent', 'Personal buying agent representing the customer.', 'وكيل شراء شخصي يمثل العميل بالكامل.', '🤖'),
    ('Findora Score', 'Findora Score', 'Comprehensive objective merchant quality benchmark.', 'معيار موضوعي شامل لتقييم جودة وجدارة الموردين.', '🏆'),
    ('Global Network', 'Global Network', 'The largest verified capillary supplier network.', 'أكبر شبكة موردين محليين ميدانيين وموثقين.', '🌍')
ON CONFLICT (title_en) DO NOTHING;

-- Seed Timeline
INSERT INTO public.vision_timeline (milestone_year, title_en, title_ar, description_en, description_ar)
VALUES
    ('2025', 'Phase 0-1: Validation', 'المرحلة 0-1: التحقق والإثبات', 'Electronics first. 10 merchants, 5 deals.', 'التركيز على الإلكترونيات أولاً. 10 تجار و 5 صفقات مبدئية ناجحة.'),
    ('2026', 'Phase 2-5: Network & Trust', 'المرحلة 2-5: الشبكة وبناء الثقة', '100 merchants. Reverse bidding auctions. Locked payments protection. Verified badges.', 'الوصول لـ 100 تاجر. تفعيل المزادات العكسية. حماية المدفوعات والشارات الموثقة.'),
    ('2027', 'Phase 6-9: Intelligence', 'المرحلة 6-9: الذكاء والبيانات', 'Alerts. Price analytics database. AI Agent assistant. Merchant reputation scoring.', 'إطلاق نظام التنبيهات. قاعدة بيانات تحليل الأسعار. المساعد الذكي AI وتقييم السمعة.'),
    ('2028', 'Phase 10-12: Revenue Scale', 'المرحلة 10-12: توسيع الإيرادات', 'Paid Business Profile Pages. Advanced Price Intelligence. CRM systems.', 'تفعيل صفحات الموردين المدفوعة. استخبارات الأسعار المتقدمة وأنظمة الـ CRM.'),
    ('2030', 'Phase 13-15: Brand & B2B', 'المرحلة 13-15: الهوية وقطاع الشركات B2B', 'Global trust score branding. Premium deals database. Certified tags. Dedicated B2B Portal.', 'تحويل التقييم لعلامة تجارية معتمدة. عروض مميزة للمشتركين. بوابة شراء مخصصة للشركات.'),
    ('2035', 'Phase 16: Global AI', 'المرحلة 16: الذكاء الاصطناعي العالمي', 'Regional MENA expansion. physical scout automation. The ultimate buying agent advocate.', 'التوسع الإقليمي في الشرق الأوسط وأفريقيا. أتمتة المناديب ووكيل الشراء الذكي المتكامل.')
ON CONFLICT (milestone_year) DO NOTHING;

-- Seed Future Big Ideas
INSERT INTO public.vision_future_ideas (title_en, title_ar, description_en, description_ar, target_phase, icon)
VALUES
    ('Findora Verified Installer', 'Findora Verified Installer', 'After AC purchases: recommend verified installation technicians. Doubles transaction yield.', 'بعد شراء تكييف – Findora ترشح فني تركيب وصيانة موثق، يضاعف إيرادات الخدمة.', '+Phase 14 ⏰', '🔧'),
    ('Findora Warranty Hub', 'Findora Warranty Hub', 'Warranty logs + invoices + maintenance schedule kept inside the customer portal. Creates massive lock-in.', 'حفظ الضمان + الفواتير الموثقة + مواعيد الصيانة داخل حساب العميل. عامل جذب وولاء ضخم.', '+Phase 12 ⏰', '📋'),
    ('Findora Household AI', 'Findora Household AI', 'The platform remembers household appliances and auto-proposes replacements or upgrades dynamically.', 'المنصة تتذكر أجهزتك المنزلية وتقترح الاستبدال المناسب تلقائياً، وكيل شراء منزلي حقيقي.', '+Phase 16 ⏰', '🏠'),
    ('Findora Procurement OS', 'Findora Procurement OS', 'Allows corporations to manage their entire B2B procurement workflow through Findora.', 'تمكين الشركات من إدارة دورة مشترياتها بالكامل عبر فايندورا، أكبر من سوق الأفراد.', '+Phase 15 ⏰', '🏢'),
    ('Findora Financing / BNPL', 'Findora Financing / BNPL', 'B2B installment plans and instant platform financing. Requires specialized banking licenses.', 'تقسيط وتمويل مباشر للمشتريات عبر المنصة، يتطلب تراخيص مصرفية.', '+Phase 15 ⏰', '💳'),
    ('Findora Market Intelligence', 'Findora Market Intelligence', 'Sell aggregated local price trends and demand data reports to global corporations.', 'بيع تقارير اتجاهات الأسعار وحجم الطلب المحلي التفصيلية للشركات الكبرى.', '+Phase 10 ⏰', '📡')
ON CONFLICT (title_en) DO NOTHING;
