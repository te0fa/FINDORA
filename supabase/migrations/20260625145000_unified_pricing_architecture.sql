-- Migration: Unified Pricing & Fees Architecture
-- Insert date: 2026-06-25 14:50:00

-- 1. Create customer fee phases table
CREATE TABLE IF NOT EXISTS public.customer_fee_phases (
  id                                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_name                            text        UNIQUE NOT NULL,
  phase_order                           integer     UNIQUE NOT NULL,
  is_current_phase                      boolean     NOT NULL DEFAULT false,
  fee_amount_egp                        numeric     NOT NULL DEFAULT 0,
  first_request_free_with_verified_phone boolean     NOT NULL DEFAULT false,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  updated_at                            timestamptz NOT NULL DEFAULT now()
);

-- Seed customer fee phases
INSERT INTO public.customer_fee_phases (phase_name, phase_order, is_current_phase, fee_amount_egp, first_request_free_with_verified_phone)
VALUES
  ('free_launch', 1, true, 0, false),
  ('growth', 2, false, 99, true),
  ('standard', 3, false, 299, false)
ON CONFLICT (phase_name) DO UPDATE
SET
  fee_amount_egp = EXCLUDED.fee_amount_egp,
  first_request_free_with_verified_phone = EXCLUDED.first_request_free_with_verified_phone;

-- 2. Create vendor fee phases table
-- NOTE: In the future, we may implement rating-based vendor packages.
-- This table is designed to support the general transition from free launch, discounted, to standard commissions.
CREATE TABLE IF NOT EXISTS public.vendor_fee_phases (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_name             text        UNIQUE NOT NULL,
  phase_order            integer     UNIQUE NOT NULL,
  is_current_phase       boolean     NOT NULL DEFAULT false,
  commission_rate        numeric,    -- e.g. 0.05 for 5% commission
  min_fee_egp            numeric,    -- e.g. 50 EGP minimum charge
  subscription_monthly_egp numeric,  -- e.g. 0 or null
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_fee_phases IS 'Vendor transaction fee phases. Future expansion may introduce tier/rating-based custom commission package tables linked to vendor ratings.';

-- Seed vendor fee phases with NULL placeholders for discounted/standard as per instructions
INSERT INTO public.vendor_fee_phases (phase_name, phase_order, is_current_phase, commission_rate, min_fee_egp, subscription_monthly_egp)
VALUES
  ('free_launch', 1, true, 0.00, 0, 0),
  ('discounted', 2, false, NULL, NULL, NULL),
  ('standard', 3, false, NULL, NULL, NULL)
ON CONFLICT (phase_name) DO UPDATE
SET
  commission_rate = EXCLUDED.commission_rate,
  min_fee_egp = EXCLUDED.min_fee_egp,
  subscription_monthly_egp = EXCLUDED.subscription_monthly_egp;

-- 3. Alter customers table to support the atomic first free request promotion
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS has_used_free_first_request BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- Sync existing phone verification statuses
UPDATE public.customers SET phone_verified = true WHERE phone_verified_at IS NOT NULL;

-- 4. Create trigger to automatically keep phone_verified and phone_verified_at in sync (bidirectional)
CREATE OR REPLACE FUNCTION public.fn_sync_customer_phone_verified()
RETURNS trigger AS $$
BEGIN
  -- 1. If phone_verified is explicitly set to true and phone_verified_at is NULL, set it to now()
  IF NEW.phone_verified = true AND NEW.phone_verified_at IS NULL THEN
    NEW.phone_verified_at := now();
  -- 2. If phone_verified is explicitly set to false/NULL and phone_verified_at is not NULL, clear it
  ELSIF (NEW.phone_verified IS NOT TRUE) AND NEW.phone_verified_at IS NOT NULL THEN
    NEW.phone_verified_at := NULL;
  -- 3. If phone_verified_at is set to non-NULL and phone_verified is not true, set it to true
  ELSIF NEW.phone_verified_at IS NOT NULL AND (NEW.phone_verified IS NOT TRUE) THEN
    NEW.phone_verified := true;
  -- 4. If phone_verified_at is set to NULL and phone_verified is true, set it to false
  ELSIF NEW.phone_verified_at IS NULL AND NEW.phone_verified = true THEN
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_phone_verified ON public.customers;
CREATE TRIGGER trg_sync_customer_phone_verified
  BEFORE INSERT OR UPDATE OF phone_verified_at, phone_verified ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_customer_phone_verified();

-- 5. Row Level Security (RLS) policies
ALTER TABLE public.customer_fee_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_fee_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of customer_fee_phases" ON public.customer_fee_phases;
CREATE POLICY "Allow public read of customer_fee_phases" ON public.customer_fee_phases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read of vendor_fee_phases" ON public.vendor_fee_phases;
CREATE POLICY "Allow public read of vendor_fee_phases" ON public.vendor_fee_phases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff write of customer_fee_phases" ON public.customer_fee_phases;
CREATE POLICY "Allow staff write of customer_fee_phases" ON public.customer_fee_phases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff_members s WHERE s.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Allow staff write of vendor_fee_phases" ON public.vendor_fee_phases;
CREATE POLICY "Allow staff write of vendor_fee_phases" ON public.vendor_fee_phases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff_members s WHERE s.auth_user_id = auth.uid())
);
