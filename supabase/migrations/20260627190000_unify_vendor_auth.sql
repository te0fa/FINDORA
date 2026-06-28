-- FINDORA — Unifying Vendor Authentication and Archiving Legacy Merchant Tables

-- 1. Archive legacy tables by renaming
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'merchant_offers') THEN
        ALTER TABLE public.merchant_offers RENAME TO merchant_offers_legacy_archive;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'merchant_profiles') THEN
        ALTER TABLE public.merchant_profiles RENAME TO merchant_profiles_legacy_archive;
    END IF;
END $$;

-- 2. Alter vendors table to support unified auth
ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant_access_level text NOT NULL DEFAULT 'basic' CHECK (merchant_access_level IN ('basic', 'advanced')),
  ADD COLUMN IF NOT EXISTS is_phone_verified boolean NOT NULL DEFAULT false;

-- Create index on auth_user_id for performance
CREATE INDEX IF NOT EXISTS idx_vendors_auth_user ON public.vendors(auth_user_id);

-- 3. Enable RLS on vendors if not enabled and update policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_vendors" ON public.vendors;
CREATE POLICY "service_role_vendors" ON public.vendors FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "vendors_self_read_update" ON public.vendors;
CREATE POLICY "vendors_self_read_update" ON public.vendors
  FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "public_read_active_vendors" ON public.vendors;
CREATE POLICY "public_read_active_vendors" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (system_status = 'Active');
