-- ============================================================
-- FINDORA — P1-02 Batch 1: Customer Vendor Feedback DB Boundary
-- Migration: 20260923000000_p1_02_customer_vendor_feedback_rpc.sql
--
-- Security Design:
-- 1. Table public.vendors remains strict Default-Deny for direct writes
--    (NO direct INSERT/UPDATE/DELETE granted to anon or authenticated).
-- 2. Database idempotency barrier: exactly one review per request enforced via
--    partial unique index on public.vendor_reviews(request_id) WHERE request_id IS NOT NULL.
-- 3. Narrowly scoped SECURITY DEFINER RPC for verified customer vendor feedback.
-- 4. Authoritative identity derivation: auth.uid() -> customers.auth_user_id = customer_id.
--    Caller CANNOT supply customer_id or auth_user_id.
-- 5. Authoritative vendor derivation: requests.selected_bid_id -> vendor_bids.vendor_id.
--    Caller CANNOT supply vendor_id or merchant name.
-- 6. Strict lifecycle & entitlement gates: request ownership, non-cancelled/non-archived,
--    non-terminal, released or completed, and unlocked/paid.
-- 7. Concurrency safe: FOR UPDATE row locks on requests and vendors.
-- 8. Trust score updated via exact cumulative moving average formula.
-- 9. Total successful deals incremented atomically by 1.
-- 10. Audit logging to public.vendor_audit_log with actor_id = NULL (FK requires staff_members)
--     and customer context stored in new_value JSONB payload.
-- 11. Execution granted strictly to authenticated, revoked from PUBLIC and anon.
-- ============================================================

-- 1. Database-Level Unique Idempotency Constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_reviews_request_id
ON public.vendor_reviews(request_id)
WHERE request_id IS NOT NULL;

-- 2. Customer Vendor Feedback SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.fn_customer_submit_vendor_feedback(
    p_request_id uuid,
    p_vendor_rating integer,
    p_platform_rating integer DEFAULT NULL,
    p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := auth.uid();
    v_customer_id uuid;
    v_request RECORD;
    v_vendor_id uuid;
    v_current_trust_score integer;
    v_current_deals integer;
    v_new_trust_score integer;
    v_new_deals integer;
    v_review_id uuid;
    v_clean_comment text;
BEGIN
    -- 1. Enforce authenticated context
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.' USING ERRCODE = '28000';
    END IF;

    -- 2. Validate input parameters
    IF p_vendor_rating IS NULL OR p_vendor_rating < 1 OR p_vendor_rating > 5 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Vendor rating must be an integer between 1 and 5.' USING ERRCODE = '22023';
    END IF;

    IF p_platform_rating IS NOT NULL AND (p_platform_rating < 1 OR p_platform_rating > 5) THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Platform rating must be an integer between 1 and 5.' USING ERRCODE = '22023';
    END IF;

    IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Comment exceeds maximum allowed length of 2000 characters.' USING ERRCODE = '22023';
    END IF;

    v_clean_comment := nullif(trim(p_comment), '');

    -- 3. Resolve customer identity from auth.uid()
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE auth_user_id = v_auth_uid;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: Customer profile not found for authenticated user.' USING ERRCODE = '42501';
    END IF;

    -- 4. Lock and fetch request row for atomic validation
    SELECT
        id,
        customer_id,
        selected_bid_id,
        current_status,
        is_cancelled,
        archived_at,
        service_fee_amount
    INTO v_request
    FROM public.requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Request % not found.', p_request_id USING ERRCODE = 'P0002';
    END IF;

    -- 5. Enforce customer ownership (IDOR prevention)
    IF v_request.customer_id <> v_customer_id THEN
        RAISE EXCEPTION 'FORBIDDEN: You do not own request %.', p_request_id USING ERRCODE = '42501';
    END IF;

    -- 6. Enforce winning vendor bid existence
    IF v_request.selected_bid_id IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: Request % has no winning vendor bid selected.', p_request_id USING ERRCODE = '42501';
    END IF;

    -- 7. Enforce non-terminal & non-cancelled lifecycle
    IF v_request.is_cancelled IS TRUE OR v_request.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: Request % is cancelled or archived.', p_request_id USING ERRCODE = '42501';
    END IF;

    IF v_request.current_status IN ('cancelled', 'expired', 'rejected') THEN
        RAISE EXCEPTION 'FORBIDDEN: Request % is in terminal ineligible status %.', p_request_id, v_request.current_status USING ERRCODE = '42501';
    END IF;

    -- 8. Enforce report release or completed status
    IF v_request.current_status NOT IN ('closed', 'completed')
       AND NOT EXISTS (
           SELECT 1
           FROM public.request_operational_states ros
           WHERE ros.request_id = p_request_id
             AND ros.client_released_at IS NOT NULL
       )
    THEN
        RAISE EXCEPTION 'FORBIDDEN: Report has not been released for request %.', p_request_id USING ERRCODE = '42501';
    END IF;

    -- 9. Enforce entitlement / unlocked status
    IF NOT (
        COALESCE(v_request.service_fee_amount, 0) = 0
        OR EXISTS (
            SELECT 1 FROM public.payment_intents pi
            WHERE pi.request_id = p_request_id AND pi.status = 'confirmed'
        )
        OR EXISTS (
            SELECT 1 FROM public.report_option_snapshots ros
            WHERE ros.request_id = p_request_id AND ros.reveal_locked = false
        )
    ) THEN
        RAISE EXCEPTION 'FORBIDDEN: Request % is not unlocked or paid.', p_request_id USING ERRCODE = '42501';
    END IF;

    -- 10. Check duplicate review before vendor lock (fast check)
    IF EXISTS (
        SELECT 1 FROM public.vendor_reviews vr
        WHERE vr.request_id = p_request_id
    ) THEN
        RAISE EXCEPTION 'CONFLICT: Feedback has already been submitted for request %.', p_request_id USING ERRCODE = '23505';
    END IF;

    -- 11. Authoritatively derive vendor from selected_bid_id
    SELECT vb.vendor_id INTO v_vendor_id
    FROM public.vendor_bids vb
    WHERE vb.id = v_request.selected_bid_id;

    IF v_vendor_id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Winning vendor could not be resolved from selected bid %.', v_request.selected_bid_id USING ERRCODE = 'P0002';
    END IF;

    -- 12. Lock vendor row and read current counters
    SELECT trust_score, total_successful_deals
    INTO v_current_trust_score, v_current_deals
    FROM public.vendors
    WHERE id = v_vendor_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Vendor % not found.', v_vendor_id USING ERRCODE = 'P0002';
    END IF;

    v_current_trust_score := COALESCE(v_current_trust_score, 85);
    v_current_deals := COALESCE(v_current_deals, 0);

    -- 13. Calculate new trust score & increment successful deals
    v_new_trust_score := LEAST(
        100,
        GREATEST(
            0,
            ROUND(
                (
                    (v_current_trust_score * v_current_deals)
                    + (p_vendor_rating * 20)
                )::numeric
                / (v_current_deals + 1)
            )
        )
    );
    v_new_deals := v_current_deals + 1;

    -- 14. Insert vendor review record
    INSERT INTO public.vendor_reviews (
        vendor_id,
        request_id,
        customer_id,
        vendor_rating,
        platform_rating,
        platform_comment,
        is_published,
        is_verified_purchase,
        review_token,
        token_expires_at
    )
    VALUES (
        v_vendor_id,
        p_request_id,
        v_customer_id,
        p_vendor_rating,
        p_platform_rating,
        v_clean_comment,
        true,
        true,
        NULL,
        NULL
    )
    RETURNING id INTO v_review_id;

    -- 15. Update vendor trust score and deals count (tier trigger trg_vendors_calc_tier fires automatically)
    UPDATE public.vendors
    SET
        trust_score = v_new_trust_score,
        total_successful_deals = v_new_deals,
        updated_at = now()
    WHERE id = v_vendor_id;

    -- 16. Record audit log entry (actor_id = NULL for customer, context in new_value)
    INSERT INTO public.vendor_audit_log (
        vendor_id,
        actor_id,
        event_name,
        old_value,
        new_value
    )
    VALUES (
        v_vendor_id,
        NULL,
        'CUSTOMER_VENDOR_FEEDBACK_SUBMITTED',
        jsonb_build_object(
            'trust_score', v_current_trust_score,
            'total_successful_deals', v_current_deals
        ),
        jsonb_build_object(
            'customer_id', v_customer_id,
            'auth_user_id', v_auth_uid,
            'request_id', p_request_id,
            'review_id', v_review_id,
            'vendor_rating', p_vendor_rating,
            'platform_rating', p_platform_rating,
            'trust_score_before', v_current_trust_score,
            'trust_score_after', v_new_trust_score,
            'deal_count_before', v_current_deals,
            'deal_count_after', v_new_deals
        )
    );

    -- 17. Return result payload
    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'vendor_id', v_vendor_id,
        'review_id', v_review_id,
        'trust_score', v_new_trust_score,
        'total_successful_deals', v_new_deals
    );
END;
$$;

-- 3. Permissions & Role Grants
ALTER FUNCTION public.fn_customer_submit_vendor_feedback(uuid, integer, integer, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_customer_submit_vendor_feedback(uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_customer_submit_vendor_feedback(uuid, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_customer_submit_vendor_feedback(uuid, integer, integer, text) TO authenticated;
