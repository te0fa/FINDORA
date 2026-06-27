-- supabase/migrations/018_rate_limit_tracking.sql
-- Create rate limiting tracking table

CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL, -- Supports IPv4 and IPv6
    endpoint VARCHAR(255) NOT NULL,
    request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast counts and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_timestamp 
ON public.rate_limit_logs (ip_address, endpoint, request_timestamp);

-- PostgreSQL function to perform check and log in a single call
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_ip VARCHAR,
    p_endpoint VARCHAR,
    p_limit INT,
    p_window_seconds INT
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INT,
    reset_timestamp TIMESTAMPTZ
) AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_count INT;
    v_earliest TIMESTAMPTZ;
BEGIN
    -- 1. Clean up old logs (older than 24 hours) to prevent bloat
    DELETE FROM public.rate_limit_logs 
    WHERE request_timestamp < v_now - INTERVAL '24 hours';

    -- 2. Count requests in the window
    SELECT COUNT(*)::INT INTO v_count
    FROM public.rate_limit_logs
    WHERE ip_address = p_ip
      AND endpoint = p_endpoint
      AND request_timestamp >= v_window_start;

    -- 3. If count is within limit, insert the new request log
    IF v_count < p_limit THEN
        INSERT INTO public.rate_limit_logs (ip_address, endpoint, request_timestamp)
        VALUES (p_ip, p_endpoint, v_now);
        v_count := v_count + 1;
        allowed := TRUE;
    ELSE
        allowed := FALSE;
    END IF;

    -- 4. Determine reset timestamp
    SELECT MIN(request_timestamp) INTO v_earliest
    FROM public.rate_limit_logs
    WHERE ip_address = p_ip
      AND endpoint = p_endpoint
      AND request_timestamp >= v_window_start;

    IF v_earliest IS NOT NULL THEN
        reset_timestamp := v_earliest + (p_window_seconds || ' seconds')::INTERVAL;
    ELSE
        reset_timestamp := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    END IF;

    current_count := v_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
