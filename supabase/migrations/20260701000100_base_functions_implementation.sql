-- =============================================================================
-- FINDORA — Overwrite stub functions and views with real remote implementations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_ensure_request_operational_state(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_state_id uuid;
begin
  select s.id
  into v_state_id
  from public.request_operational_states s
  where s.request_id = p_request_id;

  if v_state_id is not null then
    return v_state_id;
  end if;

  insert into public.request_operational_states (
    request_id,
    operational_stage,
    stage_status,
    approved_for_processing,
    needs_manual_review,
    report_ready,
    latest_note
  )
  values (
    p_request_id,
    'intake',
    'pending',
    false,
    false,
    exists (
      select 1
      from public.report_option_snapshots ros
      where ros.request_id = p_request_id
    ),
    'Initialized automatically'
  )
  returning id into v_state_id;

  insert into public.request_workflow_events (
    request_id,
    actor_user_id,
    event_type,
    stage_before,
    status_before,
    stage_after,
    status_after,
    note,
    metadata
  )
  values (
    p_request_id,
    auth.uid(),
    'state_initialized',
    null,
    null,
    'intake',
    'pending',
    'Operational state initialized automatically',
    '{}'::jsonb
  );

  return v_state_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_set_request_operational_stage(p_request_id uuid, p_operational_stage text, p_stage_status text, p_note text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid, p_needs_manual_review boolean DEFAULT NULL::boolean, p_approved_for_processing boolean DEFAULT NULL::boolean, p_report_ready boolean DEFAULT NULL::boolean)
 RETURNS TABLE(request_id uuid, operational_stage text, stage_status text, approved_for_processing boolean, needs_manual_review boolean, report_ready boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_state_before text;
  v_status_before text;
  v_actor uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  perform public.fn_ensure_request_operational_state(p_request_id);

  select
    s.operational_stage,
    s.stage_status
  into
    v_state_before,
    v_status_before
  from public.request_operational_states s
  where s.request_id = p_request_id;

  update public.request_operational_states s
  set operational_stage = p_operational_stage,
      stage_status = p_stage_status,
      needs_manual_review = coalesce(p_needs_manual_review, s.needs_manual_review),
      approved_for_processing = coalesce(p_approved_for_processing, s.approved_for_processing),
      report_ready = coalesce(p_report_ready, s.report_ready),
      latest_note = coalesce(p_note, s.latest_note),
      updated_at = now()
  where s.request_id = p_request_id;

  insert into public.request_workflow_events (
    request_id,
    actor_user_id,
    event_type,
    stage_before,
    status_before,
    stage_after,
    status_after,
    note,
    metadata
  )
  values (
    p_request_id,
    v_actor,
    'stage_changed',
    v_state_before,
    v_status_before,
    p_operational_stage,
    p_stage_status,
    p_note,
    jsonb_build_object(
      'needs_manual_review', p_needs_manual_review,
      'approved_for_processing', p_approved_for_processing,
      'report_ready', p_report_ready
    )
  );

  return query
  select
    s.request_id,
    s.operational_stage,
    s.stage_status,
    s.approved_for_processing,
    s.needs_manual_review,
    s.report_ready
  from public.request_operational_states s
  where s.request_id = p_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_claim_agent_job(p_job_id uuid, p_actor_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(job_id uuid, request_id uuid, job_type text, status text, assigned_to_user_id uuid, started_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  if not public.fn_is_staff(v_actor) then
    raise exception 'Only active staff can claim jobs';
  end if;

  update public.agent_jobs j
  set assigned_to_user_id = v_actor,
      status = 'running',
      started_at = coalesce(j.started_at, now()),
      updated_at = now()
  where j.id = p_job_id
    and j.status = 'queued'
    and (j.assigned_to_user_id is null or j.assigned_to_user_id = v_actor);

  if not found then
    raise exception 'Job not claimable (maybe already running, completed, or assigned)';
  end if;

  insert into public.agent_job_logs (
    job_id,
    log_level,
    message,
    payload
  )
  values (
    p_job_id,
    'info',
    'Job claimed and started',
    jsonb_build_object('actor_user_id', v_actor)
  );

  return query
  select
    j.id,
    j.request_id,
    j.job_type,
    j.status,
    j.assigned_to_user_id,
    j.started_at
  from public.agent_jobs j
  where j.id = p_job_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_release_request_to_customer(p_request_id uuid, p_note text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(request_id uuid, notify_job_created boolean, operational_stage text, stage_status text, client_released_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_snapshot_count integer;
  v_actor uuid;
  v_job_created boolean := false;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  select count(*)
  into v_snapshot_count
  from public.report_option_snapshots ros
  where ros.request_id = p_request_id;

  if coalesce(v_snapshot_count, 0) = 0 then
    raise exception 'Cannot release request % to customer because no report snapshots exist', p_request_id;
  end if;

  perform public.fn_set_request_operational_stage(
    p_request_id,
    'client_ready',
    'completed',
    coalesce(p_note, 'Released to customer'),
    v_actor,
    false,
    true,
    true
  );

  update public.request_operational_states s
  set client_released_at = now(),
      updated_at = now()
  where s.request_id = p_request_id;

  insert into public.agent_jobs (
    request_id,
    job_type,
    status,
    priority,
    assigned_to_user_id,
    input_payload,
    output_payload,
    output_summary
  )
  select
    p_request_id,
    'notify_customer',
    'queued',
    9,
    null,
    jsonb_build_object('release_mode', 'manual_release'),
    '{}'::jsonb,
    null
  where not exists (
    select 1
    from public.agent_jobs j
    where j.request_id = p_request_id
      and j.job_type = 'notify_customer'
      and j.status in ('queued','running','waiting_approval')
  );

  v_job_created := found;

  insert into public.request_workflow_events (
    request_id,
    actor_user_id,
    event_type,
    stage_before,
    status_before,
    stage_after,
    status_after,
    note,
    metadata
  )
  values (
    p_request_id,
    v_actor,
    'released_to_customer',
    'report_review',
    'waiting_approval',
    'client_ready',
    'completed',
    coalesce(p_note, 'Released to customer'),
    jsonb_build_object(
      'snapshot_count', v_snapshot_count,
      'notify_job_created', v_job_created
    )
  );

  return query
  select
    p_request_id,
    v_job_created,
    s.operational_stage,
    s.stage_status,
    s.client_released_at
  from public.request_operational_states s
  where s.request_id = p_request_id;
end;
$function$;

-- ─── 24. RECREATE PAYMENTS VIEW ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.payments AS
 SELECT id,
    request_id,
    customer_id,
    intent_type AS payment_type,
    amount,
    currency_code,
        CASE
            WHEN (status = 'confirmed'::text) THEN 'confirmed'::text
            WHEN (status = 'rejected'::text) THEN 'rejected'::text
            WHEN (status = 'cancelled'::text) THEN 'cancelled'::text
            ELSE 'pending'::text
        END AS payment_status,
        CASE
            WHEN (status = 'confirmed'::text) THEN 'completed'::text
            ELSE status
        END AS status,
    provider AS payment_method,
    provider_reference AS external_reference,
    confirmed_by_staff_id AS confirmed_by,
    confirmed_at,
    amount AS amount_egp,
    created_at,
    updated_at
   FROM public.payment_intents;
