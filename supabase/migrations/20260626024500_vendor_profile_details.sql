-- Migration: Vendor Profile Details and Atomic Registration RPC
-- Insert date: 2026-06-26 02:45:00

-- 1. Create vendor_profile_details Table
CREATE TABLE IF NOT EXISTS public.vendor_profile_details (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE UNIQUE,
  business_name_ar text        NOT NULL,
  business_name_en text,
  merchant_type    text        NOT NULL, -- e.g. "wholesaler", "retailer"
  category         text        NOT NULL, -- e.g. "Electronics", "Furniture"
  city             text,
  address          text,
  secondary_phone  text,
  email            text,
  website          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.vendor_profile_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of vendor_profile_details" ON public.vendor_profile_details;
CREATE POLICY "Allow public read of vendor_profile_details"
  ON public.vendor_profile_details FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff write of vendor_profile_details" ON public.vendor_profile_details;
CREATE POLICY "Allow staff write of vendor_profile_details"
  ON public.vendor_profile_details FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff_members s WHERE s.auth_user_id = auth.uid())
  );

-- 2. Create Atomic Vendor Registration RPC Function
CREATE OR REPLACE FUNCTION public.fn_register_vendor(
  p_business_name_ar text,
  p_business_name_en text,
  p_merchant_type text,
  p_category text,
  p_governorate text,
  p_city text,
  p_area text,
  p_address text,
  p_primary_phone text,
  p_secondary_phone text,
  p_email text,
  p_website text,
  p_notes text
) RETURNS uuid AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- A. Insert into vendors
  INSERT INTO public.vendors (
    display_name,
    whatsapp_number,
    governorate,
    area,
    notes,
    system_status
  ) VALUES (
    p_business_name_ar,
    p_primary_phone,
    p_governorate,
    p_area,
    p_notes,
    'Pending Verification'
  ) RETURNING id INTO v_vendor_id;

  -- B. Insert into vendor_profile_details
  INSERT INTO public.vendor_profile_details (
    vendor_id,
    business_name_ar,
    business_name_en,
    merchant_type,
    category,
    city,
    address,
    secondary_phone,
    email,
    website
  ) VALUES (
    v_vendor_id,
    p_business_name_ar,
    p_business_name_en,
    p_merchant_type,
    p_category,
    p_city,
    p_address,
    p_secondary_phone,
    p_email,
    p_website
  );

  RETURN v_vendor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
