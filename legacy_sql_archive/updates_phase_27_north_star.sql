-- Phase 27: North Star Metric & Conversion Funnel Goals
CREATE TABLE IF NOT EXISTS public.north_star_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text UNIQUE NOT NULL, -- e.g. 'override_requests', 'override_offers', 'override_accepted', 'override_completed'
    value numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.north_star_goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month_number integer UNIQUE NOT NULL, -- Month 1, 2, 3, 6, 12
    title_en text NOT NULL,
    title_ar text NOT NULL,
    target_deals integer NOT NULL,
    status text DEFAULT 'pending', -- 'pending', 'achieved'
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.north_star_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.north_star_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'north_star_config' AND policyname = 'Admins manage north star config') THEN
        CREATE POLICY "Admins manage north star config" ON public.north_star_config FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'north_star_goals' AND policyname = 'Admins manage north star goals') THEN
        CREATE POLICY "Admins manage north star goals" ON public.north_star_goals FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed default Monthly Goals
INSERT INTO public.north_star_goals (month_number, title_en, title_ar, target_deals, status)
VALUES
    (1, 'Proof of Concept (Validation)', 'إثبات الفكرة', 5, 'pending'),
    (2, 'Initial Growth', 'نمو أولي', 10, 'pending'),
    (3, 'Flywheel Kickstart', 'Flywheel يبدأ', 20, 'pending'),
    (6, 'Phase 1 Completed', 'Phase 1 مكتمل', 50, 'pending'),
    (12, 'Phase 3 Active', 'Phase 3 نشط', 200, 'pending')
ON CONFLICT (month_number) DO UPDATE
SET title_en = EXCLUDED.title_en,
    title_ar = EXCLUDED.title_ar,
    target_deals = EXCLUDED.target_deals;
