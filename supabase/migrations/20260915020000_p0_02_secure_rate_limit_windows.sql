-- ============================================================
-- FINDORA SECURITY REMEDIATION — P0-02
-- Secure public.rate_limit_windows table
-- 1. Enable Row Level Security (RLS)
-- 2. Revoke table privileges from PUBLIC, anon, and authenticated
-- 3. Grant table privileges strictly to service_role
-- 4. Create restrictive policy for service_role
-- ============================================================

-- 1. Enable Row Level Security
ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all permissions from PUBLIC, anon, and authenticated
REVOKE ALL ON TABLE public.rate_limit_windows FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_windows FROM anon;
REVOKE ALL ON TABLE public.rate_limit_windows FROM authenticated;

-- 3. Grant full permissions strictly to service_role
GRANT ALL ON TABLE public.rate_limit_windows TO service_role;

-- 4. Create restrictive policy for service_role
DROP POLICY IF EXISTS "service_role_rate_limit_windows" ON public.rate_limit_windows;
CREATE POLICY "service_role_rate_limit_windows"
  ON public.rate_limit_windows
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
