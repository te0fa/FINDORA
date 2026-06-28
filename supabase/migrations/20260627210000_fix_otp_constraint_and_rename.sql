-- Fix OTP purpose constraint and rename legacy tables unconditionally

ALTER TABLE public.phone_otp_codes DROP CONSTRAINT IF EXISTS phone_otp_codes_purpose_check;
ALTER TABLE public.phone_otp_codes ADD CONSTRAINT phone_otp_codes_purpose_check CHECK (purpose IN ('contributor_registration', 'merchant_registration', 'withdrawal_verification', 'vendor_auth'));

-- Rename legacy tables unconditionally if they exist
ALTER TABLE IF EXISTS public.merchant_offers RENAME TO merchant_offers_legacy_archive;
ALTER TABLE IF EXISTS public.merchant_profiles RENAME TO merchant_profiles_legacy_archive;
