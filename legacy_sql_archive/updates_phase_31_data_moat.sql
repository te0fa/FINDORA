-- ============================================================
-- PHASE 31: FINDORA Data Moat Weekly Tracking
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_moat_weekly_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_date date UNIQUE DEFAULT current_date,
    collected_prices integer NOT NULL DEFAULT 0,
    unique_products integer NOT NULL DEFAULT 0,
    verified_merchants integer NOT NULL DEFAULT 0,
    real_reviews integer NOT NULL DEFAULT 0,
    completed_deals integer NOT NULL DEFAULT 0,
    negotiation_data integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_moat_weekly_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'data_moat_weekly_metrics' 
        AND policyname = 'Staff manage data moat weekly metrics'
    ) THEN
        CREATE POLICY "Staff manage data moat weekly metrics" ON public.data_moat_weekly_metrics FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed initial record for the current week
INSERT INTO public.data_moat_weekly_metrics (recorded_date, collected_prices, unique_products, verified_merchants, real_reviews, completed_deals, negotiation_data)
VALUES (current_date, 0, 0, 0, 0, 0, 0)
ON CONFLICT (recorded_date) DO NOTHING;
