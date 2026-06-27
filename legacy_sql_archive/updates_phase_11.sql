-- PHASE 11: FINDORA Game Loop Engine

-- 1. Rename Contributor Levels to match Game Loop
UPDATE public.contributor_levels SET name_en = 'Rookie', name_ar = 'مبتدئ' WHERE level_number = 1;
UPDATE public.contributor_levels SET name_en = 'Active', name_ar = 'نشط' WHERE level_number = 2;
UPDATE public.contributor_levels SET name_en = 'Pro', name_ar = 'محترف' WHERE level_number = 3;
UPDATE public.contributor_levels SET name_en = 'Elite', name_ar = 'نخبة' WHERE level_number = 4;
-- Level 5 remains 'Legend' (أسطورة)

-- 2. Bonus Campaigns Engine
CREATE TABLE IF NOT EXISTS public.bonus_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    multiplier_boost NUMERIC(3,2) NOT NULL DEFAULT 0.00, -- Additive boost (e.g., +0.20)
    target_role TEXT, -- NULL means all roles, or 'field_scout', 'store_insider', etc.
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by_staff_id UUID REFERENCES public.staff_members(id)
);

-- Ensure indexes for quick campaign lookups
CREATE INDEX IF NOT EXISTS idx_bonus_campaigns_dates ON public.bonus_campaigns(start_date, end_date) WHERE is_active = true;
