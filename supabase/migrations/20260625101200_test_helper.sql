CREATE OR REPLACE FUNCTION public.test_referral_collision_limit()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars        text := 'A';
  code         text;
  i            integer;
  attempt      integer := 0;
  max_attempts integer := 3;
  found_unique boolean := false;
BEGIN
  WHILE attempt < max_attempts AND NOT found_unique LOOP
    code := '';
    FOR i IN 1..10 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Mock collision: assume 'AAAAAAAAAA' always exists
    IF code = 'AAAAAAAAAA' THEN
      attempt := attempt + 1;
    ELSE
      found_unique := true;
    END IF;
  END LOOP;

  IF NOT found_unique THEN
    RAISE EXCEPTION 'Failed to generate a unique referral code after % attempts.', max_attempts;
  END IF;

  RETURN code;
END; $$;
