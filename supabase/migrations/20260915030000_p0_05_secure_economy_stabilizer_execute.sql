-- ============================================================
-- FINDORA SECURITY REMEDIATION — P0-05 BATCH 1
-- Secure public.fn_run_economy_stabilizer() RPC Execution
-- 1. Revoke EXECUTE privilege from PUBLIC, anon, and authenticated
-- 2. Grant EXECUTE privilege strictly to service_role
-- ============================================================

REVOKE ALL ON FUNCTION public.fn_run_economy_stabilizer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_run_economy_stabilizer() FROM anon;
REVOKE ALL ON FUNCTION public.fn_run_economy_stabilizer() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_run_economy_stabilizer() TO service_role;
