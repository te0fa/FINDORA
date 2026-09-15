-- ============================================================
-- FINDORA — P1-03 Batch 3: Atomic OTP Reservation & Creation
-- Eliminates TOCTOU concurrency race condition on OTP send
-- Enforces unified rolling 3/hour quota, 60-second cooldown,
-- purpose-specific invalidation, and OTP insertion in a single
-- transaction under an advisory transaction lock keyed by canonical phone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_reserve_and_create_otp(
    p_phone_number text,
    p_code_hash text,
    p_purpose text,
    p_expires_at timestamptz,
    p_max_hourly integer DEFAULT 3,
    p_cooldown_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_key bigint;
    v_one_hour_ago timestamptz := clock_timestamp() - interval '1 hour';
    v_recent_count integer;
    v_latest_created timestamptz;
    v_elapsed_seconds integer;
    v_retry_after integer;
    v_new_id uuid;
    v_max_hourly integer;
    v_cooldown_seconds integer;
BEGIN
    -- 1. Input Validation
    IF p_phone_number IS NULL OR trim(p_phone_number) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'phone_number is required'
        );
    END IF;

    IF p_code_hash IS NULL OR trim(p_code_hash) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'code_hash is required'
        );
    END IF;

    IF p_purpose IS NULL OR p_purpose NOT IN ('contributor_registration', 'merchant_registration', 'withdrawal_verification', 'vendor_auth') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'Invalid purpose'
        );
    END IF;

    IF p_expires_at IS NULL OR p_expires_at <= clock_timestamp() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'expires_at must be in the future'
        );
    END IF;

    -- Enforce strict server bounds on quota and cooldown parameters (prevent tampering)
    v_max_hourly := COALESCE(p_max_hourly, 3);
    IF v_max_hourly <= 0 OR v_max_hourly > 10 THEN
        v_max_hourly := 3;
    END IF;

    v_cooldown_seconds := COALESCE(p_cooldown_seconds, 60);
    IF v_cooldown_seconds <= 0 OR v_cooldown_seconds > 300 THEN
        v_cooldown_seconds := 60;
    END IF;

    -- 2. Acquire transaction-level advisory lock scoped to canonical phone
    -- Derived deterministically as a 64-bit integer from MD5('otp_send:' || p_phone_number)
    -- Serializes concurrent requests for the exact same canonical phone; releases automatically on transaction commit/rollback
    v_lock_key := ('x' || substr(md5('otp_send:' || trim(p_phone_number)), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. Query unified rolling 60-minute count and latest created_at across ALL purposes
    SELECT count(*), max(created_at)
    INTO v_recent_count, v_latest_created
    FROM public.phone_otp_codes
    WHERE phone_number = trim(p_phone_number)
      AND created_at >= v_one_hour_ago;

    -- 4. Unified Hourly Quota Check (Max 3 / rolling 60 min across all purposes)
    IF v_recent_count >= v_max_hourly THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'RATE_LIMIT_EXCEEDED',
            'error', 'Too many OTP requests. Please wait before requesting a new code.'
        );
    END IF;

    -- 5. Unified Cooldown Check (60-second cooldown between requests)
    IF v_latest_created IS NOT NULL THEN
        v_elapsed_seconds := extract(epoch from (clock_timestamp() - v_latest_created))::integer;
        IF v_elapsed_seconds < v_cooldown_seconds THEN
            v_retry_after := greatest(1, v_cooldown_seconds - v_elapsed_seconds);
            RETURN jsonb_build_object(
                'success', false,
                'code', 'COOLDOWN_ACTIVE',
                'retry_after', v_retry_after,
                'error', 'Please wait 60 seconds before requesting another code.'
            );
        END IF;
    END IF;

    -- 6. Invalidate previous unused OTP codes for this specific purpose only (Option A)
    UPDATE public.phone_otp_codes
    SET is_used = true
    WHERE phone_number = trim(p_phone_number)
      AND purpose = p_purpose
      AND is_used = false;

    -- 7. Atomically insert the new OTP record
    INSERT INTO public.phone_otp_codes (
        phone_number,
        code_hash,
        purpose,
        expires_at
    ) VALUES (
        trim(p_phone_number),
        trim(p_code_hash),
        p_purpose,
        p_expires_at
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'otp_id', v_new_id
    );
END;
$$;

-- Security hardening: accessible exclusively to service_role (backend admin client)
REVOKE EXECUTE ON FUNCTION public.fn_reserve_and_create_otp(text, text, text, timestamptz, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reserve_and_create_otp(text, text, text, timestamptz, integer, integer) TO service_role;
