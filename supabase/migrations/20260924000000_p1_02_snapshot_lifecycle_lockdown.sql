-- 1. FK Hardening: Change report_option_unlocks_snapshot_id_fkey action to ON DELETE RESTRICT
-- 2. Lock Hierarchy: Enforce requests -> request_operational_states -> children in sync, prepare, and unlock RPCs
-- 3. Release Guards: Reject sync/prepare on released requests; reject unlock on unreleased requests
-- 4. GDPR Hard Delete: Explicitly delete report_option_unlocks prior to report_option_snapshots
-- 5. Permission Hardening: Revoke anon/public execution; grant internal staging and admin functions to service_role only; preserve authenticated customer self-service unlock

-- ============================================================================
-- 1. FK HARDENING: snapshot -> unlock ON DELETE RESTRICT
-- ============================================================================

ALTER TABLE ONLY "public"."report_option_unlocks"
    DROP CONSTRAINT IF EXISTS "report_option_unlocks_snapshot_id_fkey";

ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_snapshot_id_fkey"
    FOREIGN KEY ("report_option_snapshot_id")
    REFERENCES "public"."report_option_snapshots"("id")
    ON DELETE RESTRICT;

-- ============================================================================
-- 2. HARDEN fn_sync_report_option_snapshots
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_sync_report_option_snapshots"(
    "p_report_id" "uuid",
    "p_max_options" integer DEFAULT 3
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
  v_client_released_at timestamp with time zone;
  v_inserted integer := 0;
begin
  -- Resolve parent request
  select r.request_id
  into v_request_id
  from public.reports r
  where r.id = p_report_id;

  if v_request_id is null then
    raise exception 'Report % not found or has no request_id', p_report_id;
  end if;

  -- Lock 1: Parent request (Canonical Lock Hierarchy Step 1)
  perform 1
  from public.requests req
  where req.id = v_request_id
  for update;

  if not found then
    raise exception 'Parent request % not found for report %', v_request_id, p_report_id;
  end if;

  -- Lock 2: Request operational state (Canonical Lock Hierarchy Step 2)
  select ros.client_released_at
  into v_client_released_at
  from public.request_operational_states ros
  where ros.request_id = v_request_id
  for update;

  if not found then
    raise exception 'Request operational state for request % not found', v_request_id;
  end if;

  -- Guard: Released request cannot be re-synced / snapshots overwritten
  if v_client_released_at is not null then
    raise exception 'Cannot sync snapshots: request % report has already been released to customer (released at %)', v_request_id, v_client_released_at;
  end if;

  -- Guard: Existing customer unlocks must never be deleted/orphaned
  if exists (
    select 1
    from public.report_option_unlocks rou
    where rou.request_id = v_request_id
       or rou.report_option_snapshot_id in (
         select ros.id
         from public.report_option_snapshots ros
         where ros.report_id = p_report_id
       )
  ) then
    raise exception 'Cannot sync snapshots: customer unlocks already exist for request % / report %', v_request_id, p_report_id;
  end if;

  -- Pre-release staging snapshot synchronization
  delete from public.report_option_snapshots
  where report_id = p_report_id;

  insert into public.report_option_snapshots (
    report_id,
    request_id,
    shortlist_id,
    offer_id,
    display_rank,
    candidate_channel,
    display_title,
    display_brand,
    display_model,
    display_specs_summary,
    display_price_amount,
    currency_code,
    availability_status,
    warranty_info,
    trust_score,
    value_score,
    final_score,
    highlight_summary,
    customer_summary,
    reveal_locked,
    reveal_kind,
    hidden_reference_url,
    hidden_merchant_name,
    hidden_merchant_location,
    hidden_contact_notes
  )
  select
    p_report_id,
    s.request_id,
    s.shortlist_id,
    s.published_offer_id,
    s.ranking_position,
    s.candidate_channel,
    s.product_title,
    s.product_brand,
    s.product_model,
    s.product_specs_summary,
    s.price_amount,
    s.currency_code,
    s.availability_status,
    s.warranty_info,
    s.effective_trust_score,
    s.effective_value_score,
    s.effective_final_score,
    s.reason_summary,
    s.customer_summary,
    s.reveal_locked,
    case
      when s.candidate_channel = 'online' and s.reference_url is not null then 'online_url'
      when s.candidate_channel = 'offline' and s.merchant_name is not null then 'merchant_contact'
      else 'none'
    end as reveal_kind,
    s.reference_url,
    s.merchant_name,
    case
      when s.merchant_city is not null and s.merchant_area is not null then s.merchant_city || ' - ' || s.merchant_area
      when s.merchant_city is not null then s.merchant_city
      when s.merchant_area is not null then s.merchant_area
      else null
    end as hidden_merchant_location,
    s.contact_notes
  from public.v_request_shortlist_detailed s
  where s.request_id = v_request_id
    and s.is_active = true
  order by s.ranking_position, s.shortlist_created_at, s.shortlist_id
  limit greatest(coalesce(p_max_options, 3), 1);

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

ALTER FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) IS 'Snapshots the current active shortlist into customer-facing report_option_snapshots for one report. Enforces requests -> request_operational_states locking and release/unlock guards.';

REVOKE ALL ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) TO "service_role";

-- ============================================================================
-- 3. HARDEN fn_prepare_request_client_bundle
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_prepare_request_client_bundle"(
    "p_request_id" "uuid",
    "p_report_id" "uuid",
    "p_max_options" integer DEFAULT 3,
    "p_note" "text" DEFAULT NULL::"text",
    "p_actor_user_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS TABLE("request_id" "uuid", "published_offers" integer, "snapshot_count" integer, "operational_stage" "text", "stage_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_published_count integer := 0;
  v_snapshot_count integer := 0;
  v_actor uuid;
  v_client_released_at timestamp with time zone;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  -- Lock 1: Parent request (Canonical Lock Hierarchy Step 1)
  perform 1
  from public.requests req
  where req.id = p_request_id
  for update;

  if not found then
    raise exception 'Request % not found', p_request_id;
  end if;

  -- Validate request-report relationship
  if not exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and r.request_id = p_request_id
  ) then
    raise exception 'Report % does not belong to request %', p_report_id, p_request_id;
  end if;

  -- Lock 2: Request operational state (Canonical Lock Hierarchy Step 2)
  select ros.client_released_at
  into v_client_released_at
  from public.request_operational_states ros
  where ros.request_id = p_request_id
  for update;

  if not found then
    raise exception 'Request operational state for request % not found', p_request_id;
  end if;

  -- Guard: Already released request cannot prepare/resync bundle
  if v_client_released_at is not null then
    raise exception 'Cannot prepare client bundle: request % report has already been released to customer (released at %)', p_request_id, v_client_released_at;
  end if;

  select count(*)
  into v_published_count
  from public.fn_publish_request_shortlist_to_offers(p_request_id);

  select public.fn_sync_report_option_snapshots(
    p_report_id,
    greatest(coalesce(p_max_options, 3), 1)
  )
  into v_snapshot_count;

  perform public.fn_set_request_operational_stage(
    p_request_id,
    'report_review',
    'waiting_approval',
    coalesce(p_note, 'Client bundle prepared and waiting approval'),
    v_actor,
    false,
    true,
    true
  );

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
    'bundle_prepared',
    'reporting',
    'in_progress',
    'report_review',
    'waiting_approval',
    coalesce(p_note, 'Client bundle prepared'),
    jsonb_build_object(
      'published_offers', v_published_count,
      'snapshot_count', v_snapshot_count,
      'report_id', p_report_id,
      'max_options', p_max_options
    )
  );

  return query
  select
    p_request_id,
    v_published_count,
    v_snapshot_count,
    s.operational_stage,
    s.stage_status
  from public.request_operational_states s
  where s.request_id = p_request_id;
end;
$$;

ALTER FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") IS 'Publishes active shortlist to offers, snapshots them into one report, and moves request into report_review / waiting_approval. Enforces requests -> request_operational_states locking and unreleased guard.';

REVOKE ALL ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") TO "service_role";

-- ============================================================================
-- 4. HARDEN fn_unlock_report_option (Customer Self-Service)
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_unlock_report_option"(
    "p_report_option_snapshot_id" "uuid"
) RETURNS TABLE("unlock_status" "text", "report_option_snapshot_id" "uuid", "customer_id" "uuid", "request_id" "uuid", "reveals_remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_customer_id uuid;
  v_request_id uuid;
  v_subscription_id uuid;
  v_monthly_limit integer;
  v_used integer;
  v_remaining integer;
  v_can_reveal boolean;
  v_already_unlocked boolean;
  v_client_released_at timestamp with time zone;
begin
  -- Resolve snapshot and verify customer ownership via auth.uid()
  select
    c.id,
    ros.request_id
  into
    v_customer_id,
    v_request_id
  from public.report_option_snapshots ros
  join public.requests r
    on r.id = ros.request_id
  join public.customers c
    on c.id = r.customer_id
  where ros.id = p_report_option_snapshot_id
    and c.auth_user_id = auth.uid();

  if v_customer_id is null then
    raise exception 'Snapshot not found for current authenticated customer';
  end if;

  -- Lock 1: Parent request (Canonical Lock Hierarchy Step 1)
  perform 1
  from public.requests req
  where req.id = v_request_id
  for update;

  if not found then
    raise exception 'Parent request % not found', v_request_id;
  end if;

  -- Lock 2: Request operational state (Canonical Lock Hierarchy Step 2)
  select ros.client_released_at
  into v_client_released_at
  from public.request_operational_states ros
  where ros.request_id = v_request_id
  for update;

  if not found then
    raise exception 'Request operational state for request % not found', v_request_id;
  end if;

  -- Guard: Only released reports can have options unlocked by customer
  if v_client_released_at is null then
    raise exception 'Cannot unlock report option: request % report has not been released to customer yet', v_request_id;
  end if;

  -- Idempotency check: Return existing state if already unlocked
  select exists (
    select 1
    from public.report_option_unlocks u
    where u.report_option_snapshot_id = p_report_option_snapshot_id
      and u.customer_id = v_customer_id
  )
  into v_already_unlocked;

  if v_already_unlocked then
    select
      a.subscription_id,
      a.monthly_reveal_limit,
      a.reveals_used,
      a.reveals_remaining,
      a.can_reveal
    into
      v_subscription_id,
      v_monthly_limit,
      v_used,
      v_remaining,
      v_can_reveal
    from public.fn_customer_reveal_allowance(v_customer_id) a;

    return query
    select
      'already_unlocked'::text,
      p_report_option_snapshot_id,
      v_customer_id,
      v_request_id,
      v_remaining;
    return;
  end if;

  -- Plan allowance verification
  select
    a.subscription_id,
    a.monthly_reveal_limit,
    a.reveals_used,
    a.reveals_remaining,
    a.can_reveal
  into
    v_subscription_id,
    v_monthly_limit,
    v_used,
    v_remaining,
    v_can_reveal
  from public.fn_customer_reveal_allowance(v_customer_id) a;

  if not coalesce(v_can_reveal, false) then
    raise exception 'Reveal limit reached for current billing cycle';
  end if;

  -- Insert persistent unlock entitlement record
  insert into public.report_option_unlocks (
    report_option_snapshot_id,
    request_id,
    customer_id,
    subscription_id,
    unlocked_by_user_id,
    unlock_type
  )
  values (
    p_report_option_snapshot_id,
    v_request_id,
    v_customer_id,
    v_subscription_id,
    auth.uid(),
    'self_service'
  );

  -- Log usage event
  insert into public.usage_events (
    customer_id,
    subscription_id,
    request_id,
    event_type,
    quantity,
    occurred_at,
    metadata
  )
  values (
    v_customer_id,
    v_subscription_id,
    v_request_id,
    'unlock_used',
    1,
    now(),
    jsonb_build_object(
      'report_option_snapshot_id', p_report_option_snapshot_id
    )
  );

  -- Reveal option snapshot
  update public.report_option_snapshots
  set reveal_locked = false,
      updated_at = now()
  where id = p_report_option_snapshot_id;

  select
    a.reveals_remaining
  into v_remaining
  from public.fn_customer_reveal_allowance(v_customer_id) a;

  return query
  select
    'unlocked'::text,
    p_report_option_snapshot_id,
    v_customer_id,
    v_request_id,
    v_remaining;
end;
$$;

ALTER FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") IS 'Unlocks one report option snapshot for the current authenticated customer. Enforces requests -> request_operational_states locking and client_released_at check.';

REVOKE ALL ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") TO "authenticated", "service_role";

-- ============================================================================
-- 5. HARDEN fn_admin_unlock_report_option
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."fn_admin_unlock_report_option"(
    "p_report_option_snapshot_id" "uuid",
    "p_actor_staff_id" "uuid",
    "p_note" "text" DEFAULT NULL::"text"
) RETURNS TABLE("unlock_status" "text", "report_option_snapshot_id" "uuid", "customer_id" "uuid", "request_id" "uuid", "reveals_remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
  v_customer_id uuid;
  v_actor_user_id uuid;
  v_unlock_id uuid;
  v_remaining integer;
  v_client_released_at timestamp with time zone;
begin
  -- Validate active staff member
  select s.auth_user_id
  into v_actor_user_id
  from public.staff_members s
  where s.id = p_actor_staff_id
    and s.is_active = true;

  if v_actor_user_id is null then
    raise exception 'Active staff member not found or missing auth_user_id: %', p_actor_staff_id;
  end if;

  -- Resolve snapshot / request / customer
  select
    ros.request_id,
    r.customer_id
  into
    v_request_id,
    v_customer_id
  from public.report_option_snapshots ros
  join public.requests r
    on r.id = ros.request_id
  where ros.id = p_report_option_snapshot_id;

  if v_request_id is null or v_customer_id is null then
    raise exception 'Snapshot or customer not found for snapshot: %', p_report_option_snapshot_id;
  end if;

  -- Lock 1: Parent request (Canonical Lock Hierarchy Step 1)
  perform 1
  from public.requests req
  where req.id = v_request_id
  for update;

  if not found then
    raise exception 'Parent request % not found', v_request_id;
  end if;

  -- Lock 2: Request operational state (Canonical Lock Hierarchy Step 2)
  select ros.client_released_at
  into v_client_released_at
  from public.request_operational_states ros
  where ros.request_id = v_request_id
  for update;

  if not found then
    raise exception 'Request operational state for request % not found', v_request_id;
  end if;

  -- Guard: Only released reports can have options unlocked
  if v_client_released_at is null then
    raise exception 'Cannot unlock report option: request % report has not been released to customer yet', v_request_id;
  end if;

  -- Idempotent unlock insert or update
  select rou.id
  into v_unlock_id
  from public.report_option_unlocks rou
  where rou.report_option_snapshot_id = p_report_option_snapshot_id
    and rou.customer_id = v_customer_id
  limit 1;

  if v_unlock_id is null then
    insert into public.report_option_unlocks (
      report_option_snapshot_id,
      request_id,
      customer_id,
      subscription_id,
      unlocked_by_user_id,
      unlock_type
    )
    values (
      p_report_option_snapshot_id,
      v_request_id,
      v_customer_id,
      null,
      v_actor_user_id,
      'admin'
    )
    returning id into v_unlock_id;
  else
    update public.report_option_unlocks rou
    set unlocked_by_user_id = v_actor_user_id
    where rou.id = v_unlock_id;
  end if;

  update public.report_option_snapshots ros
  set
    reveal_locked = false,
    updated_at = now()
  where ros.id = p_report_option_snapshot_id;

  select count(*)
  into v_remaining
  from public.report_option_snapshots ros
  where ros.request_id = v_request_id
    and coalesce(ros.reveal_locked, true) = true;

  insert into public.request_admin_actions (
    request_id,
    action_type,
    action_reason,
    actor_staff_id,
    before_status,
    after_status,
    payload
  )
  values (
    v_request_id,
    'admin_unlock_snapshot',
    coalesce(p_note, 'Admin unlock report option'),
    p_actor_staff_id,
    null,
    null,
    jsonb_build_object(
      'report_option_snapshot_id', p_report_option_snapshot_id,
      'unlock_id', v_unlock_id,
      'customer_id', v_customer_id
    )
  );

  return query
  select
    case when v_unlock_id is not null then 'unlocked' else 'unchanged' end,
    p_report_option_snapshot_id,
    v_customer_id,
    v_request_id,
    coalesce(v_remaining, 0);
end;
$$;

ALTER FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") IS 'Administrative unlock for report option snapshots. Enforces requests -> request_operational_states locking and client_released_at check.';

REVOKE ALL ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "service_role";

-- ============================================================================
-- 6. HARDEN fn_hard_delete_request_with_backup (GDPR Hard Delete Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_hard_delete_request_with_backup(
    p_request_id uuid,
    p_backup_id uuid,
    p_actor_staff_id uuid,
    p_delete_notes text DEFAULT NULL::text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
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

    -- Atomic Deletion of Children in strict foreign key order
    -- Explicitly delete unlocks BEFORE snapshots to respect ON DELETE RESTRICT
    DELETE FROM public.report_option_unlocks WHERE request_id = p_request_id;
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

ALTER FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") IS 'Administrative hard delete with prior backup verification. Explicitly removes report_option_unlocks before report_option_snapshots to satisfy ON DELETE RESTRICT.';

REVOKE ALL ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") TO "service_role";
