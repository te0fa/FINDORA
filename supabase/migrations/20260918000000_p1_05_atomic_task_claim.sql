-- ============================================================
-- FINDORA — P1-05: Atomic Task Claiming
-- Eliminates TOCTOU race condition on platform task claiming.
-- Enforces server-bound contributor identity, hierarchical row-level locking,
-- atomic state transition, stale claim expiration, and unique violation defense.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_claim_platform_task(
    p_task_id uuid,
    p_contributor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contributor record;
    v_task record;
    v_existing_claim_id uuid;
    v_existing_task_id uuid;
    v_existing_expires_at timestamptz;
    v_time_limit integer;
    v_expires_at timestamptz;
    v_new_claim record;
BEGIN
    -- 1. Input Validation
    IF p_task_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'taskId is required'
        );
    END IF;

    IF p_contributor_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_INPUT',
            'error', 'contributorId is required'
        );
    END IF;

    -- 2. Authorization & Identity Binding
    -- Tier 1 Lock: Lock the contributor row first to serialize same-contributor requests
    IF auth.role() = 'authenticated' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'UNAUTHORIZED',
                'error', 'Authentication required'
            );
        END IF;

        SELECT id, status, auth_user_id
        INTO v_contributor
        FROM public.contributors
        WHERE id = p_contributor_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONTRIBUTOR_NOT_FOUND',
                'error', 'Contributor profile not found'
            );
        END IF;

        IF v_contributor.auth_user_id IS NULL OR v_contributor.auth_user_id != auth.uid() THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONTRIBUTOR_IDENTITY_MISMATCH',
                'error', 'Authenticated user does not own this contributor profile'
            );
        END IF;

        IF v_contributor.status != 'approved' THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONTRIBUTOR_NOT_APPROVED',
                'error', 'Contributor is not approved'
            );
        END IF;

    ELSIF auth.role() = 'service_role' THEN
        -- Allowed for internal backend, test harnesses, and system processes
        SELECT id, status, auth_user_id
        INTO v_contributor
        FROM public.contributors
        WHERE id = p_contributor_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONTRIBUTOR_NOT_FOUND',
                'error', 'Contributor profile not found'
            );
        END IF;

        IF v_contributor.status != 'approved' THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONTRIBUTOR_NOT_APPROVED',
                'error', 'Contributor is not approved'
            );
        END IF;

    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'error', 'Unauthorized role'
        );
    END IF;

    -- 3. Active Claim & Stale Claim Lifecycle Management
    SELECT id, task_id, expires_at
    INTO v_existing_claim_id, v_existing_task_id, v_existing_expires_at
    FROM public.task_claims
    WHERE contributor_id = p_contributor_id
      AND status = 'in_progress'
    FOR UPDATE;

    IF FOUND THEN
        -- If claim is active and unexpired, reject
        IF v_existing_expires_at > clock_timestamp() THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ALREADY_HAVE_ACTIVE_TASK',
                'error', 'You already have an active task in progress'
            );
        END IF;

        -- Claim is stale: expire old claim and conditionally reopen former task
        UPDATE public.task_claims
        SET status = 'expired'
        WHERE id = v_existing_claim_id;

        UPDATE public.platform_tasks
        SET status = 'open',
            updated_at = clock_timestamp()
        WHERE id = v_existing_task_id
          AND status = 'claimed';
    END IF;

    -- 4. Tier 2 Lock: Target Task Lock & Availability Validation
    SELECT id, status, time_limit_minutes
    INTO v_task
    FROM public.platform_tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TASK_NOT_FOUND',
            'error', 'Task not found'
        );
    END IF;

    IF v_task.status != 'open' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TASK_NOT_AVAILABLE',
            'error', 'Task is no longer available'
        );
    END IF;

    -- 5. Atomic State Transition
    v_time_limit := COALESCE(v_task.time_limit_minutes, 60);
    IF v_time_limit <= 0 THEN
        v_time_limit := 60;
    END IF;
    v_expires_at := clock_timestamp() + (v_time_limit * interval '1 minute');

    UPDATE public.platform_tasks
    SET status = 'claimed',
        updated_at = clock_timestamp()
    WHERE id = p_task_id;

    INSERT INTO public.task_claims (
        task_id,
        contributor_id,
        status,
        expires_at
    ) VALUES (
        p_task_id,
        p_contributor_id,
        'in_progress',
        v_expires_at
    )
    RETURNING id, task_id, contributor_id, status, claimed_at, expires_at
    INTO v_new_claim;

    RETURN jsonb_build_object(
        'success', true,
        'claim', row_to_json(v_new_claim)
    );

EXCEPTION
    WHEN unique_violation THEN
        DECLARE
            v_constraint text;
        BEGIN
            GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
            IF v_constraint = 'idx_one_active_task' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'ALREADY_HAVE_ACTIVE_TASK',
                    'error', 'You already have an active task in progress'
                );
            ELSIF v_constraint = 'idx_one_active_claim_per_task' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'TASK_NOT_AVAILABLE',
                    'error', 'Task is no longer available'
                );
            ELSE
                RAISE;
            END IF;
        END;
END;
$$;

-- Security hardening: executable exclusively by authenticated users and service_role
REVOKE ALL ON FUNCTION public.fn_claim_platform_task(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_claim_platform_task(uuid, uuid) TO authenticated, service_role;
