-- 1. HARDENED PREFLIGHT VERIFICATION
DO $$ 
BEGIN
    -- Table existence
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_status_history') THEN RAISE EXCEPTION 'Preflight Failed: Missing request_status_history'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_member_roles') THEN RAISE EXCEPTION 'Preflight Failed: Missing staff_member_roles'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN RAISE EXCEPTION 'Preflight Failed: Missing jobs'; END IF;

    -- Function existence
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_claim_agent_job') THEN RAISE EXCEPTION 'Preflight Failed: Missing fn_claim_agent_job'; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_release_request_to_customer') THEN RAISE EXCEPTION 'Preflight Failed: Missing fn_release_request_to_customer'; END IF;

    -- Column existence (Critical for v7 logic)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'request_status_history' AND column_name = 'change_reason') THEN RAISE EXCEPTION 'Preflight Failed: Missing history.change_reason'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'request_status_history' AND column_name = 'created_at') THEN RAISE EXCEPTION 'Preflight Failed: Missing history.created_at'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'request_kind') THEN RAISE EXCEPTION 'Preflight Failed: Missing requests.request_kind'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_to_user_id') THEN RAISE EXCEPTION 'Preflight Failed: Missing jobs.assigned_to_user_id'; END IF;
END $$;

-- 2. Table Extensions (Idempotent)
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS operations_entered_at TIMESTAMPTZ;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reporting_entered_at TIMESTAMPTZ;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ready_entered_at TIMESTAMPTZ;

ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS from_canonical_state TEXT;
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS to_canonical_state TEXT;
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS transition_name TEXT;
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS changed_by_staff_id UUID REFERENCES public.staff_members(id);
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS event_source TEXT DEFAULT 'staff_action';
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Deterministic Index (Restored)
DROP INDEX IF EXISTS idx_request_history_deterministic_v7;
CREATE INDEX idx_request_history_deterministic_v7 
ON public.request_status_history (request_id, created_at ASC, event_source ASC, id ASC);

-- 4. Canonical State Resolver Helper
CREATE OR REPLACE FUNCTION public.fn_resolve_canonical_state(
    p_is_archived BOOLEAN,
    p_current_status TEXT,
    p_reviewer_decision TEXT,
    p_client_released_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    IF p_is_archived THEN RETURN 'ARCHIVED'; END IF;
    IF p_current_status = 'closed' OR (p_client_released_at IS NOT NULL AND p_current_status != 'closed') THEN RETURN 'COMPLETED'; END IF;
    IF p_current_status = 'client_ready' AND p_client_released_at IS NULL THEN RETURN 'READY'; END IF;
    IF p_reviewer_decision IN ('reject', 'needs_clarification') THEN RETURN 'ISSUES'; END IF;
    IF p_reviewer_decision = 'approve' AND p_current_status IN ('in_progress', 'research', 'reporting') THEN RETURN 'OPERATIONS'; END IF;
    IF p_reviewer_decision IS NULL AND p_current_status IN ('submitted', 'open') THEN RETURN 'INTAKE'; END IF;
    RETURN 'UNKNOWN';
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Guarded Atomic Transition Engine (v7)
CREATE OR REPLACE FUNCTION public.fn_execute_request_transition(
    p_transition_name TEXT,
    p_request_id UUID,
    p_actor_staff_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_staff RECORD;
    v_prefs RECORD;
    v_from_status TEXT;
    v_from_canonical TEXT;
    v_to_status TEXT;
    v_to_canonical TEXT;
    v_client_released_at TIMESTAMPTZ;
    v_is_admin BOOLEAN;
    v_can_review BOOLEAN;
    v_can_research BOOLEAN;
    v_can_field BOOLEAN;
    v_can_report BOOLEAN;
    v_owns_job BOOLEAN;
    v_job_id UUID;
    v_job_owner_id UUID;
    v_target_job_type TEXT;
BEGIN
    -- Load Context
    SELECT r.*, v.client_released_at INTO v_req FROM public.requests r LEFT JOIN public.v_request_ui_status v ON v.request_id = r.id WHERE r.id = p_request_id FOR UPDATE OF r;
    IF NOT FOUND THEN RAISE EXCEPTION 'BLOCK: Request not found.'; END IF;
    SELECT s.* INTO v_staff FROM public.staff_members s WHERE s.id = p_actor_staff_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'BLOCK: Actor not found.'; END IF;
    SELECT p.* INTO v_prefs FROM public.request_preferences p WHERE p.request_id = p_request_id;

    v_from_status := v_req.current_status;
    v_client_released_at := v_req.client_released_at;
    v_from_canonical := public.fn_resolve_canonical_state(v_req.is_archived, v_from_status, v_req.reviewer_decision, v_client_released_at);

    -- Permissions
    v_is_admin := v_staff.staff_role = 'admin' OR v_staff.staff_role = 'owner';
    v_can_review := v_is_admin OR v_staff.staff_role = 'reviewer' OR v_staff.can_approve_requests = true OR EXISTS (SELECT 1 FROM public.staff_member_roles WHERE staff_member_id = p_actor_staff_id AND role_code = 'reviewer' AND is_active = true);
    v_can_research := v_is_admin OR v_staff.staff_role = 'researcher' OR EXISTS (SELECT 1 FROM public.staff_member_roles WHERE staff_member_id = p_actor_staff_id AND role_code = 'researcher' AND is_active = true);
    v_can_field := v_is_admin OR v_staff.staff_role = 'field_agent' OR EXISTS (SELECT 1 FROM public.staff_member_roles WHERE staff_member_id = p_actor_staff_id AND role_code = 'field_agent' AND is_active = true);
    v_can_report := v_is_admin OR v_staff.staff_role = 'reporter' OR EXISTS (SELECT 1 FROM public.staff_member_roles WHERE staff_member_id = p_actor_staff_id AND role_code = 'reporter' AND is_active = true);

    -- Global Status Guards
    IF v_from_canonical = 'ARCHIVED' THEN RAISE EXCEPTION 'BLOCK: Cannot mutate an archived request.'; END IF;
    IF v_from_canonical = 'UNKNOWN' THEN RAISE EXCEPTION 'BLOCK: Cannot execute transition on a request in UNKNOWN state.'; END IF;

    CASE p_transition_name
        WHEN 'APPROVE_INTAKE' THEN
            IF v_from_canonical != 'INTAKE' THEN RAISE EXCEPTION 'BLOCK: Not in INTAKE.'; END IF;
            IF NOT v_can_review THEN RAISE EXCEPTION 'BLOCK: Reviewer role required.'; END IF;
            IF NOT v_is_admin AND v_req.assigned_reviewer_staff_id != p_actor_staff_id THEN RAISE EXCEPTION 'BLOCK: Not assigned to actor.'; END IF;
            IF v_req.request_kind IS NULL THEN RAISE EXCEPTION 'BLOCK: Request kind required.'; END IF;
            UPDATE public.requests SET reviewer_decision = 'approve', current_status = 'in_progress', accepted_at = NOW(), operations_entered_at = NOW(), reviewer_decided_at = NOW(), reviewer_decided_by_staff_id = p_actor_staff_id, reviewer_notes = COALESCE(p_notes, reviewer_notes) WHERE id = p_request_id;

        WHEN 'REJECT_INTAKE' THEN
            IF v_from_canonical != 'INTAKE' THEN RAISE EXCEPTION 'BLOCK: Not in INTAKE.'; END IF;
            IF NOT v_can_review THEN RAISE EXCEPTION 'BLOCK: Reviewer role required.'; END IF;
            IF NOT v_is_admin AND v_req.assigned_reviewer_staff_id != p_actor_staff_id THEN RAISE EXCEPTION 'BLOCK: Not assigned to actor.'; END IF;
            IF p_notes IS NULL THEN RAISE EXCEPTION 'BLOCK: Notes required.'; END IF;
            UPDATE public.requests SET reviewer_decision = 'reject', rejected_at = NOW(), reviewer_decided_at = NOW(), reviewer_decided_by_staff_id = p_actor_staff_id, reviewer_notes = p_notes WHERE id = p_request_id;

        WHEN 'CLARIFY_INTAKE' THEN
            IF v_from_canonical != 'INTAKE' THEN RAISE EXCEPTION 'BLOCK: Not in INTAKE.'; END IF;
            IF NOT v_can_review THEN RAISE EXCEPTION 'BLOCK: Reviewer role required.'; END IF;
            IF NOT v_is_admin AND v_req.assigned_reviewer_staff_id != p_actor_staff_id THEN RAISE EXCEPTION 'BLOCK: Not assigned to actor.'; END IF;
            IF p_notes IS NULL THEN RAISE EXCEPTION 'BLOCK: Notes required.'; END IF;
            UPDATE public.requests SET reviewer_decision = 'needs_clarification', clarification_requested_at = NOW(), reviewer_decided_at = NOW(), reviewer_decided_by_staff_id = p_actor_staff_id, reviewer_notes = p_notes WHERE id = p_request_id;

        WHEN 'RESOLVE_ISSUE' THEN
            IF v_from_canonical != 'ISSUES' THEN RAISE EXCEPTION 'BLOCK: Not in ISSUES.'; END IF;
            IF NOT v_can_review THEN RAISE EXCEPTION 'BLOCK: Reviewer role required.'; END IF;
            IF v_req.reviewer_decision != 'needs_clarification' THEN RAISE EXCEPTION 'BLOCK: Can only resolve clarification.'; END IF;
            UPDATE public.requests SET reviewer_decision = NULL, current_status = 'submitted' WHERE id = p_request_id;

        WHEN 'START_RESEARCH', 'START_FIELD_WORK' THEN
            IF v_from_canonical != 'OPERATIONS' THEN RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.'; END IF;
            IF v_from_status != 'in_progress' THEN RAISE EXCEPTION 'BLOCK: Progress locked.'; END IF;
            IF p_transition_name = 'START_RESEARCH' AND NOT v_can_research THEN RAISE EXCEPTION 'BLOCK: Researcher role required.'; END IF;
            IF p_transition_name = 'START_FIELD_WORK' AND NOT v_can_field THEN RAISE EXCEPTION 'BLOCK: Field Agent role required.'; END IF;

            v_target_job_type := CASE WHEN p_transition_name = 'START_RESEARCH' THEN 'online_research' ELSE 'offline_sourcing' END;
            SELECT id, assigned_to_user_id INTO v_job_id, v_job_owner_id FROM public.jobs WHERE request_id = p_request_id AND job_type = v_target_job_type AND status IN ('queued', 'pending', 'unassigned', 'claimed', 'running') ORDER BY created_at ASC, id ASC LIMIT 1;
            IF v_job_id IS NOT NULL THEN
                IF v_job_owner_id IS NOT NULL AND v_job_owner_id != v_staff.auth_user_id AND NOT v_is_admin THEN RAISE EXCEPTION 'BLOCK: Claimed by another.'; END IF;
                IF v_job_owner_id IS NULL OR v_job_owner_id != v_staff.auth_user_id THEN PERFORM public.fn_claim_agent_job(p_job_id := v_job_id, p_actor_user_id := v_staff.auth_user_id); END IF;
            ELSIF NOT v_is_admin THEN RAISE EXCEPTION 'BLOCK: No active job.'; END IF;
            UPDATE public.requests SET current_status = 'research' WHERE id = p_request_id;

        WHEN 'MOVE_TO_REPORTING' THEN
            IF v_from_canonical != 'OPERATIONS' THEN RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.'; END IF;
            IF v_from_status != 'research' THEN RAISE EXCEPTION 'BLOCK: Not in research.'; END IF;
            IF NOT (v_can_research OR v_can_field) THEN RAISE EXCEPTION 'BLOCK: Operational role required.'; END IF;
            v_owns_job := EXISTS (SELECT 1 FROM public.jobs WHERE request_id = p_request_id AND assigned_to_user_id = v_staff.auth_user_id AND status IN ('claimed', 'running'));
            IF NOT v_is_admin AND NOT v_owns_job THEN RAISE EXCEPTION 'BLOCK: Ownership required.'; END IF;
            UPDATE public.requests SET current_status = 'reporting', reporting_entered_at = NOW() WHERE id = p_request_id;

        WHEN 'SIGNAL_READY' THEN
            IF v_from_canonical != 'OPERATIONS' THEN RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.'; END IF;
            IF v_from_status != 'reporting' THEN RAISE EXCEPTION 'BLOCK: Not in reporting status.'; END IF;
            IF NOT (v_is_admin OR v_can_report) THEN RAISE EXCEPTION 'BLOCK: Admin or Reporter role required.'; END IF;
            IF NOT EXISTS (SELECT 1 FROM public.request_candidate_shortlists WHERE request_id = p_request_id) THEN RAISE EXCEPTION 'BLOCK: Shortlist empty.'; END IF;
            IF v_prefs.search_scope IN ('offline_only', 'online_and_offline') AND NOT EXISTS (SELECT 1 FROM public.merchant_quotes WHERE request_id = p_request_id AND is_active = true) THEN RAISE EXCEPTION 'BLOCK: Offline scope requires merchant quote.'; END IF;
            IF v_req.request_kind IS NULL OR v_prefs.urgency_level IS NULL THEN RAISE EXCEPTION 'BLOCK: Metadata missing.'; END IF;

            UPDATE public.requests SET current_status = 'client_ready', ready_entered_at = NOW() WHERE id = p_request_id;

        WHEN 'REVERT_TO_OPS' THEN
            IF v_from_canonical != 'READY' THEN RAISE EXCEPTION 'BLOCK: Not in READY.'; END IF;
            IF NOT v_is_admin AND NOT v_can_report THEN RAISE EXCEPTION 'BLOCK: Admin or Reporter required.'; END IF;
            -- RESET SLA MARKER FOR REPORTING STAGE
            UPDATE public.requests SET current_status = 'reporting', reporting_entered_at = NOW() WHERE id = p_request_id;

        WHEN 'RELEASE_FINAL' THEN
            IF v_from_canonical != 'READY' THEN RAISE EXCEPTION 'BLOCK: Not in READY.'; END IF;
            IF NOT (v_is_admin OR v_can_report) THEN RAISE EXCEPTION 'BLOCK: Admin or Reporter required.'; END IF;
            PERFORM public.fn_release_request_to_customer(p_request_id := p_request_id, p_note := p_notes, p_actor_user_id := v_staff.auth_user_id);
            SELECT v.client_released_at INTO v_client_released_at FROM public.v_request_ui_status v WHERE v.request_id = p_request_id;

        ELSE RAISE EXCEPTION 'BLOCK: Unsupported transition: %', p_transition_name;
    END CASE;

    -- History Write
    SELECT current_status, reviewer_decision, is_archived INTO v_to_status, v_req.reviewer_decision, v_req.is_archived FROM public.requests WHERE id = p_request_id;
    v_to_canonical := public.fn_resolve_canonical_state(v_req.is_archived, v_to_status, v_req.reviewer_decision, v_client_released_at);
    INSERT INTO public.request_status_history (request_id, from_status, to_status, from_canonical_state, to_canonical_state, transition_name, changed_by_staff_id, change_reason, metadata)
    VALUES (p_request_id, v_from_status, v_to_status, v_from_canonical, v_to_canonical, p_transition_name, p_actor_staff_id, p_notes, p_metadata);

    RETURN jsonb_build_object('success', true, 'from_canonical', v_from_canonical, 'to_canonical', v_to_canonical);
END;
$$ LANGUAGE plpgsql;

-- 6. Deterministic Timeline View
CREATE OR REPLACE VIEW public.v_request_timeline AS
WITH unified_events AS (
    SELECT id as event_id, request_id, transition_name, from_canonical_state, to_canonical_state, change_reason as notes, created_at as event_at, event_source, (SELECT full_name FROM public.staff_members WHERE id = changed_by_staff_id) as actor_name, metadata FROM public.request_status_history
    UNION ALL
    SELECT id as event_id, request_id, 'RESEARCH_RUN_START' as transition_name, NULL, NULL, run_kind, started_at, 'system', NULL, jsonb_build_object('run_id', id) FROM public.research_runs WHERE started_at IS NOT NULL
    UNION ALL
    SELECT id as event_id, request_id, 'RESEARCH_RUN_FINISH' as transition_name, NULL, NULL, status, finished_at, 'system', NULL, jsonb_build_object('run_id', id, 'results', results_count) FROM public.research_runs WHERE finished_at IS NOT NULL
)
SELECT * FROM unified_events ORDER BY event_at ASC, event_source ASC, event_id ASC;
