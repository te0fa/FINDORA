-- Migration: Update Phone Verified Trigger to Bidirectional
-- Insert date: 2026-06-26 02:20:00

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
