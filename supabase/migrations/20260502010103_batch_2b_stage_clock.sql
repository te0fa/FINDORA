-- BATCH 2B STEP 1: STAGE CLOCK FOUNDATION
-- Purpose: Real-time, decision-aware tracking of operational stages.

CREATE OR REPLACE VIEW public.v_request_stage_clock AS
WITH stage_entry AS (
    SELECT 
        r.id AS request_id,
        r.request_code,
        r.current_status,
        r.reviewer_decision,
        r.is_archived,
        r.created_at,
        r.operations_entered_at,
        r.reporting_entered_at,
        r.ready_entered_at,
        r.clarification_requested_at,
        r.rejected_at,
        v.client_released_at,
        public.fn_resolve_canonical_state(r.is_archived, r.current_status, r.reviewer_decision, v.client_released_at) AS canonical_state
    FROM public.requests r
    LEFT JOIN public.v_request_ui_status v ON v.request_id = r.id
),
stage_mapping AS (
    SELECT 
        se.*,
        CASE 
            WHEN se.canonical_state = 'INTAKE' THEN 'intake'
            WHEN se.canonical_state = 'ISSUES' THEN 'issues'
            WHEN se.canonical_state = 'OPERATIONS' AND se.current_status = 'in_progress' THEN 'in_progress'
            WHEN se.canonical_state = 'OPERATIONS' AND se.current_status = 'research' THEN 'research'
            WHEN se.canonical_state = 'OPERATIONS' AND se.current_status = 'reporting' THEN 'reporting'
            WHEN se.canonical_state = 'READY' THEN 'ready'
            WHEN se.canonical_state = 'COMPLETED' THEN 'completed'
            WHEN se.canonical_state = 'ARCHIVED' THEN 'archived'
            ELSE 'unknown'
        END AS current_stage_code
    FROM stage_entry se
),
clock_calculation AS (
    SELECT 
        sm.*,
        CASE 
            -- INTAKE Clock: Latest return-to-intake history row OR creation date fallback
            WHEN sm.current_stage_code = 'intake' THEN COALESCE((SELECT MAX(h_in.created_at) FROM public.request_status_history h_in WHERE h_in.request_id = sm.request_id AND h_in.to_canonical_state = 'INTAKE'), sm.created_at)
            
            -- ISSUES Clock: Decision-aware authoritative timestamps with history fallback
            WHEN sm.current_stage_code = 'issues' THEN 
                COALESCE(
                    CASE 
                        WHEN sm.reviewer_decision = 'needs_clarification' THEN sm.clarification_requested_at
                        WHEN sm.reviewer_decision = 'reject' THEN sm.rejected_at
                        ELSE NULL
                    END,
                    (SELECT MAX(h_iss.created_at) FROM public.request_status_history h_iss WHERE h_iss.request_id = sm.request_id AND h_iss.to_canonical_state = 'ISSUES')
                )

            WHEN sm.current_stage_code = 'in_progress' THEN sm.operations_entered_at
            
            -- RESEARCH Clock: Derived from history entry to research sub-status
            WHEN sm.current_stage_code = 'research' THEN (SELECT MAX(h_res.created_at) FROM public.request_status_history h_res WHERE h_res.request_id = sm.request_id AND h_res.to_status = 'research')
            
            WHEN sm.current_stage_code = 'reporting' THEN sm.reporting_entered_at
            WHEN sm.current_stage_code = 'ready' THEN sm.ready_entered_at
            WHEN sm.current_stage_code = 'completed' THEN sm.client_released_at
            ELSE NULL
        END AS current_stage_entered_at,
        
        (SELECT MAX(h_last.created_at) FROM public.request_status_history h_last WHERE h_last.request_id = sm.request_id) AS last_transition_at
    FROM stage_mapping sm
)
SELECT 
    request_id,
    request_code,
    canonical_state,
    current_status,
    current_stage_code,
    current_stage_entered_at,
    last_transition_at,
    -- Active Age: NULL for terminal states or missing entry markers
    CASE 
        WHEN canonical_state IN ('COMPLETED', 'ARCHIVED') OR current_stage_entered_at IS NULL THEN NULL 
        ELSE EXTRACT(EPOCH FROM (NOW() - current_stage_entered_at)) / 60 
    END AS stage_age_minutes,
    CASE 
        WHEN canonical_state IN ('COMPLETED', 'ARCHIVED') OR current_stage_entered_at IS NULL THEN NULL 
        ELSE EXTRACT(EPOCH FROM (NOW() - current_stage_entered_at)) / 3600 
    END AS stage_age_hours,
    CASE
        WHEN canonical_state IN ('INTAKE', 'ISSUES', 'OPERATIONS', 'READY') THEN true
        ELSE false
    END AS is_active_work
FROM clock_calculation;
