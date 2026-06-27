-- ============================================================
-- PHASE 30: FINDORA Project Features Lifecycle
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL UNIQUE,
    name_ar text NOT NULL UNIQUE,
    phase_number integer NOT NULL DEFAULT 0,
    status text NOT NULL CHECK (status IN ('Idea', 'Discovery', 'Prototype', 'Beta', 'Live', 'Deprecated')) DEFAULT 'Idea',
    notes_en text,
    notes_ar text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'project_features' 
        AND policyname = 'Staff manage project features'
    ) THEN
        CREATE POLICY "Staff manage project features" ON public.project_features FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed initial features from mockup
INSERT INTO public.project_features (name_en, name_ar, phase_number, status, notes_en, notes_ar)
VALUES
    (
        'Core Ordering System', 
        'نظام الطلبات الأساسي', 
        0, 
        'Live', 
        'Core feature — operating in Production', 
        'Core feature — يعمل في Production'
    ),
    (
        'Admin Dashboard', 
        'Admin Dashboard', 
        0, 
        'Live', 
        'Working — needs enhancements', 
        'يعمل – يحتاج تحسينات'
    ),
    (
        'Smart Concierge (AI)', 
        'Smart Concierge (AI)', 
        1, 
        'Prototype', 
        'Initial model — needs validation with customers', 
        'نموذج أولي – يحتاج اختبار مع عملك'
    ),
    (
        'Reverse Auction', 
        'Reverse Auction', 
        3, 
        'Idea', 
        'Concept defined — development not started', 
        'الفكرة محددة – لم يبدأ التنفيذ'
    ),
    (
        'Findora Protection', 
        'Findora Protection', 
        4, 
        'Idea', 
        'Requires integration with Paymob', 
        'يحتاج integration مع Paymob'
    ),
    (
        'Trust Layer', 
        'Trust Layer', 
        5, 
        'Idea', 
        'Depends on Phase 4 integration', 
        'يعتمد على Phase 4'
    ),
    (
        'AI Buyer Agent', 
        'AI Buyer Agent', 
        9, 
        'Idea', 
        'Requires Claude API + data from previous phases', 
        'يحتاج Claude API + data من المراحل السابقة'
    ),
    (
        'Price Intelligence', 
        'Price Intelligence', 
        10, 
        'Idea', 
        'Requires 6+ months of historical price data first', 
        'يحتاج 6+ أشهر من بيانات الأسعار أولاً'
    )
ON CONFLICT (name_en) DO UPDATE 
SET 
    phase_number = EXCLUDED.phase_number,
    status = EXCLUDED.status,
    notes_en = EXCLUDED.notes_en,
    notes_ar = EXCLUDED.notes_ar;
