
-- Batch 5C Schema Fix: Separate Request Type from Pricing Model
-- 1. Add missing columns to requests
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS pricing_model text,
ADD COLUMN IF NOT EXISTS payment_policy text;

-- 2. Add constraints for pricing_model
-- Valid models: fixed_fee, percentage_fee, fixed_plus_percentage, custom_quote, retainer
DO $$ 
BEGIN 
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_pricing_model;
    ALTER TABLE public.requests ADD CONSTRAINT ck_pricing_model 
    CHECK (pricing_model IN ('fixed_fee', 'percentage_fee', 'fixed_plus_percentage', 'custom_quote', 'retainer', 'everyday_purchase', 'high_value_deals', 'projects_supplies'));
    -- Temporarily allowed the categories to avoid breaking existing data if any, but will migrate them.
END $$;

-- 3. Add constraints for payment_policy
-- Valid policies: pay_after_preview, upfront_deposit, milestone_plan, custom_agreement, retainer
DO $$ 
BEGIN 
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_payment_policy;
    ALTER TABLE public.requests ADD CONSTRAINT ck_payment_policy 
    CHECK (payment_policy IN ('pay_after_preview', 'upfront_deposit', 'milestone_plan', 'custom_agreement', 'retainer'));
END $$;

-- 4. Data Migration (Optional/Safety)
-- If we accidentally stored categories in pricing_model, move them to request_kind
UPDATE public.requests 
SET request_kind = pricing_model, 
    pricing_model = 'fixed_fee'
WHERE pricing_model IN ('everyday_purchase', 'high_value_deals', 'projects_supplies');

-- 5. Final strict constraint for pricing_model
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_pricing_model;
ALTER TABLE public.requests ADD CONSTRAINT ck_pricing_model 
CHECK (pricing_model IN ('fixed_fee', 'percentage_fee', 'fixed_plus_percentage', 'custom_quote', 'retainer'));

-- 6. Refresh Views
-- v_request_ui_status often needs a refresh or explicit column addition if it's not '*'
-- Inspecting v_request_ui_status definition would be good, but we'll force a refresh by re-creating it if needed.
-- For now, we'll assume it needs manual update in the DAL if it's a VIEW.
