-- ============================================================
-- FINDORA — P2-03: Auction Closure Enforcement (Time-Based & Early Approval)
-- Migration: 20260924000000_p2_03_auction_closure_enforcement.sql
-- ============================================================

-- 1. Update requests.auction_duration_hours column default to 48
ALTER TABLE public.requests
  ALTER COLUMN auction_duration_hours SET DEFAULT 48;

-- 2. Drop legacy 29-parameter fn_create_sourcing_request signature to prevent PostgREST overload collision (PGRST204)
DROP FUNCTION IF EXISTS public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text,
    text, text, text, text, text, text, text, numeric, boolean, boolean,
    boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
);

-- Update fn_create_sourcing_request to accept p_auction_duration_hours and calculate auction_ends_at
CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request(
    p_request_id            uuid,
    p_customer_id          uuid,
    p_customer_name        text,
    p_customer_phone       text,
    p_product_name         text,
    p_category             text,
    p_target_location      text,
    p_max_price            numeric  DEFAULT NULL,
    p_additional_notes     text     DEFAULT '',
    p_request_code         text     DEFAULT NULL,
    p_title                text     DEFAULT NULL,
    p_raw_description      text     DEFAULT '',
    p_status               text     DEFAULT 'open',
    p_channel              text     DEFAULT 'landing_page',
    p_request_kind         text     DEFAULT 'general',
    p_intake_mode          text     DEFAULT 'quick',
    p_pricing_decision     text     DEFAULT 'pending_review',
    p_service_fee_amount   numeric  DEFAULT 299,
    p_execution_requested  boolean  DEFAULT false,
    p_followup_requested   boolean  DEFAULT false,
    p_site_visit_requested boolean  DEFAULT false,
    p_reference_image_path text     DEFAULT NULL,
    p_preferences          jsonb    DEFAULT '{}'::jsonb,
    p_is_business          boolean  DEFAULT false,
    p_business_metadata    jsonb    DEFAULT '{}'::jsonb,
    p_rfq_document         text     DEFAULT NULL,
    p_metadata             jsonb    DEFAULT '{}'::jsonb,
    p_source_type          text     DEFAULT 'manual',
    p_ai_confidence        numeric  DEFAULT NULL,
    p_auction_duration_hours integer DEFAULT 48
) RETURNS jsonb AS $$
DECLARE
    v_request json;
    v_duration integer;
    v_created_at timestamptz;
    v_ends_at timestamptz;
BEGIN
    -- Validate duration
    v_duration := COALESCE(p_auction_duration_hours, 48);
    IF v_duration <= 0 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: auction_duration_hours must be a positive integer.' USING ERRCODE = '22023';
    END IF;

    -- Ensure exact timestamp parity: auction_ends_at derives from exact persisted created_at
    v_created_at := NOW();
    v_ends_at := v_created_at + (v_duration * INTERVAL '1 hour');

    -- 1. Insert into customer_requests
    INSERT INTO public.customer_requests (
        id, customer_id, customer_name,
        product_name, category, target_location, max_price,
        additional_notes, status
    ) VALUES (
        p_request_id, p_customer_id, p_customer_name,
        p_product_name, p_category, p_target_location, p_max_price,
        p_additional_notes, 'processing'
    );

    -- 2. Insert into requests (atomic canonical write with authoritative auction_ends_at)
    INSERT INTO public.requests (
        id, request_code, customer_id, title, raw_description,
        current_status, source_channel, request_kind, intake_mode,
        pricing_decision, service_fee_amount, execution_requested,
        followup_requested, site_visit_requested, reference_image_path,
        is_business, business_metadata, rfq_document, metadata,
        source_type, ai_confidence,
        created_at, auction_duration_hours, auction_ends_at
    ) VALUES (
        p_request_id, p_request_code, p_customer_id, p_title, p_raw_description,
        p_status, p_channel, p_request_kind, p_intake_mode,
        p_pricing_decision, p_service_fee_amount, p_execution_requested,
        p_followup_requested, p_site_visit_requested, p_reference_image_path,
        COALESCE(p_is_business, false),
        COALESCE(p_business_metadata, '{}'::jsonb),
        p_rfq_document,
        COALESCE(p_metadata, '{}'::jsonb),
        COALESCE(p_source_type, 'manual'),
        p_ai_confidence,
        v_created_at, v_duration, v_ends_at
    ) RETURNING row_to_json(public.requests.*) INTO v_request;

    -- 3. Insert preferences if provided
    IF p_preferences IS NOT NULL AND p_preferences <> '{}'::jsonb THEN
        INSERT INTO public.request_preferences (
            request_id, budget_min, budget_max, urgency_level,
            preferred_brands, preferred_models, preferred_specs,
            condition_preference, allow_alternatives, priority_focus,
            search_scope, preferred_governorate, preferred_area,
            delivery_needed, notes, knows_market_price
        ) VALUES (
            p_request_id,
            (p_preferences->>'budget_min')::numeric,
            (p_preferences->>'budget_max')::numeric,
            COALESCE(p_preferences->>'urgency_level', 'normal'),
            p_preferences->>'preferred_brands',
            p_preferences->>'preferred_models',
            p_preferences->>'preferred_specs',
            COALESCE(p_preferences->>'condition_preference', 'new'),
            COALESCE((p_preferences->>'allow_alternatives')::boolean, false),
            COALESCE(p_preferences->>'priority_focus', 'best_value'),
            COALESCE(p_preferences->>'search_scope', 'online_and_offline'),
            p_preferences->>'preferred_governorate',
            p_preferences->>'preferred_area',
            COALESCE((p_preferences->>'delivery_needed')::boolean, false),
            p_preferences->>'notes',
            COALESCE((p_preferences->>'knows_market_price')::boolean, false)
        ) ON CONFLICT (request_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'request', v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Drop legacy 31-parameter fn_create_sourcing_request_idempotent signature to prevent PostgREST overload collision (PGRST204)
DROP FUNCTION IF EXISTS public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text,
    text, text, text, text, text, text, text, numeric, boolean, boolean,
    boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric,
    text, text
);

-- Update fn_create_sourcing_request_idempotent
CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request_idempotent(
    p_request_id            uuid,
    p_customer_id          uuid,
    p_customer_name        text,
    p_customer_phone       text,
    p_product_name         text,
    p_category             text,
    p_target_location      text,
    p_max_price            numeric  DEFAULT NULL,
    p_additional_notes     text     DEFAULT '',
    p_request_code         text     DEFAULT NULL,
    p_title                text     DEFAULT NULL,
    p_raw_description      text     DEFAULT '',
    p_status               text     DEFAULT 'open',
    p_channel              text     DEFAULT 'landing_page',
    p_request_kind         text     DEFAULT 'general',
    p_intake_mode          text     DEFAULT 'quick',
    p_pricing_decision     text     DEFAULT 'pending_review',
    p_service_fee_amount   numeric  DEFAULT 299,
    p_execution_requested  boolean  DEFAULT false,
    p_followup_requested   boolean  DEFAULT false,
    p_site_visit_requested boolean  DEFAULT false,
    p_reference_image_path text     DEFAULT NULL,
    p_preferences          jsonb    DEFAULT '{}'::jsonb,
    p_is_business          boolean  DEFAULT false,
    p_business_metadata    jsonb    DEFAULT '{}'::jsonb,
    p_rfq_document         text     DEFAULT NULL,
    p_metadata             jsonb    DEFAULT '{}'::jsonb,
    p_source_type          text     DEFAULT 'manual',
    p_ai_confidence        numeric  DEFAULT NULL,
    p_idempotency_key      text     DEFAULT NULL,
    p_payload_hash         text     DEFAULT NULL,
    p_auction_duration_hours integer DEFAULT 48
) RETURNS jsonb AS $$
DECLARE
    v_op_name CONSTANT text := 'customer_request_create';
    v_lock_key bigint;
    v_existing_id uuid;
    v_existing_hash text;
    v_existing_resource_id uuid;
    v_existing_expires timestamptz;
    v_existing_request_code text;
    v_existing_status text;
    v_creation_result jsonb;
    v_clean_key text;
BEGIN
    v_clean_key := NULLIF(trim(p_idempotency_key), '');

    -- If no idempotency key is provided, execute canonical atomic creation directly
    IF v_clean_key IS NULL THEN
        v_creation_result := public.fn_create_sourcing_request(
            p_request_id, p_customer_id, p_customer_name, p_customer_phone,
            p_product_name, p_category, p_target_location, p_max_price,
            p_additional_notes, p_request_code, p_title, p_raw_description,
            p_status, p_channel, p_request_kind, p_intake_mode,
            p_pricing_decision, p_service_fee_amount, p_execution_requested,
            p_followup_requested, p_site_visit_requested, p_reference_image_path,
            p_preferences, p_is_business, p_business_metadata, p_rfq_document,
            p_metadata, p_source_type, p_ai_confidence, p_auction_duration_hours
        );
        RETURN jsonb_build_object(
            'success', true,
            'requestId', p_request_id,
            'requestCode', p_request_code,
            'is_replay', false,
            'creation_result', v_creation_result
        );
    END IF;

    v_lock_key := ('x' || substr(md5(v_clean_key), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT id, request_payload_hash, resource_id, expires_at
    INTO v_existing_id, v_existing_hash, v_existing_resource_id, v_existing_expires
    FROM public.idempotency_keys
    WHERE idempotency_key = v_clean_key
      AND operation_name = v_op_name
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF p_payload_hash IS NOT NULL AND v_existing_hash IS NOT NULL AND v_existing_hash <> p_payload_hash THEN
            RAISE EXCEPTION 'IDEMPOTENCY_MISMATCH: Key % was already used with different payload.', v_clean_key
                USING ERRCODE = '42000';
        END IF;

        SELECT request_code, current_status
        INTO v_existing_request_code, v_existing_status
        FROM public.requests
        WHERE id = v_existing_resource_id;

        RETURN jsonb_build_object(
            'success', true,
            'requestId', v_existing_resource_id,
            'requestCode', v_existing_request_code,
            'is_replay', true,
            'status', v_existing_status
        );
    END IF;

    v_creation_result := public.fn_create_sourcing_request(
        p_request_id, p_customer_id, p_customer_name, p_customer_phone,
        p_product_name, p_category, p_target_location, p_max_price,
        p_additional_notes, p_request_code, p_title, p_raw_description,
        p_status, p_channel, p_request_kind, p_intake_mode,
        p_pricing_decision, p_service_fee_amount, p_execution_requested,
        p_followup_requested, p_site_visit_requested, p_reference_image_path,
        p_preferences, p_is_business, p_business_metadata, p_rfq_document,
        p_metadata, p_source_type, p_ai_confidence, p_auction_duration_hours
    );

    INSERT INTO public.idempotency_keys (
        idempotency_key,
        operation_name,
        resource_id,
        user_id,
        request_payload_hash,
        status_code,
        response_payload,
        expires_at
    ) VALUES (
        v_clean_key,
        v_op_name,
        p_request_id,
        p_customer_id,
        p_payload_hash,
        200,
        jsonb_build_object('success', true, 'requestId', p_request_id, 'requestCode', p_request_code),
        NOW() + INTERVAL '24 hours'
    );

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'requestCode', p_request_code,
        'is_replay', false,
        'creation_result', v_creation_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Permissions for creation RPCs
ALTER FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, integer
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, integer
) TO service_role;

ALTER FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text, integer
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text, integer
) TO service_role;

-- 5. Trigger Function for Universal Database Bid Closure Enforcement
CREATE OR REPLACE FUNCTION public.fn_enforce_vendor_bid_auction_window()
RETURNS trigger AS $$
DECLARE
    v_req RECORD;
BEGIN
    -- If updating, ensure request_id has not been modified (request association is immutable)
    IF TG_OP = 'UPDATE' AND OLD.request_id IS DISTINCT FROM NEW.request_id THEN
        RAISE EXCEPTION 'INVALID_OPERATION: request_id on a bid is immutable.' USING ERRCODE = '22000';
    END IF;

    -- Lock parent request row FOR SHARE (strictly serializes against employee approval FOR UPDATE)
    SELECT id, auction_ends_at, selected_bid_id, current_status, is_archived
    INTO v_req
    FROM public.requests
    WHERE id = NEW.request_id
    FOR SHARE;

    -- 1. Request must exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Sourcing request % does not exist.', NEW.request_id USING ERRCODE = 'P0002';
    END IF;

    -- 2. Request must not be archived
    IF v_req.is_archived THEN
        RAISE EXCEPTION 'AUCTION_CLOSED: Sourcing request is archived.' USING ERRCODE = 'P0005';
    END IF;

    -- 3. Request current_status must be open for bidding
    IF v_req.current_status NOT IN ('open', 'submitted', 'assigned') THEN
        RAISE EXCEPTION 'AUCTION_CLOSED: Sourcing request is not open for bidding (status: %).', v_req.current_status USING ERRCODE = 'P0006';
    END IF;

    -- 4. Reject if auction closed by employee approval
    IF v_req.selected_bid_id IS NOT NULL THEN
        RAISE EXCEPTION 'AUCTION_CLOSED: An offer has already been approved for this request.' USING ERRCODE = 'P0003';
    END IF;

    -- 5. Reject if auction expired by time
    IF v_req.auction_ends_at IS NOT NULL AND NOW() > v_req.auction_ends_at THEN
        RAISE EXCEPTION 'AUCTION_CLOSED: Bidding period has expired.' USING ERRCODE = 'P0004';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to public.vendor_bids (runs for all roles: anon, authenticated, service_role)
DROP TRIGGER IF EXISTS trg_enforce_vendor_bid_auction_window ON public.vendor_bids;
CREATE TRIGGER trg_enforce_vendor_bid_auction_window
BEFORE INSERT OR UPDATE ON public.vendor_bids
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_vendor_bid_auction_window();

-- 6. Atomic Employee Approval RPC
CREATE OR REPLACE FUNCTION public.fn_staff_approve_vendor_bid(
    p_request_id uuid,
    p_bid_id     uuid
) RETURNS jsonb AS $$
DECLARE
    v_request RECORD;
    v_bid RECORD;
BEGIN
    -- 1. Lock requests row FOR UPDATE
    SELECT id, selected_bid_id, current_status, is_archived, auction_ends_at, customer_id
    INTO v_request
    FROM public.requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Request % does not exist.', p_request_id USING ERRCODE = 'P0002';
    END IF;

    IF v_request.is_archived THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Request % is archived.', p_request_id USING ERRCODE = 'P0005';
    END IF;

    IF v_request.selected_bid_id IS NOT NULL THEN
        RAISE EXCEPTION 'CONFLICT: Request % already has an approved bid.', p_request_id USING ERRCODE = 'P0003';
    END IF;

    -- 2. Lock & verify target bid belongs to request and is active
    SELECT id, vendor_id, price_amount, is_active
    INTO v_bid
    FROM public.vendor_bids
    WHERE id = p_bid_id AND request_id = p_request_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Bid % does not exist for request %.', p_bid_id, p_request_id USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_bid.is_active THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Bid % is inactive.', p_bid_id USING ERRCODE = 'P0007';
    END IF;

    -- 3. Set selected_bid_id (current_status remains unchanged per specification)
    UPDATE public.requests
    SET selected_bid_id = p_bid_id,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'selectedBidId', p_bid_id,
        'vendorId', v_bid.vendor_id,
        'customerId', v_request.customer_id,
        'priceAmount', v_bid.price_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissions for approval RPC: strictly service_role only
ALTER FUNCTION public.fn_staff_approve_vendor_bid(uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_staff_approve_vendor_bid(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_staff_approve_vendor_bid(uuid, uuid) TO service_role;
