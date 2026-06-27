-- Phase 20: Founder Accountability & Weekly Logs

CREATE TABLE IF NOT EXISTS public.founder_weekly_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff_members(id) ON DELETE CASCADE,
    week_start_date date NOT NULL,
    hours_built integer DEFAULT 0,
    customers_contacted integer DEFAULT 0,
    merchants_contacted integer DEFAULT 0,
    biggest_achievement text,
    blockers text,
    distraction_score integer DEFAULT 1 CHECK (distraction_score >= 1 AND distraction_score <= 10),
    progress_comparison text, -- 'yes_better', 'yes_much_better', 'no_same', 'no_worse'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.founder_weekly_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'founder_weekly_logs' AND policyname = 'Admins manage founder logs') THEN
        CREATE POLICY "Admins manage founder logs" ON public.founder_weekly_logs FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;
