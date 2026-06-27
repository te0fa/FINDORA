-- Phase 26: Expanded Founder Accountability & Weekly Review Tabs
ALTER TABLE public.founder_weekly_logs
ADD COLUMN IF NOT EXISTS top_achievements text, -- ما هي أهم 3 أشياء حققتها؟
ADD COLUMN IF NOT EXISTS not_done text, -- ما الذي لم تفعله؟
ADD COLUMN IF NOT EXISTS distracted_from_phase text, -- هل تشتت عن المرحلة النشطة؟
ADD COLUMN IF NOT EXISTS next_week_focus text, -- ما أهم شيء الأسبوع القادم؟
ADD COLUMN IF NOT EXISTS progress_rating integer DEFAULT 5 CHECK (progress_rating >= 1 AND progress_rating <= 10); -- من 1 إلى 10 تقدمك؟

CREATE TABLE IF NOT EXISTS public.founder_accountability_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL, -- 'categories', 'learnings', 'data_moat', 'lifecycle', 'growth', 'north_star', 'prompts', 'risks', 'ideas'
    title_en text NOT NULL UNIQUE, -- Added UNIQUE constraint to allow ON CONFLICT DO NOTHING
    title_ar text NOT NULL,
    details_en text,
    details_ar text,
    meta_tag text, -- Optional tags like 'critical', 'low', 'high', 'solved'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.founder_accountability_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'founder_accountability_items' AND policyname = 'Admins manage founder items') THEN
        CREATE POLICY "Admins manage founder items" ON public.founder_accountability_items FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed some startup-specific initial values for the founder
INSERT INTO public.founder_accountability_items (category, title_en, title_ar, details_en, details_ar, meta_tag)
VALUES
    ('north_star', 'Buyer Advocacy Win Rate', 'معدل نجاح تمثيل المشتري', 'Maximize confirmed requests where the customer bought at a price cheaper than average retail.', 'زيادة الطلبات المؤكدة التي تم شراؤها بسعر أرخص من متوسط التجزئة العام.', 'primary'),
    ('risks', 'Feature Distraction', 'التشتت بكثرة الخصائص والـ BNPL', 'Risk of building Financing/BNPL before scaling simple local matching. Stay focused.', 'مخاطر بناء أنظمة التمويل قبل توسيع مطابقة الطلبات المحلية البسيطة. حافظ على التركيز.', 'high'),
    ('ideas', 'Warranty Scan Widget', 'أداة مسح الضمان', 'Allow users to scan physical product warranties to store inside Findora Warranty Hub.', 'السماح للمستخدمين بمسح أوراق الضمان لتخزينها تلقائياً داخل لوحة الضمان في فايندورا.', 'pending'),
    ('learnings', 'Local merchants prefer Whatsapp', 'التجار يفضلون واتساب', 'Offline alley merchants respond faster to WhatsApp templates than dashboard workspaces.', 'تجار الحواري والأسواق التقليدية يستجيبون أسرع لقوالب واتساب بالمقارنة مع لوحة التحكم.', 'verified')
ON CONFLICT (title_en) DO NOTHING;
