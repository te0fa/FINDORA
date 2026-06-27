-- 1. Add canonical_state column
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS canonical_state TEXT DEFAULT 'UNKNOWN';

-- 2. Pure function matching JS logic exactly
CREATE OR REPLACE FUNCTION public.fn_compute_canonical_state(
    p_is_archived BOOLEAN,
    p_current_status TEXT,
    p_reviewer_decision TEXT,
    p_client_released_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    -- 1. Archive Precedence
    IF COALESCE(p_is_archived, FALSE) OR p_current_status = 'cancelled' THEN
        RETURN 'ARCHIVED';
    END IF;

    -- 2. Completed (Terminal / Released)
    IF p_current_status = 'closed' OR (p_client_released_at IS NOT NULL AND p_current_status <> 'closed') THEN
        RETURN 'COMPLETED';
    END IF;

    -- 3. Ready
    IF p_current_status = 'client_ready' AND p_client_released_at IS NULL THEN
        RETURN 'READY';
    END IF;

    -- 4. Rejected (Terminal Staff Decision)
    IF p_reviewer_decision = 'reject' THEN
        RETURN 'REJECTED';
    END IF;

    -- 5. Issues (Needs Clarification)
    IF p_reviewer_decision = 'needs_clarification' OR p_current_status = 'client_feedback_pending' THEN
        RETURN 'ISSUES';
    END IF;

    -- 6. Operations
    IF p_reviewer_decision = 'approve' AND p_current_status IN ('in_progress', 'research', 'reporting') THEN
        RETURN 'OPERATIONS';
    END IF;

    -- 7. Intake
    IF p_reviewer_decision IS NULL AND p_current_status IN ('submitted', 'open') THEN
        RETURN 'INTAKE';
    END IF;

    RETURN 'UNKNOWN';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger function for changes on requests table
CREATE OR REPLACE FUNCTION public.fn_requests_canonical_state_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_released_at TIMESTAMPTZ;
BEGIN
    SELECT client_released_at 
    INTO v_released_at 
    FROM public.request_operational_states 
    WHERE request_id = NEW.id;

    NEW.canonical_state := public.fn_compute_canonical_state(
        NEW.is_archived,
        NEW.current_status,
        NEW.reviewer_decision,
        v_released_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_requests_canonical_state ON public.requests;
CREATE TRIGGER tr_requests_canonical_state
    BEFORE INSERT OR UPDATE OF is_archived, current_status, reviewer_decision
    ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_requests_canonical_state_trigger();

-- 4. Trigger function for changes on request_operational_states table
CREATE OR REPLACE FUNCTION public.fn_operational_states_canonical_state_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.requests r
    SET canonical_state = public.fn_compute_canonical_state(
        r.is_archived,
        r.current_status,
        r.reviewer_decision,
        NEW.client_released_at
    )
    WHERE r.id = NEW.request_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_operational_states_canonical_state ON public.request_operational_states;
CREATE TRIGGER tr_operational_states_canonical_state
    AFTER INSERT OR UPDATE OF client_released_at
    ON public.request_operational_states
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_operational_states_canonical_state_trigger();

-- 5. Safe, direct initialization of existing rows (without touching updated_at)
UPDATE public.requests r
SET canonical_state = public.fn_compute_canonical_state(
    r.is_archived,
    r.current_status,
    r.reviewer_decision,
    (SELECT s.client_released_at FROM public.request_operational_states s WHERE s.request_id = r.id)
);

-- 6. Add Index for fast WHERE filtering
CREATE INDEX IF NOT EXISTS idx_requests_canonical_state ON public.requests (canonical_state);
