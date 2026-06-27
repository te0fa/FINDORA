-- Phase 19: Action Steps (الخطوات التنفيذية) & Game Progress

CREATE TABLE IF NOT EXISTS public.staff_action_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    step_number integer UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    subtitle_en text,
    subtitle_ar text,
    metric_type text NOT NULL DEFAULT 'manual', -- 'manual', 'merchants_count', 'discovery_count', 'requests_count', 'deals_count', 'merchant_discovery_count'
    target_count integer DEFAULT 0,
    xp_reward integer DEFAULT 100,
    is_completed_manual boolean DEFAULT false, -- If manual checked
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_action_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_action_steps' AND policyname = 'Staff manage action steps') THEN
        CREATE POLICY "Staff manage action steps" ON public.staff_action_steps FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed the 9 steps
INSERT INTO public.staff_action_steps (step_number, title_en, title_ar, subtitle_en, subtitle_ar, metric_type, target_count, xp_reward)
VALUES
    (1, 'Register first 3 electronics merchants', 'سجّل أول 3 تجار إلكترونيات', 'Start with acquaintances - Beachhead first.', 'ابدأ بمعارف – Beachhead أولاً.', 'merchants_count', 3, 100),
    (2, 'Run first 5 Customer Discovery interviews', 'أجرِ أول 5 مقابلات Customer Discovery', 'Ask: What do they want? How do they search? What frustrates them?', 'اسأل: ماذا تريد؟ كيف تبحث؟ ما الذي يضايقك؟', 'discovery_count', 5, 100),
    (3, 'Send first mobile/laptop request', 'أرسل أول طلب موبايل/لابتوب', 'One real request - see how the merchant interacts.', 'طلب واحد حقيقي – شوف كيف يتفاعل التاجر.', 'requests_count', 1, 100),
    (4, 'Create WhatsApp Group for merchants', 'اعمل WhatsApp Group للتجار', 'Fastest way before any automation.', 'أسرع طريقة قبل أي أتمتة.', 'manual', 1, 100),
    (5, 'Receive first quote and send to customer', 'استقبل أول عرض وأوصله للعميل', 'The first loop - real proof.', 'الحلقة الأولى – الإثبات الحقيقي.', 'manual', 1, 100),
    (6, 'Close first electronics deal', 'أغلق أول صفقة إلكترونيات', 'Even if small - the cycle worked.', 'ولو صغيرة – الدورة اشتغلت.', 'deals_count', 1, 100),
    (7, 'Onboard 10 merchants to CRM', 'وصّل 10 تجار للـ CRM', 'Note each merchant''s specialization and response speed.', 'مع ملاحظة تخصص كل تاجر وسرعة رده.', 'merchants_count', 10, 100),
    (8, 'Conduct 10 Merchant Discovery studies', 'أجرِ 10 Merchant Discovery', 'Understand the merchant before asking them to participate.', 'افهم التاجر قبل ما تطلب منه يشارك.', 'merchant_discovery_count', 10, 100),
    (9, 'Achieve 5 deals and proceed to Phase 1', 'حقق 5 صفقات وانتقل لـ Phase 1', 'Evaluate: time, difficulties, learning, Flywheel speed.', 'قيّم: وقت، صعوبات، تعلم، Flywheel speed.', 'deals_count', 5, 100)
ON CONFLICT (step_number) DO UPDATE
SET title_en = EXCLUDED.title_en,
    title_ar = EXCLUDED.title_ar,
    subtitle_en = EXCLUDED.subtitle_en,
    subtitle_ar = EXCLUDED.subtitle_ar,
    metric_type = EXCLUDED.metric_type,
    target_count = EXCLUDED.target_count,
    xp_reward = EXCLUDED.xp_reward;
