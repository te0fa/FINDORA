-- Phase 21: HR System & Staff Performance Reviews

CREATE TABLE IF NOT EXISTS public.staff_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL UNIQUE,
    name_ar text NOT NULL UNIQUE,
    manager_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    strengths_en text,
    strengths_ar text,
    weaknesses_en text,
    weaknesses_ar text,
    challenges_en text,
    challenges_ar text,
    alert_message_en text,
    alert_message_ar text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_hr_details (
    staff_id uuid PRIMARY KEY REFERENCES public.staff_members(id) ON DELETE CASCADE,
    phone text,
    email text,
    base_salary numeric(12,2) DEFAULT 0.00,
    commission_pct numeric(5,2) DEFAULT 0.00,
    primary_role text,
    secondary_roles text[],
    performance_rating numeric(3,2) DEFAULT 5.00 CHECK (performance_rating >= 0.00 AND performance_rating <= 5.00),
    review_notes text,
    department_id uuid REFERENCES public.staff_departments(id) ON DELETE SET NULL,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_performance_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    review_period text NOT NULL, -- e.g. 'June 2026', 'Q2 2026'
    is_manager_review boolean DEFAULT false,
    score_leadership numeric(3,2) DEFAULT 5.00 CHECK (score_leadership >= 0.00 AND score_leadership <= 5.00),
    score_execution numeric(3,2) DEFAULT 5.00 CHECK (score_execution >= 0.00 AND score_execution <= 5.00),
    score_communication numeric(3,2) DEFAULT 5.00 CHECK (score_communication >= 0.00 AND score_communication <= 5.00),
    score_quality numeric(3,2) DEFAULT 5.00 CHECK (score_quality >= 0.00 AND score_quality <= 5.00),
    achievements text,
    weaknesses text,
    improvement_plan text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_hr_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Departments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_departments' AND policyname = 'Admins manage departments') THEN
        CREATE POLICY "Admins manage departments" ON public.staff_departments FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- HR Details policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_hr_details' AND policyname = 'Admins manage hr details') THEN
        CREATE POLICY "Admins manage hr details" ON public.staff_hr_details FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Performance Reviews policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_performance_reviews' AND policyname = 'Admins manage reviews') THEN
        CREATE POLICY "Admins manage reviews" ON public.staff_performance_reviews FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed departments
INSERT INTO public.staff_departments (name_en, name_ar, strengths_en, strengths_ar, weaknesses_en, weaknesses_ar, challenges_en, challenges_ar, alert_message_en, alert_message_ar)
VALUES
    ('Operations & Intake', 'العمليات وخدمة العملاء', 'High request handling speed, excellent user feedback.', 'سرعة عالية في معالجة الطلبات، تقييمات عملاء ممتازة.', 'Some manual coordination latency.', 'بعض التأخر في التنسيق اليدوي.', 'High concurrent request spikes.', 'ارتفاع مفاجئ في حجم الطلبات المتزامنة.', 'Ensure auto-assignment settings are tuned.', 'تأكد من ضبط إعدادات التوزيع التلقائي.'),
    ('Sourcing & Merchant Discovery', 'المشتريات وتطوير الموردين', 'Strong vendor onboarding rate, robust catalog.', 'معدل تسجيل موردين مرتفع، كتالوج قوي ومتنوع.', 'Slow quote response times in specialized categories.', 'بطء تجاوب الموردين في الفئات المتخصصة.', 'Convincing traditional sellers to submit bids.', 'إقناع التجار التقليديين بتقديم عروض سعرية.', 'Actively review merchant win-rates weekly.', 'راجع معدلات ربح التجار أسبوعياً.'),
    ('Intelligence & AI Control', 'الذكاء والتحليلات', 'Excellent fraud detection accuracy, advanced automated scoring.', 'دقة ممتازة في كشف الاحتيال، تقييم تلقائي متطور.', 'Heavy reliance on OpenAI models limits regional slang parsing.', 'الاعتماد على النماذج يقلل فهم اللهجات الإقليمية.', 'Scaling prompt contexts efficiently.', 'تحسين كفاءة استخدام سياق الأوامر (Prompts).', 'Monitor model latency closely.', 'راقب سرعة استجابة نماذج الذكاء الاصطناعي بدقة.')
ON CONFLICT (name_en) DO NOTHING;
