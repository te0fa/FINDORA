-- Update fn_register_vendor to support linking auth_user_id during registration

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
  p_notes text,
  p_auth_user_id uuid DEFAULT NULL
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
    system_status,
    auth_user_id
  ) VALUES (
    p_business_name_ar,
    p_primary_phone,
    p_governorate,
    p_area,
    p_notes,
    'Active', -- Auto-approve since they verified via OTP
    p_auth_user_id
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
