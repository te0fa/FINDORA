-- Drop old function
DROP FUNCTION IF EXISTS public.fn_generate_referral_code();

-- Create updated function with iterative loop & max attempts
CREATE OR REPLACE FUNCTION public.fn_generate_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars        text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code         text;
  i            integer;
  attempt      integer := 0;
  max_attempts integer := 10;
  found_unique boolean := false;
BEGIN
  WHILE attempt < max_attempts AND NOT found_unique LOOP
    code := '';
    FOR i IN 1..10 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.contributors WHERE referral_code = code) THEN
      found_unique := true;
    ELSE
      attempt := attempt + 1;
    END IF;
  END LOOP;

  IF NOT found_unique THEN
    RAISE EXCEPTION 'Failed to generate a unique referral code after % attempts.', max_attempts;
  END IF;

  RETURN code;
END; $$;
