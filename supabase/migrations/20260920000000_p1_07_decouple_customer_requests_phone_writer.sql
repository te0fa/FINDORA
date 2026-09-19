-- ============================================================
-- FINDORA — P1-07 Batch 3: Writer Decoupling
-- Migration: 20260920000000_p1_07_decouple_customer_requests_phone_writer.sql
-- Purpose: Stop writing customer_phone to public.customer_requests.
-- Preserves:
--   1. Exact 29-parameter signature for PostgREST & caller compatibility.
--   2. Atomic dual-write into customer_requests, requests, and request_preferences.
--   3. SECURITY DEFINER, search_path = public, and service_role execution privileges.
--   4. Existing customer_requests.customer_phone column and index (Batch 4 scope).
-- ============================================================

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
    -- P1-07 Batch 3: Write NULL to customer_phone to decouple writer from plaintext phone storage.
    -- Canonical customer identity is exclusively customer_id -> customers(id).
    INSERT INTO public.customer_requests (
        id, customer_id, customer_name, customer_phone,
        product_name, category, target_location, max_price,
        additional_notes, status
    ) VALUES (
        p_request_id, p_customer_id, p_customer_name, NULL,
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

-- Security & Ownership (P0-04 Principle of Least Privilege)
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
