-- Update fn_hard_delete_request_with_backup to allow cancelled requests as safe terminal state for deletion
CREATE OR REPLACE FUNCTION public.fn_hard_delete_request_with_backup(
    p_request_id uuid,
    p_backup_id uuid,
    p_actor_staff_id uuid,
    p_delete_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
    v_request record;
    v_backup record;
BEGIN
    -- Security Check: Actor must be active Admin or Owner
    SELECT EXISTS (
        SELECT 1 FROM public.staff_members sm
        LEFT JOIN public.staff_member_roles smr ON sm.id = smr.staff_member_id
        WHERE sm.id = p_actor_staff_id
          AND sm.is_active = true
          AND (sm.staff_role IN ('admin', 'owner') OR smr.role_code IN ('admin', 'owner'))
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'BLOCK: Unauthorized. Only active admins or owners can perform hard deletes.';
    END IF;

    -- Fetch Request Data with UI view join for released_at
    SELECT 
        r.id,
        r.request_code,
        r.current_status,
        r.reviewer_decision,
        r.is_archived,
        v.client_released_at
    INTO v_request
    FROM public.requests r
    LEFT JOIN public.v_request_ui_status v ON r.id = v.request_id
    WHERE r.id = p_request_id;

    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'BLOCK: Request % not found.', p_request_id;
    END IF;

    -- Strict Terminal State Guard
    -- Allowed ONLY if: archived, closed, released, rejected, or cancelled
    IF NOT (
        v_request.is_archived IS TRUE
        OR v_request.current_status = 'closed'
        OR v_request.current_status = 'cancelled'
        OR v_request.client_released_at IS NOT NULL
        OR COALESCE(v_request.reviewer_decision, '') = 'reject'
    ) THEN
        RAISE EXCEPTION 'BLOCK: Request % is NOT in a safe terminal state for deletion. Status: %, Decision: %', 
            v_request.request_code, 
            v_request.current_status, 
            COALESCE(v_request.reviewer_decision, 'NULL');
    END IF;

    -- Explicit Active State Guard
    IF COALESCE(v_request.current_status, '') IN ('open', 'submitted', 'in_progress', 'research', 'reporting', 'client_ready')
       AND v_request.is_archived IS NOT TRUE
       AND v_request.client_released_at IS NULL
       AND COALESCE(v_request.reviewer_decision, '') != 'reject'
    THEN
        RAISE EXCEPTION 'BLOCK: Active request % cannot be hard deleted.', v_request.request_code;
    END IF;

    -- Verify Backup exists and belongs to this request
    SELECT * INTO v_backup
    FROM public.request_delete_backups
    WHERE id = p_backup_id;

    IF v_backup.id IS NULL THEN
        RAISE EXCEPTION 'BLOCK: Backup % not found.', p_backup_id;
    END IF;

    IF v_backup.request_id != p_request_id THEN
        RAISE EXCEPTION 'BLOCK: Backup % does not belong to request %.', p_backup_id, p_request_id;
    END IF;

    IF v_backup.delete_confirmed IS TRUE THEN
        RAISE EXCEPTION 'BLOCK: This backup has already been used for a completed deletion.';
    END IF;

    -- Atomic Deletion of Children (Live Schema Verified)
    DELETE FROM public.report_option_snapshots WHERE request_id = p_request_id;
    DELETE FROM public.reports WHERE request_id = p_request_id;
    DELETE FROM public.request_candidate_shortlists WHERE request_id = p_request_id;
    DELETE FROM public.research_items WHERE request_id = p_request_id;
    DELETE FROM public.research_runs WHERE request_id = p_request_id;
    DELETE FROM public.request_status_history WHERE request_id = p_request_id;
    DELETE FROM public.request_preferences WHERE request_id = p_request_id;
    DELETE FROM public.merchant_quotes WHERE request_id = p_request_id;

    -- Delete Parent Request
    DELETE FROM public.requests WHERE id = p_request_id;

    -- Finalize Backup and Audit
    UPDATE public.request_delete_backups 
    SET delete_confirmed = true, 
        delete_confirmed_at = now(),
        delete_notes = p_delete_notes,
        deleted_at = now(),
        deleted_by_staff_id = p_actor_staff_id
    WHERE id = p_backup_id;

    INSERT INTO public.request_deletion_audit (request_id, backup_id, event_type, actor_staff_id, notes)
    VALUES (p_request_id, p_backup_id, 'REQUEST_HARD_DELETED', p_actor_staff_id, p_delete_notes);

    RETURN true;
END;
$$;
