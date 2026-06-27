-- PHASE 10: Platform Economy Engine

-- 1. Create Pricing Rules Table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT UNIQUE NOT NULL, -- e.g., 'everyday_request', 'asset_verification', 'project'
    base_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    max_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    active_offer_percentage NUMERIC(5,2) DEFAULT 0.00, -- e.g., 20.00 for 20% off
    override_by_admin BOOLEAN DEFAULT false,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by_staff_id UUID REFERENCES public.staff_members(id)
);

-- Seed Initial Pricing Rules
INSERT INTO public.pricing_rules (service_type, base_price_egp, min_price_egp, max_price_egp)
VALUES 
  ('everyday_request', 100.00, 50.00, 500.00),
  ('asset_verification', 250.00, 150.00, 1000.00),
  ('project_scouting', 500.00, 300.00, 5000.00)
ON CONFLICT (service_type) DO NOTHING;

-- 2. Modify Contributor Wallets for Credit & Risk Control
ALTER TABLE public.contributor_wallets
ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (credit_balance >= 0),
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

-- 3. Modify Transactions Ledger to support Credit
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP' CHECK (currency IN ('EGP', 'points', 'credit'));

-- 4. Seed Dynamic Revenue Split & Role Multipliers into Economy Config
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES (
    'revenue_split',
    '{
        "contributor_pool_pct": 0.70,
        "platform_pct": 0.20,
        "reserve_pct": 0.10
    }'::jsonb,
    'Revenue distribution percentages for incoming payments',
    'نسب توزيع الأرباح للمدفوعات الواردة',
    false
)
ON CONFLICT (config_key) DO UPDATE 
SET value = EXCLUDED.value;

-- Ensure role_multipliers exists in economy_config
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES (
    'role_multipliers',
    '{
        "field_scout": 1.2,
        "store_insider": 1.0,
        "casual": 0.8
    }'::jsonb,
    'Base earning multipliers by contributor role',
    'معاملات الأرباح الأساسية حسب دور المندوب',
    false
)
ON CONFLICT (config_key) DO NOTHING;
