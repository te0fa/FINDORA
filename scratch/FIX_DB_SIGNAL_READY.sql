-- FIX FOR SIGNAL_READY TRANSITION BUG
-- Column "is_active" does not exist in table "merchant_quotes"
-- This script removes the erroneous check from the transition engine.

CREATE OR REPLACE FUNCTION public.fn_execute_request_transition(
    p_transition_name TEXT,
    p_request_id UUID,
    p_actor_staff_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_staff RECORD;
    v_prefs RECORD;
    v_from_state TEXT;
    v_to_state TEXT;
    v_to_status TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_history_id UUID;
BEGIN
    -- 1. Fetch Request & Staff
    SELECT * INTO v_req FROM public.requests WHERE id = p_request_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

    SELECT * INTO v_staff FROM public.staff_members WHERE id = p_actor_staff_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Staff member not found.'; END IF;

    SELECT * INTO v_prefs FROM public.request_preferences WHERE request_id = p_request_id;

    -- 2. Resolve Current State
    v_from_state := public.fn_resolve_canonical_state(
        v_req.is_archived,
        v_req.current_status,
        v_req.reviewer_decision,
        (SELECT client_released_at FROM public.v_request_ui_status WHERE request_id = p_request_id)
    );

    -- 3. Transition Logic
    CASE p_transition_name
        WHEN 'APPROVE_INTAKE' THEN
            IF v_from_state != 'INTAKE' THEN RAISE EXCEPTION 'Invalid state for APPROVE_INTAKE'; END IF;
            v_to_status := 'in_progress';
            -- Update logic...
            UPDATE public.requests SET 
                current_status = v_to_status,
                reviewer_decision = 'approve',
                operations_entered_at = v_now
            WHERE id = p_request_id;

        WHEN 'START_RESEARCH' THEN
            v_to_status := 'research';
            UPDATE public.requests SET current_status = v_to_status WHERE id = p_request_id;

        WHEN 'MOVE_TO_REPORTING' THEN
            v_to_status := 'reporting';
            UPDATE public.requests SET 
                current_status = v_to_status,
                reporting_entered_at = v_now
            WHERE id = p_request_id;

        WHEN 'SIGNAL_READY' THEN
            IF v_from_state != 'OPERATIONS' THEN RAISE EXCEPTION 'Invalid state for SIGNAL_READY'; END IF;
            
            -- CHECK 1: Shortlist not empty
            IF NOT EXISTS (
                SELECT 1 FROM public.request_candidate_shortlists WHERE request_id = p_request_id
            ) THEN
                RAISE EXCEPTION 'BLOCK: Shortlist empty.';
            END IF;

            -- CHECK 2: If offline scope, need at least one merchant quote
            -- FIX: Removed non-existent "is_active" column check
            IF v_prefs.search_scope IN ('offline_only', 'online_and_offline')
               AND NOT EXISTS (
                    SELECT 1
                    FROM public.merchant_quotes
                    WHERE request_id = p_request_id
                    -- is_active = true removed here
               ) THEN
                RAISE EXCEPTION 'BLOCK: Missing merchant quotes for offline scope.';
            END IF;

            v_to_status := 'client_ready';
            UPDATE public.requests SET 
                current_status = v_to_status,
                ready_entered_at = v_now
            WHERE id = p_request_id;

        WHEN 'RELEASE_FINAL' THEN
            PERFORM public.fn_release_request_to_customer(p_request_id, p_notes, v_staff.auth_user_id);
            v_to_status := v_req.current_status; -- Status updated inside the helper

        ELSE
            RAISE EXCEPTION 'Unknown transition: %', p_transition_name;
    END CASE;

    -- 4. Resolve New State
    v_to_state := public.fn_resolve_canonical_state(
        v_req.is_archived,
        v_to_status,
        v_req.reviewer_decision,
        (SELECT client_released_at FROM public.v_request_ui_status WHERE request_id = p_request_id)
    );

    -- 5. Log History
    INSERT INTO public.request_status_history (
        request_id, from_status, to_status, from_canonical_state, to_canonical_state,
        transition_name, changed_by_staff_id, change_reason, metadata
    ) VALUES (
        p_request_id, v_req.current_status, v_to_status, v_from_state, v_to_state,
        p_transition_name, p_actor_staff_id, p_notes, p_metadata
    ) RETURNING id INTO v_history_id;

    RETURN jsonb_build_object(
        'success', true,
        'history_id', v_history_id,
        'from_state', v_from_state,
        'to_state', v_to_state
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
