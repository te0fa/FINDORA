-- ============================================================
-- FINDORA — P1-07 Batch 4: Drop Legacy customer_requests.customer_phone
-- Migration: 20260921000000_p1_07_drop_customer_requests_phone.sql
-- Purpose:
--   1. Replace fn_create_sourcing_request (29 params) and idempotent companion (31 params)
--      preserving p_customer_phone as an unused compatibility parameter (#4) for zero-downtime rollout.
--   2. Omit customer_phone from INSERT INTO customer_requests.
--   3. Drop obsolete index idx_customer_requests_phone.
--   4. Permanently drop column public.customer_requests.customer_phone.
--   5. Maintain strict SECURITY DEFINER, search_path = public, and service_role execute grants.
-- ============================================================

-- 1. Create/Replace 29-parameter fn_create_sourcing_request with unused p_customer_phone
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
    p_ai_confidence        numeric  DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_request json;
BEGIN
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

    -- 2. Insert into requests (atomic canonical write)
    INSERT INTO public.requests (
        id, request_code, customer_id, title, raw_description,
        current_status, source_channel, request_kind, intake_mode,
        pricing_decision, service_fee_amount, execution_requested,
        followup_requested, site_visit_requested, reference_image_path,
        is_business, business_metadata, rfq_document, metadata,
        source_type, ai_confidence
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
        p_ai_confidence
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

-- 2. Create/Replace 31-parameter fn_create_sourcing_request_idempotent with p_customer_phone forwarded
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
    p_payload_hash         text     DEFAULT NULL
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
            p_metadata, p_source_type, p_ai_confidence
        );
        RETURN jsonb_build_object(
            'success', true,
            'requestId', p_request_id,
            'requestCode', p_request_code,
            'is_replay', false,
            'creation_result', v_creation_result
        );
    END IF;

    -- 1. Acquire transaction-level advisory lock scoped to (customer_id, idempotency_key)
    v_lock_key := ('x' || substr(md5(p_customer_id::text || ':' || v_clean_key), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Check for existing idempotency record
    SELECT id, payload_hash, resource_id, expires_at
    INTO v_existing_id, v_existing_hash, v_existing_resource_id, v_existing_expires
    FROM public.idempotency_records
    WHERE customer_id = p_customer_id
      AND operation_name = v_op_name
      AND idempotency_key = v_clean_key;

    -- 3. If an unexpired record exists:
    IF v_existing_id IS NOT NULL AND v_existing_expires > now() THEN
        -- Verify payload hash
        IF p_payload_hash IS NOT NULL AND v_existing_hash <> p_payload_hash THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                'error', 'An existing request was already submitted with this Idempotency-Key but different parameters.'
            );
        END IF;

        -- Payload matches: retrieve existing request details
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

    -- 4. Either no record exists OR the record has expired:
    -- Execute atomic request creation in the same transaction
    v_creation_result := public.fn_create_sourcing_request(
        p_request_id, p_customer_id, p_customer_name, p_customer_phone,
        p_product_name, p_category, p_target_location, p_max_price,
        p_additional_notes, p_request_code, p_title, p_raw_description,
        p_status, p_channel, p_request_kind, p_intake_mode,
        p_pricing_decision, p_service_fee_amount, p_execution_requested,
        p_followup_requested, p_site_visit_requested, p_reference_image_path,
        p_preferences, p_is_business, p_business_metadata, p_rfq_document,
        p_metadata, p_source_type, p_ai_confidence
    );

    -- 5. Insert or renew the idempotency record in the same transaction
    IF v_existing_id IS NOT NULL THEN
        UPDATE public.idempotency_records
        SET payload_hash = COALESCE(p_payload_hash, ''),
            resource_id = p_request_id,
            created_at = now(),
            expires_at = now() + interval '24 hours'
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.idempotency_records (
            customer_id, operation_name, idempotency_key,
            payload_hash, resource_id, created_at, expires_at
        ) VALUES (
            p_customer_id, v_op_name, v_clean_key,
            COALESCE(p_payload_hash, ''), p_request_id, now(), now() + interval '24 hours'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'requestCode', p_request_code,
        'is_replay', false,
        'creation_result', v_creation_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Set function ownership & privileges (P0-04 Least Privilege)
ALTER FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
) FROM anon;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_create_sourcing_request(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric
) TO service_role;

ALTER FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_create_sourcing_request_idempotent(
    uuid, uuid, text, text, text, text, text, numeric, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, boolean, text, jsonb, boolean, jsonb, text, jsonb, text, numeric, text, text
) TO service_role;

-- 4. Drop legacy index
DROP INDEX IF EXISTS public.idx_customer_requests_phone;

-- 5. Drop legacy customer_phone column permanently
ALTER TABLE public.customer_requests
DROP COLUMN IF EXISTS customer_phone;
