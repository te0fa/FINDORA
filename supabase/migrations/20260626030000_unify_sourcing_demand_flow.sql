-- ============================================================
-- FINDORA — Unifying Sourcing Entry Points (Dual-Write) & Status Sync
-- ============================================================

-- 1. Create Sourcing Request Atomic PL/pgSQL Function
CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request(
    p_request_id uuid,
    p_customer_id uuid,
    p_customer_name text,
    p_customer_phone text,
    p_product_name text,
    p_category text,
    p_target_location text,
    p_max_price numeric DEFAULT NULL,
    p_additional_notes text DEFAULT '',
    p_request_code text DEFAULT NULL,
    p_title text DEFAULT NULL,
    p_raw_description text DEFAULT '',
    p_status text DEFAULT 'open',
    p_channel text DEFAULT 'landing_page',
    p_request_kind text DEFAULT 'general',
    p_intake_mode text DEFAULT 'quick',
    p_pricing_decision text DEFAULT 'pending_review',
    p_service_fee_amount numeric DEFAULT 299,
    p_execution_requested boolean DEFAULT false,
    p_followup_requested boolean DEFAULT false,
    p_site_visit_requested boolean DEFAULT false,
    p_reference_image_path text DEFAULT NULL,
    p_preferences jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    v_request json;
BEGIN
    -- Insert into customer_requests
    INSERT INTO public.customer_requests (
        id, customer_id, customer_name, customer_phone,
        product_name, category, target_location, max_price,
        additional_notes, status
    ) VALUES (
        p_request_id, p_customer_id, p_customer_name, p_customer_phone,
        p_product_name, p_category, p_target_location, p_max_price,
        p_additional_notes, 'processing'
    );

    -- Insert into requests
    INSERT INTO public.requests (
        id, request_code, customer_id, title, raw_description,
        current_status, source_channel, request_kind, intake_mode,
        pricing_decision, service_fee_amount, execution_requested,
        followup_requested, site_visit_requested, reference_image_path
    ) VALUES (
        p_request_id, p_request_code, p_customer_id, p_title, p_raw_description,
        p_status, p_channel, p_request_kind, p_intake_mode,
        p_pricing_decision, p_service_fee_amount, p_execution_requested,
        p_followup_requested, p_site_visit_requested, p_reference_image_path
    ) RETURNING row_to_json(public.requests.*) INTO v_request;

    -- Insert preferences if provided
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Status Synchronization Trigger
CREATE OR REPLACE FUNCTION public.fn_sync_request_status_to_customer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.customer_requests
    SET status = CASE 
        WHEN NEW.canonical_state = 'COMPLETED' THEN 'fulfilled'
        WHEN NEW.canonical_state = 'ARCHIVED' THEN 'cancelled'
        ELSE 'processing'
    END,
    updated_at = now()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_request_status_to_customer ON public.requests;
CREATE TRIGGER trg_sync_request_status_to_customer
    AFTER INSERT OR UPDATE OF canonical_state ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_request_status_to_customer();

-- 3. Backfill existing drifted requests
INSERT INTO public.customer_requests (
    id, customer_id, customer_name, customer_phone,
    product_name, category, target_location, max_price,
    additional_notes, status, created_at, updated_at
)
SELECT 
    r.id,
    r.customer_id,
    COALESCE(c.full_name, 'Valued Customer') as customer_name,
    COALESCE(c.phone_number_raw, c.phone_number_normalized) as customer_phone,
    COALESCE(r.title, 'Everyday Purchase') as product_name,
    'everyday_purchase' as category,
    COALESCE(r.city, 'Cairo') as target_location,
    NULL as max_price,
    r.raw_description as additional_notes,
    CASE 
        WHEN r.canonical_state = 'COMPLETED' THEN 'fulfilled'
        WHEN r.canonical_state = 'ARCHIVED' THEN 'cancelled'
        ELSE 'processing'
    END as status,
    r.created_at,
    r.updated_at
FROM public.requests r
LEFT JOIN public.customers c ON r.customer_id = c.id
LEFT JOIN public.customer_requests cr ON r.id = cr.id
WHERE cr.id IS NULL;
