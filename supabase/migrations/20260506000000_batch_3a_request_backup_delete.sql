-- Batch 3A: Request Archive + Safe Delete + Backup Foundation
-- Created: 2026-05-06
-- Description: Adds backup and audit tables for request deletion and an atomic RPC for hard deletion.

-- 1. Backup Table (Detached from requests to survive deletion)
CREATE TABLE IF NOT EXISTS public.request_delete_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL, -- NO FK to public.requests
    request_code text NOT NULL,
    backup_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_staff_id uuid NOT NULL REFERENCES public.staff_members(id),
    delete_confirmed boolean NOT NULL DEFAULT false,
    delete_confirmed_at timestamptz,
    delete_notes text,
    deleted_at timestamptz
);

-- 2. Deletion Audit Table (Detached from requests, linked to backups)
CREATE TABLE IF NOT EXISTS public.request_deletion_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid, -- NO FK to public.requests
    backup_id uuid REFERENCES public.request_delete_backups(id),
    event_type text NOT NULL, -- e.g., 'BACKUP_CREATED', 'REQUEST_HARD_DELETED'
    actor_staff_id uuid REFERENCES public.staff_members(id),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.request_delete_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only Admins/Owners can see or manage backups/audit
CREATE POLICY "Admin/Owner Full Access Backups" ON public.request_delete_backups
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_members sm
            LEFT JOIN public.staff_member_roles smr ON sm.id = smr.staff_member_id
            WHERE sm.auth_user_id = auth.uid()
              AND (sm.staff_role IN ('admin', 'owner') OR smr.role_code IN ('admin', 'owner'))
              AND sm.is_active = true
        )
    );

CREATE POLICY "Admin/Owner Full Access Audit" ON public.request_deletion_audit
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_members sm
            LEFT JOIN public.staff_member_roles smr ON sm.id = smr.staff_member_id
            WHERE sm.auth_user_id = auth.uid()
              AND (sm.staff_role IN ('admin', 'owner') OR smr.role_code IN ('admin', 'owner'))
              AND sm.is_active = true
        )
    );

-- 4. Atomic Hard Delete RPC
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
    v_request_state text;
    v_backup_exists boolean;
    v_request_exists boolean;
    v_current_status text;
    v_reviewer_decision text;
    v_client_released_at timestamptz;
    v_is_archived boolean;
BEGIN
    -- 1. Security Check: Actor must be active Admin or Owner
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

    -- 2. Verification: Request exists and is in a SAFE state
    SELECT 
        current_status, 
        reviewer_decision, 
        is_archived,
        EXISTS(SELECT 1 FROM public.requests WHERE id = p_request_id)
    INTO v_current_status, v_reviewer_decision, v_is_archived, v_request_exists
    FROM public.requests 
    WHERE id = p_request_id;

    IF NOT v_request_exists THEN
        RAISE EXCEPTION 'BLOCK: Request % not found.', p_request_id;
    END IF;

    -- Resolve client_released_at from view if available, or just check the table if we can't access view easily
    -- For safety, we'll check terminal status directly
    -- SAFE: COMPLETED (closed or released), ARCHIVED (terminal), REJECTED
    -- BLOCKED: INTAKE, OPERATIONS, READY, etc.
    
    -- Check if it's terminal
    IF v_current_status NOT IN ('closed', 'rejected', 'cancelled') 
       AND NOT v_is_archived 
       AND COALESCE(v_reviewer_decision, '') != 'reject' THEN
        -- Additional check: maybe it was released?
        -- We'll assume if it's not one of these and not archived, it's potentially active.
        -- We'll perform a stricter check in the UI/DAL before calling this, but here is the final guard.
        -- For maximum safety, we only allow deletion if current_status is 'closed' or reviewer_decision is 'reject' or it is archived.
        IF NOT (v_is_archived OR v_current_status = 'closed' OR COALESCE(v_reviewer_decision, '') = 'reject') THEN
            RAISE EXCEPTION 'BLOCK: Request % is in an active state (%) and cannot be deleted.', p_request_id, v_current_status;
        END IF;
    END IF;

    -- 3. Verification: Confirmed Backup exists
    SELECT EXISTS (
        SELECT 1 FROM public.request_delete_backups 
        WHERE id = p_backup_id AND request_id = p_request_id
    ) INTO v_backup_exists;

    IF NOT v_backup_exists THEN
        RAISE EXCEPTION 'BLOCK: No confirmed backup found for request %. Backup must be created first.', p_request_id;
    END IF;

    -- 4. Atomic Deletion of Children in Order
    -- Tier 1 & 2 Children
    DELETE FROM public.report_option_snapshots WHERE request_id = p_request_id;
    DELETE FROM public.reports WHERE request_id = p_request_id;
    DELETE FROM public.request_candidate_shortlists WHERE request_id = p_request_id;
    
    -- research_items might be linked via research_run_id OR request_id
    DELETE FROM public.research_items WHERE request_id = p_request_id OR research_run_id IN (SELECT id FROM public.research_runs WHERE request_id = p_request_id);
    DELETE FROM public.research_runs WHERE request_id = p_request_id;
    
    DELETE FROM public.source_reveals WHERE request_id = p_request_id;
    DELETE FROM public.approvals WHERE request_id = p_request_id;
    DELETE FROM public.offers WHERE request_id = p_request_id;
    DELETE FROM public.payments WHERE request_id = p_request_id;
    DELETE FROM public.request_status_history WHERE request_id = p_request_id;
    DELETE FROM public.request_preferences WHERE request_id = p_request_id;
    DELETE FROM public.merchant_quotes WHERE request_id = p_request_id;

    -- 5. Delete Parent Request
    DELETE FROM public.requests WHERE id = p_request_id;

    -- 6. Finalize Backup and Audit
    UPDATE public.request_delete_backups 
    SET delete_confirmed = true, 
        delete_confirmed_at = now(),
        delete_notes = p_delete_notes,
        deleted_at = now()
    WHERE id = p_backup_id;

    INSERT INTO public.request_deletion_audit (request_id, backup_id, event_type, actor_staff_id, notes)
    VALUES (p_request_id, p_backup_id, 'REQUEST_HARD_DELETED', p_actor_staff_id, p_delete_notes);

    RETURN true;
END;
$$;
