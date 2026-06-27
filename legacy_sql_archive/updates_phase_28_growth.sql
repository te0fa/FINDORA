-- Phase 28: Growth Engine & CRM Ads Management
CREATE TABLE IF NOT EXISTS public.growth_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL UNIQUE,
    name_ar text NOT NULL UNIQUE,
    status text DEFAULT 'idea', -- 'running', 'planned', 'idea'
    cac_en text NOT NULL,
    cac_ar text NOT NULL,
    reach_en text NOT NULL,
    reach_ar text NOT NULL,
    tip_en text NOT NULL,
    tip_ar text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_content_plan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_number integer NOT NULL,
    platform text NOT NULL, -- 'facebook', 'instagram', 'tiktok', 'whatsapp'
    hook_en text NOT NULL,
    hook_ar text NOT NULL,
    body_en text NOT NULL,
    body_ar text NOT NULL,
    image_prompt_en text,
    image_prompt_ar text,
    is_published boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_ads_performances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text UNIQUE NOT NULL, -- 'Facebook', 'Instagram', 'Google', 'TikTok', 'WhatsApp'
    reach integer DEFAULT 0,
    spend numeric(12,2) DEFAULT 0.00,
    leads integer DEFAULT 0,
    clicks integer DEFAULT 0,
    best_post_desc text,
    deals integer DEFAULT 0,
    status text DEFAULT 'not_started', -- 'active', 'paused', 'not_started'
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.growth_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_content_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ads_performances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'growth_channels' AND policyname = 'Admins manage growth channels') THEN
        CREATE POLICY "Admins manage growth channels" ON public.growth_channels FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'growth_content_plan' AND policyname = 'Admins manage content plans') THEN
        CREATE POLICY "Admins manage content plans" ON public.growth_content_plan FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_ads_performances' AND policyname = 'Admins manage crm ads') THEN
        CREATE POLICY "Admins manage crm ads" ON public.crm_ads_performances FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed Growth Channels
INSERT INTO public.growth_channels (name_en, name_ar, status, cac_en, cac_ar, reach_en, reach_ar, tip_en, tip_ar)
VALUES
    ('Facebook Groups', 'Facebook Groups', 'running', 'Low', 'منخفض', 'High', 'عالي', 'Search for 100k+ member groups, share real client orders as social proof.', 'ابحث عن مجموعات 100k+ عضو، شارك طلبات حقيقية كـ social proof.'),
    ('WhatsApp Networks', 'WhatsApp Networks', 'running', 'Zero', 'صفر', 'Medium', 'متوسط', 'Build Findora Deals channel on WhatsApp - every deal goes to channel.', 'ابن قناة Findora Deals على واتساب - كل صفقة تذهب للقناة.'),
    ('TikTok', 'TikTok', 'planned', 'Low', 'منخفض', 'Very High', 'عالي جداً', 'Hook: "Looking for a laptop for 3 days..." - real story from successful deal.', 'Hook: "يدور على لابتوب من 3 أيام..." - قصة حقيقية من صفقة ناجحة.'),
    ('SEO / Google', 'SEO / Google', 'planned', 'Zero (Long-term)', 'صفر (طويل المدى)', 'Massive', 'ضخم', 'Target keywords: "Egypt mobile price 2026" - page per category.', 'استهدف keywords: "سعر [منتج] مصر 2025" - صفحة لكل فئة.'),
    ('Referrals', 'Referrals', 'idea', 'Very Low', 'منخفض جداً', 'Medium', 'متوسط', 'Every successful deal = customer gets discount code. Happy customer brings 3 friends.', 'كل صفقة ناجحة = العميل يحصل على كود خصم. العميل الراضي يجلب 3 عملاء.'),
    ('Instagram', 'Instagram', 'planned', 'Medium', 'متوسط', 'High', 'عالي', 'Before/After: Paid 8000 EGP, found for 6500 EGP. Success stories are better than any ad.', 'Before/After: "دفعت 8000 – وجدنا بـ 6500". قصص النجاح أقوى من أي إعلان - شارك بموافقة العميل.')
ON CONFLICT (name_en) DO NOTHING;

-- Seed default CRM Ads Platforms
INSERT INTO public.crm_ads_performances (platform, reach, spend, leads, clicks, best_post_desc, deals, status)
VALUES
    ('Facebook', 12000, 3200.00, 450, 1200, 'Before/After Laptop Deal video story', 32, 'active'),
    ('Instagram', 8000, 2100.00, 210, 890, 'Custom AC request post', 15, 'active'),
    ('Google Ads', 5000, 1500.00, 120, 450, 'Search keyword ad for Cheap iPhone', 8, 'active'),
    ('TikTok', 0, 0.00, 0, 0, 'No active post yet', 0, 'not_started'),
    ('WhatsApp', 0, 0.00, 0, 0, 'No ad run yet', 0, 'not_started')
ON CONFLICT (platform) DO NOTHING;

-- Seed default Content Plan (Day 1 - 3)
INSERT INTO public.growth_content_plan (day_number, platform, hook_en, hook_ar, body_en, body_ar, image_prompt_en, image_prompt_ar)
VALUES
    (1, 'facebook', 'Finding a cheap laptop is hard...', 'البحث عن لابتوب رخيص صعب...', 'How Findora scouts saved a student 2000 EGP in Cairo local markets today.', 'كيف وفر مناديب فايندورا لطالب 2000 جنيه في أسواق القاهرة اليوم.', 'A happy student holding a laptop in Cairo street style', 'طالب سعيد يمسك لابتوب في شارع قاهري شعبي'),
    (2, 'instagram', 'Paid 8000, found for 6500!', 'دفعت 8000، وجدناها بـ 6500!', 'Check out this verified procurement success story.', 'شاهد قصة النجاح الحقيقية لتوفير المشتريات الموثقة.', 'Glowing shield badge next to phone showing EGP deals', 'درع أمان مضيء بجانب شاشة هاتف يعرض صفقات بالجنيه المصري'),
    (3, 'tiktok', '3 days looking for AC?', '3 أيام بتدور على تكييف؟', 'Watch how AI buyer agent auto-negotiates with 5 merchants in 10 minutes.', 'شاهد كيف يتفاوض وكيل الشراء الذكي مع 5 تجار في 10 دقائق.', 'High-tech AI agent scanning local Cairo home appliances store', 'وكيل ذكاء اصطناعي يمسح متجر أجهزة منزلية محلي بمصر')
ON CONFLICT DO NOTHING;
