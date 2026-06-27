-- Phase 23: Kill List & Feature Blockers

CREATE TABLE IF NOT EXISTS public.kill_list_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en text NOT NULL UNIQUE, -- Added UNIQUE constraint to allow ON CONFLICT
    title_ar text NOT NULL,
    reason_en text NOT NULL,
    reason_ar text NOT NULL,
    target_phase text NOT NULL, -- e.g. '+Phase 15'
    is_activated boolean DEFAULT false, -- If bypassed and built anyway
    activation_reason_ar text,
    activation_reason_en text,
    execution_plan_ar text,
    execution_plan_en text,
    activated_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kill_list_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kill_list_items' AND policyname = 'Staff manage kill list') THEN
        CREATE POLICY "Staff manage kill list" ON public.kill_list_items FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed the initial 7 items from mockup
INSERT INTO public.kill_list_items (title_en, title_ar, reason_en, reason_ar, target_phase)
VALUES
    ('Financing / BNPL', 'Financing / BNPL', 'Requires banking licenses and massive financial risks.', 'يحتاج تراخيص بنكية ومخاطر مالية ضخمة.', '+Phase 15 ⏰'),
    ('Global Expansion', 'Global Expansion', 'Do not open a new market before reaching 100 deals/month in Egypt.', 'لا تفتح سوقاً جديداً قبل 100 صفقة/شهر في مصر.', 'Phase 16 ⏰'),
    ('AI Negotiator', 'AI Negotiator', 'Exciting technology but requires a very strong Trust Layer first.', 'تقنية مثيرة لكن تحتاج Trust Layer قوي أولاً.', '+Phase 13 ⏰'),
    ('Full Marketplace', 'Full Marketplace', 'Do not pivot to Amazon - demand is always our core focus.', 'لا تتحول لأمازون – الطلب هو المركز دائماً.', 'Phase 12 ⏰'),
    ('Crowd Sourcing Network', 'Crowd Sourcing Network', 'Requires a very large critical mass of active users.', 'يحتاج كتلة حرجة كبيرة جداً.', '+Phase 10 ⏰'),
    ('B2B Enterprise', 'B2B Enterprise', 'Requires Trust Layer + Verified badge system first.', 'تحتاج Trust Layer + Verified أولاً.', 'Phase 15 ⏰'),
    ('Findora Household AI', 'Findora Household AI', 'Massive idea - requires at least two years of purchase history.', 'فكرة ضخمة – تحتاج تاريخ مشتريات على الأقل سنتين.', '+Phase 16 ⏰')
ON CONFLICT (title_en) DO NOTHING;
