-- ============================================================
-- FINDORA — P0-03-B: Guest Request Idempotency & Concurrency Hardening
-- Dedicated idempotency_records table and atomic RPC companion function
-- ============================================================

-- 1. Create dedicated idempotency_records table
CREATE TABLE IF NOT EXISTS public.idempotency_records (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    operation_name      text NOT NULL DEFAULT 'customer_request_create',
    idempotency_key     text NOT NULL,
    payload_hash        text NOT NULL,
    resource_id         uuid NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    created_at          timestamptz NOT NULL DEFAULT now(),
    expires_at          timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
    CONSTRAINT uq_idempotency_records_scope UNIQUE (customer_id, operation_name, idempotency_key)
);

-- 2. Create performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_records_expiry ON public.idempotency_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_records_lookup ON public.idempotency_records(customer_id, operation_name, idempotency_key);

-- 3. Row Level Security & Access Control (Strictly service_role only)
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idempotency_records FROM PUBLIC;
REVOKE ALL ON public.idempotency_records FROM anon;
REVOKE ALL ON public.idempotency_records FROM authenticated;
GRANT ALL ON public.idempotency_records TO service_role;

-- 4. Create atomic companion function: fn_create_sourcing_request_idempotent
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

    -- If no idempotency key is provided, execute canonical atomic creation directly (P0-04 legacy path)
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
    -- This serializes concurrent requests with the exact same key for the same customer
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
        -- Expired record renewal
        UPDATE public.idempotency_records
        SET payload_hash = COALESCE(p_payload_hash, ''),
            resource_id = p_request_id,
            created_at = now(),
            expires_at = now() + interval '24 hours'
        WHERE id = v_existing_id;
    ELSE
        -- New record insertion
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

-- 5. Security & Ownership
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
