-- BATCH 2B STEP 2: SLA CLASSIFICATION & METRICS
-- Purpose: Monitor active work stages against provisional SLA thresholds.

-- 1. SLA MONITORING VIEW
CREATE OR REPLACE VIEW public.v_request_sla_monitoring AS
WITH active_clocks AS (
    SELECT 
        c.*,
        COALESCE(p.urgency_level, 'normal') AS urgency_level
    FROM public.v_request_stage_clock c
    LEFT JOIN public.request_preferences p ON p.request_id = c.request_id
    WHERE c.is_active_work = true 
      AND c.current_stage_entered_at IS NOT NULL
),
threshold_policy AS (
    SELECT 
        *,
        -- Provisional Batch 2B Step 2 policy awaiting final business approval
        CASE 
            WHEN urgency_level = 'urgent' THEN 12.0
            ELSE 24.0
        END AS sla_warning_threshold_hours,
        CASE 
            WHEN urgency_level = 'urgent' THEN 24.0
            ELSE 48.0
        END AS sla_breach_threshold_hours
    FROM active_clocks
)
SELECT 
    *,
    -- Deterministic sorting: Positive = time remaining, Negative = time since breach
    (sla_breach_threshold_hours - stage_age_hours) AS time_to_breach_hours,
    CASE 
        WHEN stage_age_hours >= sla_breach_threshold_hours THEN 'breached'
        WHEN stage_age_hours >= sla_warning_threshold_hours THEN 'warning'
        ELSE 'on_time'
    END AS sla_status
FROM threshold_policy;


-- 2. QUEUE PERFORMANCE METRICS
CREATE OR REPLACE VIEW public.v_queue_performance_metrics AS
SELECT 
    current_stage_code,
    sla_status,
    COUNT(*) AS request_count,
    AVG(stage_age_hours) AS avg_stage_age_hours
FROM public.v_request_sla_monitoring
GROUP BY current_stage_code, sla_status;
