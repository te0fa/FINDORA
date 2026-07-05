


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_ip" character varying, "p_endpoint" character varying, "p_limit" integer, "p_window_seconds" integer) RETURNS TABLE("allowed" boolean, "current_count" integer, "reset_timestamp" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_count INT;
    v_earliest TIMESTAMPTZ;
BEGIN
    -- 1. Clean up old logs (older than 24 hours) to prevent bloat
    DELETE FROM public.rate_limit_logs 
    WHERE request_timestamp < v_now - INTERVAL '24 hours';

    -- 2. Count requests in the window
    SELECT COUNT(*)::INT INTO v_count
    FROM public.rate_limit_logs
    WHERE ip_address = p_ip
      AND endpoint = p_endpoint
      AND request_timestamp >= v_window_start;

    -- 3. If count is within limit, insert the new request log
    IF v_count < p_limit THEN
        INSERT INTO public.rate_limit_logs (ip_address, endpoint, request_timestamp)
        VALUES (p_ip, p_endpoint, v_now);
        v_count := v_count + 1;
        allowed := TRUE;
    ELSE
        allowed := FALSE;
    END IF;

    -- 4. Determine reset timestamp
    SELECT MIN(request_timestamp) INTO v_earliest
    FROM public.rate_limit_logs
    WHERE ip_address = p_ip
      AND endpoint = p_endpoint
      AND request_timestamp >= v_window_start;

    IF v_earliest IS NOT NULL THEN
        reset_timestamp := v_earliest + (p_window_seconds || ' seconds')::INTERVAL;
    ELSE
        reset_timestamp := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    END IF;

    current_count := v_count;
    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_ip" character varying, "p_endpoint" character varying, "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_trend"("pct_change" numeric) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF pct_change IS NULL THEN RETURN NULL; END IF;
  IF pct_change > 10  THEN RETURN 'fast_increase'; END IF;
  IF pct_change > 2   THEN RETURN 'slow_increase'; END IF;
  IF pct_change < -10 THEN RETURN 'fast_decline'; END IF;
  IF pct_change < -2  THEN RETURN 'slow_decline'; END IF;
  RETURN 'stable';
END;
$$;


ALTER FUNCTION "public"."classify_trend"("pct_change" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_all_price_trends"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  prod RECORD;
BEGIN
  FOR prod IN SELECT id FROM products WHERE is_active = true LOOP
    PERFORM compute_product_trend(prod.id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."compute_all_price_trends"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_product_trend"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current     NUMERIC;
  v_price_7d    NUMERIC;
  v_price_30d   NUMERIC;
  v_price_90d   NUMERIC;
  v_lowest      NUMERIC;
  v_highest     NUMERIC;
  v_average     NUMERIC;
  v_pct_7d      NUMERIC;
  v_pct_30d     NUMERIC;
  v_pct_90d     NUMERIC;
BEGIN
  -- Current price
  SELECT current_price INTO v_current FROM products WHERE id = p_product_id;

  -- Price N days ago (first record in that window)
  SELECT price INTO v_price_7d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '7 days'
  ORDER BY captured_at ASC LIMIT 1;

  SELECT price INTO v_price_30d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '30 days'
  ORDER BY captured_at ASC LIMIT 1;

  SELECT price INTO v_price_90d FROM price_history
  WHERE product_id = p_product_id AND captured_at >= NOW() - INTERVAL '90 days'
  ORDER BY captured_at ASC LIMIT 1;

  -- Aggregate stats from all-time history
  SELECT MIN(price), MAX(price), ROUND(AVG(price), 2)
  INTO v_lowest, v_highest, v_average
  FROM price_history WHERE product_id = p_product_id;

  -- % changes
  v_pct_7d  := CASE WHEN v_price_7d  IS NOT NULL AND v_price_7d  <> 0
                    THEN ROUND(((v_current - v_price_7d)  / v_price_7d)  * 100, 4) END;
  v_pct_30d := CASE WHEN v_price_30d IS NOT NULL AND v_price_30d <> 0
                    THEN ROUND(((v_current - v_price_30d) / v_price_30d) * 100, 4) END;
  v_pct_90d := CASE WHEN v_price_90d IS NOT NULL AND v_price_90d <> 0
                    THEN ROUND(((v_current - v_price_90d) / v_price_90d) * 100, 4) END;

  -- Upsert into price_trends
  INSERT INTO price_trends (
    product_id, trend_7d, trend_30d, trend_90d,
    pct_change_7d, pct_change_30d, pct_change_90d,
    lowest_price, highest_price, average_price,
    trend_score, computed_at
  )
  VALUES (
    p_product_id,
    classify_trend(v_pct_7d),
    classify_trend(v_pct_30d),
    classify_trend(v_pct_90d),
    v_pct_7d, v_pct_30d, v_pct_90d,
    v_lowest, v_highest, v_average,
    compute_trend_score(v_current, v_lowest, v_highest, v_pct_30d),
    NOW()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    trend_7d = EXCLUDED.trend_7d,
    trend_30d = EXCLUDED.trend_30d,
    trend_90d = EXCLUDED.trend_90d,
    pct_change_7d = EXCLUDED.pct_change_7d,
    pct_change_30d = EXCLUDED.pct_change_30d,
    pct_change_90d = EXCLUDED.pct_change_90d,
    lowest_price = EXCLUDED.lowest_price,
    highest_price = EXCLUDED.highest_price,
    average_price = EXCLUDED.average_price,
    trend_score = EXCLUDED.trend_score,
    computed_at = NOW();
END;
$$;


ALTER FUNCTION "public"."compute_product_trend"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_trend_score"("current_price" numeric, "lowest_price" numeric, "highest_price" numeric, "pct_30d" numeric) RETURNS smallint
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  price_score    NUMERIC;
  momentum_score NUMERIC;
BEGIN
  IF lowest_price IS NULL OR highest_price IS NULL OR highest_price = lowest_price
  THEN RETURN 50; END IF;

  -- Price position score (0-70): closer to low = higher score
  price_score := 70 * (1 - (current_price - lowest_price) / (highest_price - lowest_price));

  -- Momentum score (0-30): declining = good buying opportunity
  momentum_score := CASE
    WHEN pct_30d IS NULL THEN 15
    WHEN pct_30d < -10   THEN 30
    WHEN pct_30d < -5    THEN 22
    WHEN pct_30d < 0     THEN 17
    WHEN pct_30d < 5     THEN 12
    ELSE 5
  END;

  RETURN LEAST(100, GREATEST(0, ROUND(price_score + momentum_score)));
END;
$$;


ALTER FUNCTION "public"."compute_trend_score"("current_price" numeric, "lowest_price" numeric, "highest_price" numeric, "pct_30d" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_approve_report"("p_report_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("report_id" "uuid", "request_id" "uuid", "report_status" "text", "approved_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_request_id uuid;
  v_approved_at timestamptz;
  v_prev_status text;
begin
  if not exists (
    select 1
    from public.staff_members s
    where s.id = p_actor_staff_id
      and s.is_active = true
  ) then
    raise exception 'Active staff member not found: %', p_actor_staff_id;
  end if;

  select r.request_id, r.report_status
  into v_request_id, v_prev_status
  from public.reports r
  where r.id = p_report_id;

  if v_request_id is null then
    raise exception 'Report not found: %', p_report_id;
  end if;

  update public.reports r
  set
    report_status = 'approved',
    approved_at = now(),
    updated_at = now()
  where r.id = p_report_id
  returning r.approved_at into v_approved_at;

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
    'approve_report',
    coalesce(p_note, 'Admin approved report'),
    p_actor_staff_id,
    v_prev_status,
    'approved',
    jsonb_build_object(
      'report_id', p_report_id,
      'approved_at', v_approved_at
    )
  );

  return query
  select p_report_id, v_request_id, 'approved', v_approved_at;
end;
$$;


ALTER FUNCTION "public"."fn_admin_approve_report"("p_report_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_archive_request"("p_request_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "is_cancelled" boolean, "is_archived" boolean, "is_soft_deleted" boolean)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
begin
  select current_status
  into v_old_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  update public.requests
  set
    is_archived = true,
    archived_at = now(),
    archived_by_staff_id = p_actor_staff_id,
    archive_reason = p_reason
  where id = p_request_id;

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
    p_request_id,
    'archive',
    p_reason,
    p_actor_staff_id,
    v_old_status,
    v_old_status,
    '{}'::jsonb
  );

  return query
  select r.id, r.is_cancelled, r.is_archived, r.is_soft_deleted
  from public.requests r
  where r.id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."fn_admin_archive_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_cancel_request"("p_request_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "is_cancelled" boolean, "is_archived" boolean, "is_soft_deleted" boolean)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
begin
  select current_status
  into v_old_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  update public.requests
  set
    is_cancelled = true,
    cancelled_at = now(),
    cancelled_by_staff_id = p_actor_staff_id,
    cancellation_reason = p_reason
  where id = p_request_id;

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
    p_request_id,
    'cancel',
    p_reason,
    p_actor_staff_id,
    v_old_status,
    v_old_status,
    '{}'::jsonb
  );

  return query
  select r.id, r.is_cancelled, r.is_archived, r.is_soft_deleted
  from public.requests r
  where r.id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."fn_admin_cancel_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_restore_request"("p_request_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "is_cancelled" boolean, "is_archived" boolean, "is_soft_deleted" boolean)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
begin
  select current_status
  into v_old_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  update public.requests
  set
    is_cancelled = false,
    cancelled_at = null,
    cancelled_by_staff_id = null,
    cancellation_reason = null,
    is_archived = false,
    archived_at = null,
    archived_by_staff_id = null,
    archive_reason = null,
    is_soft_deleted = false,
    soft_deleted_at = null,
    soft_deleted_by_staff_id = null,
    soft_delete_reason = null
  where id = p_request_id;

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
    p_request_id,
    'restore',
    p_reason,
    p_actor_staff_id,
    v_old_status,
    v_old_status,
    '{}'::jsonb
  );

  return query
  select r.id, r.is_cancelled, r.is_archived, r.is_soft_deleted
  from public.requests r
  where r.id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."fn_admin_restore_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_set_customer_phone_verification"("p_customer_id" "uuid", "p_actor_staff_id" "uuid", "p_verified" boolean DEFAULT true, "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("customer_id" "uuid", "phone_number_normalized" "text", "phone_verified_at" timestamp with time zone, "contact_synced" boolean, "event_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_phone text;
  v_verified_at timestamptz;
  v_event_type text;
  v_staff_ok boolean;
begin
  select exists (
    select 1
    from public.staff_members s
    where s.id = p_actor_staff_id
      and s.is_active = true
  )
  into v_staff_ok;

  if coalesce(v_staff_ok, false) = false then
    raise exception 'Active staff member not found: %', p_actor_staff_id;
  end if;

  select coalesce(
    nullif(btrim(c.phone_number_normalized), ''),
    nullif(btrim(c.phone_number_raw), '')
  )
  into v_phone
  from public.customers c
  where c.id = p_customer_id
  for update;

  if v_phone is null then
    raise exception 'Customer % has no phone to verify/unverify', p_customer_id;
  end if;

  v_verified_at := case when p_verified then now() else null end;
  v_event_type := case when p_verified then 'admin_phone_verified' else 'admin_phone_unverified' end;

  update public.customers
  set
    phone_verified_at = v_verified_at,
    updated_at = now()
  where id = p_customer_id;

  update public.customer_contacts
  set
    is_primary = case when contact_value = v_phone then true else is_primary end,
    is_verified = case when contact_value = v_phone then p_verified else is_verified end,
    updated_at = now()
  where customer_id = p_customer_id
    and contact_type = 'phone';

  insert into public.customer_contacts (
    customer_id,
    contact_type,
    contact_value,
    is_primary,
    is_verified,
    notes,
    created_at,
    updated_at
  )
  values (
    p_customer_id,
    'phone',
    v_phone,
    true,
    p_verified,
    'Created by admin verification function',
    now(),
    now()
  )
  on conflict (customer_id, contact_type, contact_value)
  do update set
    is_primary = true,
    is_verified = excluded.is_verified,
    updated_at = now();

  insert into public.customer_verification_events (
    customer_id,
    contact_type,
    contact_value,
    event_type,
    actor_staff_id,
    note,
    metadata,
    created_at
  )
  values (
    p_customer_id,
    'phone',
    v_phone,
    v_event_type,
    p_actor_staff_id,
    p_note,
    jsonb_build_object(
      'verified', p_verified
    ),
    now()
  );

  return query
  select
    p_customer_id,
    v_phone,
    v_verified_at,
    true,
    v_event_type;
end;
$$;


ALTER FUNCTION "public"."fn_admin_set_customer_phone_verification"("p_customer_id" "uuid", "p_actor_staff_id" "uuid", "p_verified" boolean, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_soft_delete_request"("p_request_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "is_cancelled" boolean, "is_archived" boolean, "is_soft_deleted" boolean)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
begin
  select current_status
  into v_old_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  update public.requests
  set
    is_soft_deleted = true,
    soft_deleted_at = now(),
    soft_deleted_by_staff_id = p_actor_staff_id,
    soft_delete_reason = p_reason
  where id = p_request_id;

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
    p_request_id,
    'soft_delete',
    p_reason,
    p_actor_staff_id,
    v_old_status,
    v_old_status,
    '{}'::jsonb
  );

  return query
  select r.id, r.is_cancelled, r.is_archived, r.is_soft_deleted
  from public.requests r
  where r.id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."fn_admin_soft_delete_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("unlock_status" "text", "report_option_snapshot_id" "uuid", "customer_id" "uuid", "request_id" "uuid", "reveals_remaining" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_request_id uuid;
  v_customer_id uuid;
  v_actor_user_id uuid;
  v_unlock_id uuid;
  v_remaining integer;
begin
  select s.auth_user_id
  into v_actor_user_id
  from public.staff_members s
  where s.id = p_actor_staff_id
    and s.is_active = true;

  if v_actor_user_id is null then
    raise exception 'Active staff member not found or missing auth_user_id: %', p_actor_staff_id;
  end if;

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

  -- لو فيه unlock سابق لنفس العميل/السنابشوت هاته
  select rou.id
  into v_unlock_id
  from public.report_option_unlocks rou
  where rou.report_option_snapshot_id = p_report_option_snapshot_id
    and rou.customer_id = v_customer_id
  limit 1;

  -- لو مفيش، اعمل insert جديد
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


CREATE OR REPLACE FUNCTION "public"."fn_apply_request_compliance_decision"("p_request_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text", "p_summary" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid", "p_action_source" "text" DEFAULT 'system'::"text", "p_apply_to_request" boolean DEFAULT false, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("request_id" "uuid", "previous_status" "text", "new_status" "text", "applied_decision" "text", "needs_manual_review" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_prev_status text;
  v_new_status text;
  v_decision text;
  v_action_source text;
  v_needs_manual_review boolean := false;
begin
  v_decision := lower(coalesce(btrim(p_decision), 'clear'));
  if v_decision not in ('blocked','manual_review','warning_only','clear') then
    raise exception 'Invalid compliance decision: %', p_decision;
  end if;

  v_action_source := lower(coalesce(btrim(p_action_source), 'system'));
  if v_action_source not in ('system','staff','admin','migration','test') then
    v_action_source := 'system';
  end if;

  select r.current_status
  into v_prev_status
  from public.requests r
  where r.id = p_request_id
  for update;

  if v_prev_status is null then
    raise exception 'Request not found: %', p_request_id;
  end if;

  v_new_status := v_prev_status;

  if p_apply_to_request = true then
    if v_decision = 'blocked' then
      perform *
      from public.fn_review_request(
        p_request_id := p_request_id,
        p_decision := 'reject',
        p_note := coalesce(p_summary, p_reason, 'Blocked by compliance layer'),
        p_actor_staff_id := p_actor_staff_id,
        p_intake_ai_decision := null,
        p_intake_ai_confidence := null,
        p_intake_reason_code := null,
        p_intake_summary := null,
        p_intake_internal_reasoning := null,
        p_intake_clarification_questions := null
      );

      select r.current_status
      into v_new_status
      from public.requests r
      where r.id = p_request_id;

      v_needs_manual_review := false;

    elsif v_decision = 'manual_review' then
      perform public.fn_ensure_request_operational_state(p_request_id);

      update public.request_operational_states
      set
        operational_stage = 'intake',
        stage_status = 'waiting_approval',
        needs_manual_review = true,
        latest_note = coalesce(p_summary, p_reason, 'Compliance manual review'),
        updated_at = now()
      where request_id = p_request_id;

      v_new_status := v_prev_status;
      v_needs_manual_review := true;

    elsif v_decision = 'warning_only' then
      v_new_status := v_prev_status;
      v_needs_manual_review := false;

    else
      v_new_status := v_prev_status;
      v_needs_manual_review := false;
    end if;
  end if;

  insert into public.request_compliance_actions (
    request_id,
    recommended_decision,
    applied_decision,
    decision_reason,
    summary_text,
    actor_staff_id,
    action_source,
    metadata
  )
  values (
    p_request_id,
    v_decision,
    case when p_apply_to_request then v_decision else null end,
    p_reason,
    p_summary,
    p_actor_staff_id,
    v_action_source,
    coalesce(p_metadata, '{}'::jsonb)
  );

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
    p_request_id,
    case
      when v_decision = 'blocked' then 'compliance_blocked'
      when v_decision = 'manual_review' then 'compliance_manual_review'
      when v_decision = 'warning_only' then 'compliance_warning'
      else 'compliance_clear'
    end,
    coalesce(p_reason, p_summary, 'Compliance action'),
    p_actor_staff_id,
    v_prev_status,
    v_new_status,
    jsonb_build_object(
      'recommended_decision', v_decision,
      'applied_decision', case when p_apply_to_request then v_decision else null end,
      'apply_to_request', p_apply_to_request,
      'action_source', v_action_source,
      'needs_manual_review', v_needs_manual_review,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  );

  request_id := p_request_id;
  previous_status := v_prev_status;
  new_status := v_new_status;
  applied_decision := case when p_apply_to_request then v_decision else null end;
  needs_manual_review := v_needs_manual_review;

  return next;
end;
$$;


ALTER FUNCTION "public"."fn_apply_request_compliance_decision"("p_request_id" "uuid", "p_decision" "text", "p_reason" "text", "p_summary" "text", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_archive_request"("p_request_id" "uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count bigint;
begin
  update public.requests
  set
    is_archived = true,
    archived_at = now(),
    archived_by_user_id = p_actor_user_id,
    archive_reason = p_reason
  where id = p_request_id
    and coalesce(is_archived, false) = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."fn_archive_request"("p_request_id" "uuid", "p_actor_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "full_name" "text",
    "staff_role" "text" NOT NULL,
    "team_code" "text" DEFAULT 'operations'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "can_approve_requests" boolean DEFAULT false NOT NULL,
    "can_manage_merchants" boolean DEFAULT false NOT NULL,
    "can_view_financials" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    CONSTRAINT "staff_members_staff_role_check" CHECK (("staff_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'reviewer'::"text", 'researcher'::"text", 'field_agent'::"text", 'reporter'::"text", 'support'::"text"]))),
    CONSTRAINT "staff_members_team_code_check" CHECK (("team_code" = ANY (ARRAY['leadership'::"text", 'operations'::"text", 'online_research'::"text", 'offline_sourcing'::"text", 'reporting'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_assign_staff_member"("p_email" "text", "p_full_name" "text", "p_staff_role" "text", "p_team_code" "text", "p_is_active" boolean DEFAULT true, "p_can_approve_requests" boolean DEFAULT false, "p_can_manage_merchants" boolean DEFAULT false, "p_can_view_financials" boolean DEFAULT false) RETURNS "public"."staff_members"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_auth_user_id uuid;
  v_staff public.staff_members;
begin
  select id
  into v_auth_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_auth_user_id is null then
    raise exception 'Auth user not found for that email';
  end if;

  insert into public.staff_members (
    auth_user_id,
    full_name,
    staff_role,
    team_code,
    is_active,
    can_approve_requests,
    can_manage_merchants,
    can_view_financials
  )
  values (
    v_auth_user_id,
    p_full_name,
    p_staff_role,
    p_team_code,
    p_is_active,
    p_can_approve_requests,
    p_can_manage_merchants,
    p_can_view_financials
  )
  on conflict (auth_user_id)
  do update set
    full_name = excluded.full_name,
    staff_role = excluded.staff_role,
    team_code = excluded.team_code,
    is_active = excluded.is_active,
    can_approve_requests = excluded.can_approve_requests,
    can_manage_merchants = excluded.can_manage_merchants,
    can_view_financials = excluded.can_view_financials,
    updated_at = now()
  returning *
  into v_staff;

  return v_staff;
end;
$$;


ALTER FUNCTION "public"."fn_assign_staff_member"("p_email" "text", "p_full_name" "text", "p_staff_role" "text", "p_team_code" "text", "p_is_active" boolean, "p_can_approve_requests" boolean, "p_can_manage_merchants" boolean, "p_can_view_financials" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_block_column_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_col TEXT;
BEGIN
    v_col := TG_ARGV[0];
    -- Dynamically check if the specified column has changed
    -- Note: This requires the column name as the first argument in the trigger definition
    IF (OLD.id IS NOT NULL) THEN -- Basic safety
        -- We'll use specific triggers for specific columns for better performance and clarity
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_block_column_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_block_protected_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE EXCEPTION 'PROTECTED_TABLE_DELETE_BLOCKED: %', TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION "public"."fn_block_protected_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_block_protected_truncate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE EXCEPTION 'PROTECTED_TABLE_TRUNCATE_BLOCKED: %', TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION "public"."fn_block_protected_truncate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_can_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.fn_track_request_by_code_and_phone(p_request_code, p_phone_input)
  );
$$;


ALTER FUNCTION "public"."fn_can_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("job_id" "uuid", "request_id" "uuid", "job_type" "text", "status" "text", "assigned_to_user_id" "uuid", "started_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid") IS 'Claims a queued job for an active staff member and starts it immediately.';



CREATE OR REPLACE FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_output_summary" "text" DEFAULT NULL::"text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("job_id" "uuid", "request_id" "uuid", "job_type" "text", "status" "text", "finished_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid;
  v_assigned uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  if not public.fn_is_staff(v_actor) then
    raise exception 'Only active staff can complete jobs';
  end if;

  select j.assigned_to_user_id
  into v_assigned
  from public.agent_jobs j
  where j.id = p_job_id;

  if v_assigned is not null and v_assigned <> v_actor then
    raise exception 'Job is assigned to another staff member';
  end if;

  update public.agent_jobs j
  set status = 'completed',
      assigned_to_user_id = coalesce(j.assigned_to_user_id, v_actor),
      output_payload = coalesce(p_output_payload, '{}'::jsonb),
      output_summary = coalesce(p_output_summary, j.output_summary),
      started_at = coalesce(j.started_at, now()),
      finished_at = now(),
      error_message = null,
      updated_at = now()
  where j.id = p_job_id
    and j.status in ('queued', 'running', 'waiting_approval');

  if not found then
    raise exception 'Job cannot be completed from current status';
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
    'Job completed',
    jsonb_build_object(
      'actor_user_id', v_actor,
      'output_summary', p_output_summary
    )
  );

  perform public.fn_handle_request_job_handoff(p_job_id, v_actor);

  return query
  select
    j.id,
    j.request_id,
    j.job_type,
    j.status,
    j.finished_at
  from public.agent_jobs j
  where j.id = p_job_id;
end;
$$;


ALTER FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") IS 'Completes a job, writes outputs, and triggers request operational handoff if conditions are met.';



CREATE OR REPLACE FUNCTION "public"."fn_complete_research_run"("p_research_run_id" "uuid", "p_status" "text" DEFAULT 'completed'::"text", "p_summary" "text" DEFAULT NULL::"text") RETURNS TABLE("research_run_id" "uuid", "status" "text", "finished_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_finished_at timestamptz;
  v_status text;
begin
  v_status := case lower(coalesce(trim(p_status), ''))
    when 'queued' then 'queued'
    when 'running' then 'running'
    when 'completed' then 'completed'
    when 'failed' then 'failed'
    when 'cancelled' then 'cancelled'
    else 'completed'
  end;

  update public.research_runs rr
  set
    status = v_status,
    summary = coalesce(p_summary, rr.summary),
    finished_at = now(),
    updated_at = now()
  where rr.id = p_research_run_id
  returning rr.finished_at into v_finished_at;

  if v_finished_at is null then
    raise exception 'Research run not found: %', p_research_run_id;
  end if;

  return query
  select p_research_run_id, v_status, v_finished_at;
end;
$$;


ALTER FUNCTION "public"."fn_complete_research_run"("p_research_run_id" "uuid", "p_status" "text", "p_summary" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_compute_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_compute_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_contributors_auto_referral_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.fn_generate_referral_code();
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_contributors_auto_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_count_active_requests"() RETURNS bigint
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::bigint
  from public.requests
  where coalesce(is_archived, false) = false;
$$;


ALTER FUNCTION "public"."fn_count_active_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_research_run"("p_request_id" "uuid", "p_job_id" "uuid" DEFAULT NULL::"uuid", "p_run_kind" "text" DEFAULT 'online_research'::"text", "p_status" "text" DEFAULT 'running'::"text", "p_search_scope" "text" DEFAULT NULL::"text", "p_query_text" "text" DEFAULT NULL::"text", "p_summary" "text" DEFAULT NULL::"text") RETURNS TABLE("research_run_id" "uuid", "request_id" "uuid", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_research_run_id uuid;
  v_run_kind text;
  v_status text;
  v_search_scope text;
begin
  v_run_kind := case lower(coalesce(trim(p_run_kind), ''))
    when 'online_research' then 'online_search'
    when 'online_search' then 'online_search'
    when 'online_refresh' then 'online_refresh'
    when 'competitor_scan' then 'competitor_scan'
    else 'online_search'
  end;

  v_status := case lower(coalesce(trim(p_status), ''))
    when 'queued' then 'queued'
    when 'running' then 'running'
    when 'completed' then 'completed'
    when 'failed' then 'failed'
    when 'cancelled' then 'cancelled'
    else 'running'
  end;

  v_search_scope := case lower(coalesce(trim(p_search_scope), ''))
    when '' then 'all'
    when 'online_and_offline' then 'all'
    when 'all' then 'all'
    when 'marketplaces' then 'marketplaces'
    when 'retailers' then 'retailers'
    when 'brand_stores' then 'brand_stores'
    when 'other' then 'other'
    else 'other'
  end;

  insert into public.research_runs (
    request_id,
    job_id,
    run_kind,
    status,
    search_scope,
    query_text,
    summary,
    started_at
  )
  values (
    p_request_id,
    p_job_id,
    v_run_kind,
    v_status,
    v_search_scope,
    p_query_text,
    p_summary,
    now()
  )
  returning id into v_research_run_id;

  return query
  select v_research_run_id, p_request_id, v_status;
end;
$$;


ALTER FUNCTION "public"."fn_create_research_run"("p_request_id" "uuid", "p_job_id" "uuid", "p_run_kind" "text", "p_status" "text", "p_search_scope" "text", "p_query_text" "text", "p_summary" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_sourcing_request"("p_request_id" "uuid", "p_customer_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_product_name" "text", "p_category" "text", "p_target_location" "text", "p_max_price" numeric DEFAULT NULL::numeric, "p_additional_notes" "text" DEFAULT ''::"text", "p_request_code" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text", "p_raw_description" "text" DEFAULT ''::"text", "p_status" "text" DEFAULT 'open'::"text", "p_channel" "text" DEFAULT 'landing_page'::"text", "p_request_kind" "text" DEFAULT 'general'::"text", "p_intake_mode" "text" DEFAULT 'quick'::"text", "p_pricing_decision" "text" DEFAULT 'pending_review'::"text", "p_service_fee_amount" numeric DEFAULT 299, "p_execution_requested" boolean DEFAULT false, "p_followup_requested" boolean DEFAULT false, "p_site_visit_requested" boolean DEFAULT false, "p_reference_image_path" "text" DEFAULT NULL::"text", "p_preferences" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_request json;
BEGIN
    -- Insert into customer_requests
    INSERT INTO public.customer_requests (
        id, customer_id, customer_name, customer_phone,
        product_name, category, target_location, max_price,
        additional_notes, status
    ) VALUES (
        p_request_id, p_customer_id, p_customer_name, p_customer_phone,
        p_product_name, p_category, p_target_location, p_max_price,
        p_additional_notes, 'processing'
    );

    -- Insert into requests
    INSERT INTO public.requests (
        id, request_code, customer_id, title, raw_description,
        current_status, source_channel, request_kind, intake_mode,
        pricing_decision, service_fee_amount, execution_requested,
        followup_requested, site_visit_requested, reference_image_path
    ) VALUES (
        p_request_id, p_request_code, p_customer_id, p_title, p_raw_description,
        p_status, p_channel, p_request_kind, p_intake_mode,
        p_pricing_decision, p_service_fee_amount, p_execution_requested,
        p_followup_requested, p_site_visit_requested, p_reference_image_path
    ) RETURNING row_to_json(public.requests.*) INTO v_request;

    -- Insert preferences if provided
    IF p_preferences IS NOT NULL AND p_preferences <> '{}'::jsonb THEN
        INSERT INTO public.request_preferences (
            request_id, budget_min, budget_max, urgency_level, 
            preferred_brands, preferred_models, preferred_specs, 
            condition_preference, allow_alternatives, priority_focus, 
            search_scope, preferred_governorate, preferred_area, 
            delivery_needed, notes, knows_market_price
        ) VALUES (
            p_request_id,
            (p_preferences->>'budget_min')::numeric,
            (p_preferences->>'budget_max')::numeric,
            COALESCE(p_preferences->>'urgency_level', 'normal'),
            p_preferences->>'preferred_brands',
            p_preferences->>'preferred_models',
            p_preferences->>'preferred_specs',
            COALESCE(p_preferences->>'condition_preference', 'new'),
            COALESCE((p_preferences->>'allow_alternatives')::boolean, false),
            COALESCE(p_preferences->>'priority_focus', 'best_value'),
            COALESCE(p_preferences->>'search_scope', 'online_and_offline'),
            p_preferences->>'preferred_governorate',
            p_preferences->>'preferred_area',
            COALESCE((p_preferences->>'delivery_needed')::boolean, false),
            p_preferences->>'notes',
            COALESCE((p_preferences->>'knows_market_price')::boolean, false)
        ) ON CONFLICT (request_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'request', v_request);
END;
$$;


ALTER FUNCTION "public"."fn_create_sourcing_request"("p_request_id" "uuid", "p_customer_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_product_name" "text", "p_category" "text", "p_target_location" "text", "p_max_price" numeric, "p_additional_notes" "text", "p_request_code" "text", "p_title" "text", "p_raw_description" "text", "p_status" "text", "p_channel" "text", "p_request_kind" "text", "p_intake_mode" "text", "p_pricing_decision" "text", "p_service_fee_amount" numeric, "p_execution_requested" boolean, "p_followup_requested" boolean, "p_site_visit_requested" boolean, "p_reference_image_path" "text", "p_preferences" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") RETURNS TABLE("customer_id" "uuid", "subscription_id" "uuid", "plan_code" "text", "monthly_reveal_limit" integer, "reveals_used" integer, "reveals_remaining" integer, "can_reveal" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
with active_sub as (
  select
    cs.id as subscription_id,
    cs.customer_id,
    sp.plan_code,
    sp.monthly_reveal_limit
  from public.customer_subscriptions cs
  join public.subscription_plans sp
    on sp.id = cs.plan_id
  where cs.customer_id = p_customer_id
    and cs.status = 'active'
  order by cs.started_at desc, cs.id desc
  limit 1
),
fallback_free as (
  select
    null::uuid as subscription_id,
    p_customer_id as customer_id,
    sp.plan_code,
    sp.monthly_reveal_limit
  from public.subscription_plans sp
  where sp.plan_code = 'free'
  limit 1
),
resolved_plan as (
  select * from active_sub
  union all
  select * from fallback_free
  where not exists (select 1 from active_sub)
),
usage_cte as (
  select
    coalesce(v.reveals_used, 0)::integer as reveals_used
  from public.v_customer_current_cycle_usage v
  where v.customer_id = p_customer_id

  union all

  select 0
  where not exists (
    select 1 from public.v_customer_current_cycle_usage v
    where v.customer_id = p_customer_id
  )
)
select
  rp.customer_id,
  rp.subscription_id,
  rp.plan_code,
  rp.monthly_reveal_limit,
  (select max(u.reveals_used) from usage_cte u) as reveals_used,
  case
    when rp.monthly_reveal_limit is null then null
    else greatest(rp.monthly_reveal_limit - (select max(u.reveals_used) from usage_cte u), 0)
  end as reveals_remaining,
  case
    when rp.monthly_reveal_limit is null then true
    else ((select max(u.reveals_used) from usage_cte u) < rp.monthly_reveal_limit)
  end as can_reveal
from resolved_plan rp;
$$;


ALTER FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") IS 'Returns current-cycle reveal allowance for one customer based on active subscription or fallback free plan.';



CREATE OR REPLACE FUNCTION "public"."fn_distribute_network_revenue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_referrer_id uuid;
  v_grand_referrer_id uuid;
  v_l1_cut numeric;
  v_l2_cut numeric;
  v_l2_pct numeric := 0.05; -- 5% passive income for legend level
  v_referrer_level int;
BEGIN
  -- Only trigger on task_reward
  IF NEW.tx_type = 'task_reward' AND NEW.amount_egp > 0 THEN
    
    -- Find who referred this user
    SELECT referred_by_id INTO v_referrer_id 
    FROM public.contributors WHERE id = NEW.contributor_id;

    IF v_referrer_id IS NOT NULL THEN
      -- Does the referrer have the Legend badge (level 5)?
      SELECT level_number INTO v_referrer_level
      FROM public.contributor_levels cl
      JOIN public.contributors c ON c.active_referral_count >= cl.required_active_referrals
      WHERE c.id = v_referrer_id
      ORDER BY cl.level_number DESC LIMIT 1;

      -- If referrer is Legend (Level 5), they get L2 revenue share from their direct referrals' work
      IF v_referrer_level >= 5 THEN
        v_l1_cut := NEW.amount_egp * v_l2_pct;
        
        IF v_l1_cut > 0 THEN
          INSERT INTO public.wallet_transactions (contributor_id, wallet_id, tx_type, amount_egp, amount_points, reference_type, description_en, description_ar)
          SELECT v_referrer_id, id, 'network_revenue_share', v_l1_cut, 0, 'referral', 'L2 Passive Income from Network', 'أرباح سلبية من شبكة الإحالات'
          FROM public.contributor_wallets WHERE contributor_id = v_referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_distribute_network_revenue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ensure_default_request_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.request_preferences (
    request_id,
    allow_alternatives,
    condition_preference,
    urgency_level,
    knows_market_price,
    priority_focus,
    search_scope,
    delivery_needed,
    created_at,
    updated_at
  )
  values (
    new.id,
    true,
    'new',
    'normal',
    false,
    'best_value',
    'online_and_offline',
    false,
    now(),
    now()
  )
  on conflict (request_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_ensure_default_request_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") IS 'Ensures one operational state row exists for a request and returns its id.';



CREATE OR REPLACE FUNCTION "public"."fn_evaluate_request_compliance_from_hits"("p_request_id" "uuid", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid", "p_action_source" "text" DEFAULT 'system'::"text", "p_apply_to_request" boolean DEFAULT false) RETURNS TABLE("request_id" "uuid", "recommended_decision" "text", "total_hits" integer, "blocked_hits" integer, "manual_review_hits" integer, "warning_hits" integer, "matched_rule_codes" "text"[], "action_logged" boolean, "applied_to_request" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_total_hits integer := 0;
  v_blocked_hits integer := 0;
  v_manual_review_hits integer := 0;
  v_warning_hits integer := 0;
  v_matched_rule_codes text[] := '{}'::text[];
  v_recommended_decision text := 'clear';
  v_action_logged boolean := false;
begin
  if not exists (
    select 1
    from public.requests r
    where r.id = p_request_id
  ) then
    raise exception 'Request not found: %', p_request_id;
  end if;

  select
    count(*)::integer as total_hits,
    count(*) filter (where cr.decision_mode = 'blocked')::integer as blocked_hits,
    count(*) filter (where cr.decision_mode = 'manual_review')::integer as manual_review_hits,
    count(*) filter (where cr.decision_mode = 'warning_only')::integer as warning_hits,
    coalesce(array_agg(distinct cr.rule_code order by cr.rule_code), '{}'::text[]) as matched_rule_codes
  into
    v_total_hits,
    v_blocked_hits,
    v_manual_review_hits,
    v_warning_hits,
    v_matched_rule_codes
  from public.request_compliance_hits h
  join public.compliance_rules cr
    on cr.id = h.rule_id
  where h.request_id = p_request_id
    and cr.is_active = true;

  if v_blocked_hits > 0 then
    v_recommended_decision := 'blocked';
  elsif v_manual_review_hits > 0 then
    v_recommended_decision := 'manual_review';
  elsif v_warning_hits > 0 then
    v_recommended_decision := 'warning_only';
  else
    v_recommended_decision := 'clear';
  end if;

  perform *
  from public.fn_apply_request_compliance_decision(
    p_request_id := p_request_id,
    p_decision := v_recommended_decision,
    p_reason := case
      when v_recommended_decision = 'blocked' then 'Compliance evaluation detected blocked rules'
      when v_recommended_decision = 'manual_review' then 'Compliance evaluation requires manual review'
      when v_recommended_decision = 'warning_only' then 'Compliance evaluation produced warnings only'
      else 'Compliance evaluation found no active hits'
    end,
    p_summary := format(
      'Compliance evaluation: total=%s, blocked=%s, manual_review=%s, warning=%s, rules=%s',
      v_total_hits,
      v_blocked_hits,
      v_manual_review_hits,
      v_warning_hits,
      array_to_string(v_matched_rule_codes, ', ')
    ),
    p_actor_staff_id := p_actor_staff_id,
    p_action_source := p_action_source,
    p_apply_to_request := p_apply_to_request,
    p_metadata := jsonb_build_object(
      'total_hits', v_total_hits,
      'blocked_hits', v_blocked_hits,
      'manual_review_hits', v_manual_review_hits,
      'warning_hits', v_warning_hits,
      'matched_rule_codes', v_matched_rule_codes
    )
  );

  v_action_logged := true;

  request_id := p_request_id;
  recommended_decision := v_recommended_decision;
  total_hits := v_total_hits;
  blocked_hits := v_blocked_hits;
  manual_review_hits := v_manual_review_hits;
  warning_hits := v_warning_hits;
  matched_rule_codes := v_matched_rule_codes;
  action_logged := v_action_logged;
  applied_to_request := p_apply_to_request;

  return next;
end;
$$;


ALTER FUNCTION "public"."fn_evaluate_request_compliance_from_hits"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_execute_request_transition"("p_transition_name" "text", "p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
    -- Load Context + row lock for deterministic transition safety
    SELECT r.*, v.client_released_at
    INTO v_req
    FROM public.requests r
    LEFT JOIN public.v_request_ui_status v
        ON v.request_id = r.id
    WHERE r.id = p_request_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BLOCK: Request not found.';
    END IF;

    SELECT s.*
    INTO v_staff
    FROM public.staff_members s
    WHERE s.id = p_actor_staff_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BLOCK: Actor not found.';
    END IF;

    SELECT p.*
    INTO v_prefs
    FROM public.request_preferences p
    WHERE p.request_id = p_request_id;

    v_from_status := v_req.current_status;
    v_client_released_at := v_req.client_released_at;
    v_from_canonical := public.fn_resolve_canonical_state(
        v_req.is_archived,
        v_from_status,
        v_req.reviewer_decision,
        v_client_released_at
    );

    -- Permissions
    v_is_admin :=
        v_staff.staff_role IN ('admin', 'owner');

    v_can_review :=
        v_is_admin
        OR v_staff.staff_role = 'reviewer'
        OR v_staff.can_approve_requests = true
        OR EXISTS (
            SELECT 1
            FROM public.staff_member_roles
            WHERE staff_member_id = p_actor_staff_id
              AND role_code = 'reviewer'
              AND is_active = true
        );

    v_can_research :=
        v_is_admin
        OR v_staff.staff_role = 'researcher'
        OR EXISTS (
            SELECT 1
            FROM public.staff_member_roles
            WHERE staff_member_id = p_actor_staff_id
              AND role_code = 'researcher'
              AND is_active = true
        );

    v_can_field :=
        v_is_admin
        OR v_staff.staff_role = 'field_agent'
        OR EXISTS (
            SELECT 1
            FROM public.staff_member_roles
            WHERE staff_member_id = p_actor_staff_id
              AND role_code = 'field_agent'
              AND is_active = true
        );

    v_can_report :=
        v_is_admin
        OR v_staff.staff_role = 'reporter'
        OR EXISTS (
            SELECT 1
            FROM public.staff_member_roles
            WHERE staff_member_id = p_actor_staff_id
              AND role_code = 'reporter'
              AND is_active = true
        );

    -- Global status guards
    IF v_from_canonical = 'ARCHIVED' THEN
        RAISE EXCEPTION 'BLOCK: Cannot mutate an archived request.';
    END IF;

    IF v_from_canonical = 'UNKNOWN' THEN
        RAISE EXCEPTION 'BLOCK: Cannot execute transition on a request in UNKNOWN state.';
    END IF;

    CASE p_transition_name

        WHEN 'APPROVE_INTAKE' THEN
            IF v_from_canonical <> 'INTAKE' THEN
                RAISE EXCEPTION 'BLOCK: Not in INTAKE.';
            END IF;

            IF NOT v_can_review THEN
                RAISE EXCEPTION 'BLOCK: Reviewer role required.';
            END IF;

            IF NOT v_is_admin
               AND v_req.assigned_reviewer_staff_id <> p_actor_staff_id THEN
                RAISE EXCEPTION 'BLOCK: Not assigned to actor.';
            END IF;

            IF v_req.request_kind IS NULL THEN
                RAISE EXCEPTION 'BLOCK: Request kind required.';
            END IF;

            UPDATE public.requests
            SET reviewer_decision = 'approve',
                current_status = 'in_progress',
                accepted_at = NOW(),
                operations_entered_at = NOW(),
                reviewer_decided_at = NOW(),
                reviewer_decided_by_staff_id = p_actor_staff_id,
                reviewer_notes = COALESCE(p_notes, reviewer_notes)
            WHERE id = p_request_id;

        WHEN 'REJECT_INTAKE' THEN
            IF v_from_canonical <> 'INTAKE' THEN
                RAISE EXCEPTION 'BLOCK: Not in INTAKE.';
            END IF;

            IF NOT v_can_review THEN
                RAISE EXCEPTION 'BLOCK: Reviewer role required.';
            END IF;

            IF NOT v_is_admin
               AND v_req.assigned_reviewer_staff_id <> p_actor_staff_id THEN
                RAISE EXCEPTION 'BLOCK: Not assigned to actor.';
            END IF;

            IF p_notes IS NULL OR btrim(p_notes) = '' THEN
                RAISE EXCEPTION 'BLOCK: Notes required.';
            END IF;

            UPDATE public.requests
            SET reviewer_decision = 'reject',
                rejected_at = NOW(),
                reviewer_decided_at = NOW(),
                reviewer_decided_by_staff_id = p_actor_staff_id,
                reviewer_notes = p_notes
            WHERE id = p_request_id;

        WHEN 'CLARIFY_INTAKE' THEN
            IF v_from_canonical <> 'INTAKE' THEN
                RAISE EXCEPTION 'BLOCK: Not in INTAKE.';
            END IF;

            IF NOT v_can_review THEN
                RAISE EXCEPTION 'BLOCK: Reviewer role required.';
            END IF;

            IF NOT v_is_admin
               AND v_req.assigned_reviewer_staff_id <> p_actor_staff_id THEN
                RAISE EXCEPTION 'BLOCK: Not assigned to actor.';
            END IF;

            IF p_notes IS NULL OR btrim(p_notes) = '' THEN
                RAISE EXCEPTION 'BLOCK: Notes required.';
            END IF;

            UPDATE public.requests
            SET reviewer_decision = 'needs_clarification',
                clarification_requested_at = NOW(),
                reviewer_decided_at = NOW(),
                reviewer_decided_by_staff_id = p_actor_staff_id,
                reviewer_notes = p_notes
            WHERE id = p_request_id;

        WHEN 'RESOLVE_ISSUE' THEN
            IF v_from_canonical <> 'ISSUES' THEN
                RAISE EXCEPTION 'BLOCK: Not in ISSUES.';
            END IF;

            IF NOT v_can_review THEN
                RAISE EXCEPTION 'BLOCK: Reviewer role required.';
            END IF;

            IF v_req.reviewer_decision <> 'needs_clarification' THEN
                RAISE EXCEPTION 'BLOCK: Can only resolve clarification.';
            END IF;

            UPDATE public.requests
            SET reviewer_decision = NULL,
                current_status = 'submitted'
            WHERE id = p_request_id;

        WHEN 'START_RESEARCH', 'START_FIELD_WORK' THEN
            IF v_from_canonical <> 'OPERATIONS' THEN
                RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.';
            END IF;

            IF v_from_status <> 'in_progress' THEN
                RAISE EXCEPTION 'BLOCK: Progress locked.';
            END IF;

            IF p_transition_name = 'START_RESEARCH' AND NOT v_can_research THEN
                RAISE EXCEPTION 'BLOCK: Researcher role required.';
            END IF;

            IF p_transition_name = 'START_FIELD_WORK' AND NOT v_can_field THEN
                RAISE EXCEPTION 'BLOCK: Field Agent role required.';
            END IF;

            v_target_job_type :=
                CASE
                    WHEN p_transition_name = 'START_RESEARCH' THEN 'online_research'
                    ELSE 'offline_sourcing'
                END;

            SELECT job_id, assigned_to_user_id
            INTO v_job_id, v_job_owner_id
            FROM public.v_staff_job_queue
            WHERE request_id = p_request_id
              AND job_type = v_target_job_type
              AND status IN ('queued', 'pending', 'unassigned', 'claimed', 'running')
            ORDER BY created_at ASC, job_id ASC
            LIMIT 1;

            IF v_job_id IS NOT NULL THEN
                IF v_job_owner_id IS NOT NULL
                   AND v_job_owner_id <> v_staff.auth_user_id
                   AND NOT v_is_admin THEN
                    RAISE EXCEPTION 'BLOCK: Claimed by another.';
                END IF;

                IF v_job_owner_id IS NULL
                   OR v_job_owner_id <> v_staff.auth_user_id THEN
                    PERFORM public.fn_claim_agent_job(
                        p_job_id := v_job_id,
                        p_actor_user_id := v_staff.auth_user_id
                    );
                END IF;
            ELSIF NOT v_is_admin THEN
                RAISE EXCEPTION 'BLOCK: No active job.';
            END IF;

            UPDATE public.requests
            SET current_status = 'research'
            WHERE id = p_request_id;

        WHEN 'MOVE_TO_REPORTING' THEN
            IF v_from_canonical <> 'OPERATIONS' THEN
                RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.';
            END IF;

            IF v_from_status <> 'research' THEN
                RAISE EXCEPTION 'BLOCK: Not in research.';
            END IF;

            IF NOT (v_can_research OR v_can_field) THEN
                RAISE EXCEPTION 'BLOCK: Operational role required.';
            END IF;

            v_owns_job := EXISTS (
                SELECT 1
                FROM public.v_staff_job_queue
                WHERE request_id = p_request_id
                  AND assigned_to_user_id = v_staff.auth_user_id
                  AND status IN ('claimed', 'running')
            );

            IF NOT v_is_admin AND NOT v_owns_job THEN
                RAISE EXCEPTION 'BLOCK: Ownership required.';
            END IF;

            UPDATE public.requests
            SET current_status = 'reporting',
                reporting_entered_at = NOW()
            WHERE id = p_request_id;

        WHEN 'SIGNAL_READY' THEN
            IF v_from_canonical <> 'OPERATIONS' THEN
                RAISE EXCEPTION 'BLOCK: Not in OPERATIONS.';
            END IF;

            IF v_from_status <> 'reporting' THEN
                RAISE EXCEPTION 'BLOCK: Not in reporting status.';
            END IF;

            IF NOT (v_is_admin OR v_can_report) THEN
                RAISE EXCEPTION 'BLOCK: Admin or Reporter role required.';
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.request_candidate_shortlists
                WHERE request_id = p_request_id
            ) THEN
                RAISE EXCEPTION 'BLOCK: Shortlist empty.';
            END IF;

            IF v_prefs.search_scope IN ('offline_only', 'online_and_offline')
               AND NOT EXISTS (
                    SELECT 1
                    FROM public.merchant_quotes
                    WHERE request_id = p_request_id
                      AND is_active = true
               ) THEN
                RAISE EXCEPTION 'BLOCK: Offline scope requires merchant quote.';
            END IF;

            IF v_req.request_kind IS NULL OR v_prefs.urgency_level IS NULL THEN
                RAISE EXCEPTION 'BLOCK: Metadata missing.';
            END IF;

            UPDATE public.requests
            SET current_status = 'client_ready',
                ready_entered_at = NOW()
            WHERE id = p_request_id;

        WHEN 'REVERT_TO_OPS' THEN
            IF v_from_canonical <> 'READY' THEN
                RAISE EXCEPTION 'BLOCK: Not in READY.';
            END IF;

            IF NOT v_is_admin AND NOT v_can_report THEN
                RAISE EXCEPTION 'BLOCK: Admin or Reporter required.';
            END IF;

            UPDATE public.requests
            SET current_status = 'reporting',
                reporting_entered_at = NOW()
            WHERE id = p_request_id;

        WHEN 'RELEASE_FINAL' THEN
            IF v_from_canonical <> 'READY' THEN
                RAISE EXCEPTION 'BLOCK: Not in READY.';
            END IF;

            IF NOT (v_is_admin OR v_can_report) THEN
                RAISE EXCEPTION 'BLOCK: Admin or Reporter required.';
            END IF;

            PERFORM public.fn_release_request_to_customer(
                p_request_id := p_request_id,
                p_note := p_notes,
                p_actor_user_id := v_staff.auth_user_id
            );

            SELECT v.client_released_at
            INTO v_client_released_at
            FROM public.v_request_ui_status v
            WHERE v.request_id = p_request_id;

        ELSE
            RAISE EXCEPTION 'BLOCK: Unsupported transition: %', p_transition_name;
    END CASE;

    -- Final state + history write
    SELECT current_status, reviewer_decision, is_archived
    INTO v_to_status, v_req.reviewer_decision, v_req.is_archived
    FROM public.requests
    WHERE id = p_request_id;

    v_to_canonical := public.fn_resolve_canonical_state(
        v_req.is_archived,
        v_to_status,
        v_req.reviewer_decision,
        v_client_released_at
    );

    INSERT INTO public.request_status_history (
        request_id,
        from_status,
        to_status,
        from_canonical_state,
        to_canonical_state,
        transition_name,
        changed_by_staff_id,
        change_reason,
        metadata
    )
    VALUES (
        p_request_id,
        v_from_status,
        v_to_status,
        v_from_canonical,
        v_to_canonical,
        p_transition_name,
        p_actor_staff_id,
        p_notes,
        p_metadata
    );

    RETURN jsonb_build_object(
        'success', true,
        'from_canonical', v_from_canonical,
        'to_canonical', v_to_canonical
    );
END;
$$;


ALTER FUNCTION "public"."fn_execute_request_transition"("p_transition_name" "text", "p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_notes" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("job_id" "uuid", "request_id" "uuid", "job_type" "text", "status" "text", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid;
  v_request_id uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  if not public.fn_is_staff(v_actor) then
    raise exception 'Only active staff can fail jobs';
  end if;

  update public.agent_jobs j
  set status = 'failed',
      assigned_to_user_id = coalesce(j.assigned_to_user_id, v_actor),
      started_at = coalesce(j.started_at, now()),
      finished_at = now(),
      error_message = coalesce(p_error_message, 'Unknown error'),
      updated_at = now()
  where j.id = p_job_id
    and j.status in ('queued', 'running', 'waiting_approval');

  if not found then
    raise exception 'Job cannot be failed from current status';
  end if;

  insert into public.agent_job_logs (
    job_id,
    log_level,
    message,
    payload
  )
  values (
    p_job_id,
    'error',
    'Job failed',
    jsonb_build_object(
      'actor_user_id', v_actor,
      'error_message', p_error_message
    )
  );

  select j.request_id
  into v_request_id
  from public.agent_jobs j
  where j.id = p_job_id;

  if v_request_id is not null then
    perform public.fn_set_request_operational_stage(
      v_request_id,
      'research',
      'waiting_approval',
      'One or more jobs failed and need manual review',
      v_actor,
      true,
      true,
      false
    );
  end if;

  return query
  select
    j.id,
    j.request_id,
    j.job_type,
    j.status,
    j.error_message
  from public.agent_jobs j
  where j.id = p_job_id;
end;
$$;


ALTER FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid") IS 'Fails an active job, logs the error, and flags the parent request for manual review.';



CREATE OR REPLACE FUNCTION "public"."fn_feature_flags_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_feature_flags_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_generate_referral_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars        text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code         text;
  i            integer;
  attempt      integer := 0;
  max_attempts integer := 10;
  found_unique boolean := false;
BEGIN
  WHILE attempt < max_attempts AND NOT found_unique LOOP
    code := '';
    FOR i IN 1..10 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.contributors WHERE referral_code = code) THEN
      found_unique := true;
    ELSE
      attempt := attempt + 1;
    END IF;
  END LOOP;

  IF NOT found_unique THEN
    RAISE EXCEPTION 'Failed to generate a unique referral code after % attempts.', max_attempts;
  END IF;

  RETURN code;
END; $$;


ALTER FUNCTION "public"."fn_generate_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_financial_summary"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_income numeric(12, 2) := 0.00;
    v_expense numeric(12, 2) := 0.00;
BEGIN
    SELECT COALESCE(SUM(amount), 0.00) INTO v_income
    FROM public.financial_transactions
    WHERE type = 'INCOME';

    SELECT COALESCE(SUM(amount), 0.00) INTO v_expense
    FROM public.financial_transactions
    WHERE type = 'EXPENSE';

    RETURN jsonb_build_object(
        'income', v_income,
        'expense', v_expense,
        'profit', v_income - v_expense
    );
END;
$$;


ALTER FUNCTION "public"."fn_get_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_stabilizer_multiplier"() RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_latest record;
BEGIN
  SELECT multiplier_adjustment, stabilizer_status
  INTO v_latest
  FROM public.economy_stabilizer_snapshots
  ORDER BY snapshot_date DESC
  LIMIT 1;

  IF NOT FOUND OR v_latest.stabilizer_status = 'normal' THEN
    RETURN 1.0;
  END IF;

  RETURN v_latest.multiplier_adjustment;
END; $$;


ALTER FUNCTION "public"."fn_get_stabilizer_multiplier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_guard_ai_agent_configs_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.agent_code <> OLD.agent_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: ai_agent_configs.agent_code';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_guard_ai_agent_configs_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_guard_comm_templates_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.template_code <> OLD.template_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: communication_templates.template_code';
    END IF;
    IF NEW.language_code <> OLD.language_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: communication_templates.language_code';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_guard_comm_templates_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_guard_staff_members_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: staff_members.id';
    END IF;
    IF NEW.auth_user_id <> OLD.auth_user_id THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: staff_members.auth_user_id';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_guard_staff_members_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_guest_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_normalized" "text") RETURNS TABLE("request_id" "uuid", "request_code" "text", "title" "text", "current_status" "text", "customer_visible_status" "text", "pipeline_completion_pct" numeric, "request_created_at" timestamp with time zone, "request_updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    v.request_id,
    v.request_code,
    v.title,
    v.current_status,
    v.customer_visible_status,
    v.pipeline_completion_pct,
    v.request_created_at,
    v.request_updated_at
  from public.v_customer_request_portal_overview v
  join public.customers c
    on c.id = v.customer_id
  where v.request_code = p_request_code
    and c.phone_number_normalized = p_phone_normalized
  limit 1;
$$;


ALTER FUNCTION "public"."fn_guest_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_normalized" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
  v_job_type text;
  v_has_active_research boolean;
  v_has_candidates boolean;
  v_has_shortlist boolean;
  v_has_report boolean;
  v_actor uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  select j.request_id, j.job_type
  into v_request_id, v_job_type
  from public.agent_jobs j
  where j.id = p_job_id;

  if v_request_id is null then
    return;
  end if;

  if v_job_type in ('online_research', 'offline_sourcing') then
    select exists (
      select 1
      from public.agent_jobs j
      where j.request_id = v_request_id
        and j.job_type in ('online_research', 'offline_sourcing')
        and j.status in ('queued', 'running', 'waiting_approval')
    )
    into v_has_active_research;

    if not coalesce(v_has_active_research, false) then
      select exists (
        select 1
        from public.v_request_candidate_pool cp
        where cp.request_id = v_request_id
      )
      into v_has_candidates;

      if coalesce(v_has_candidates, false) then
        perform public.fn_set_request_operational_stage(
          v_request_id,
          'shortlisting',
          'in_progress',
          'Research completed; ready for shortlist selection',
          v_actor,
          false,
          true,
          false
        );
      end if;
    end if;
  elsif v_job_type in ('ranking', 'fusion') then
    select exists (
      select 1
      from public.request_candidate_shortlists s
      where s.request_id = v_request_id
        and s.is_active = true
    )
    into v_has_shortlist;

    if coalesce(v_has_shortlist, false) then
      perform public.fn_set_request_operational_stage(
        v_request_id,
        'reporting',
        'in_progress',
        'Shortlist exists; reporting/final packaging in progress',
        v_actor,
        false,
        true,
        false
      );
    end if;
  elsif v_job_type = 'client_report' then
    select exists (
      select 1
      from public.reports r
      where r.request_id = v_request_id
    )
    into v_has_report;

    if coalesce(v_has_report, false) then
      perform public.fn_set_request_operational_stage(
        v_request_id,
        'reporting',
        'in_progress',
        'Client report generated; waiting bundle preparation',
        v_actor,
        false,
        true,
        false
      );
    end if;
  elsif v_job_type = 'notify_customer' then
    perform public.fn_set_request_operational_stage(
      v_request_id,
      'closed',
      'completed',
      'Customer notified and request closed operationally',
      v_actor,
      false,
      true,
      true
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid") IS 'Internal helper that advances operational stage after job completion when conditions are met.';



CREATE OR REPLACE FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_init_contributor_wallet"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.contributor_wallets (contributor_id)
  VALUES (NEW.id)
  ON CONFLICT (contributor_id) DO NOTHING;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_init_contributor_wallet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_insert_research_item"("p_request_id" "uuid", "p_research_run_id" "uuid", "p_option_label" "text" DEFAULT NULL::"text", "p_source_name" "text" DEFAULT NULL::"text", "p_source_type" "text" DEFAULT NULL::"text", "p_listing_url" "text" DEFAULT NULL::"text", "p_product_title" "text" DEFAULT NULL::"text", "p_product_brand" "text" DEFAULT NULL::"text", "p_product_model" "text" DEFAULT NULL::"text", "p_product_specs_summary" "text" DEFAULT NULL::"text", "p_price_amount" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT NULL::"text", "p_availability_status" "text" DEFAULT NULL::"text", "p_seller_name" "text" DEFAULT NULL::"text", "p_seller_location" "text" DEFAULT NULL::"text", "p_warranty_info" "text" DEFAULT NULL::"text", "p_price_last_checked_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_price_change_note" "text" DEFAULT NULL::"text", "p_trust_score" numeric DEFAULT NULL::numeric, "p_value_score" numeric DEFAULT NULL::numeric, "p_fit_score" numeric DEFAULT NULL::numeric, "p_final_score" numeric DEFAULT NULL::numeric, "p_is_candidate" boolean DEFAULT false, "p_is_shortlisted" boolean DEFAULT false, "p_raw_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("research_item_id" "uuid", "request_id" "uuid", "research_run_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_research_item_id uuid;
  v_source_type text;
  v_availability_status text;
  v_currency_code text;
begin
  v_source_type := case lower(coalesce(trim(p_source_type), ''))
    when 'marketplace' then 'marketplace'
    when 'retailer' then 'retailer'
    when 'brand_store' then 'brand_store'
    when 'brand store' then 'brand_store'
    when 'online_store' then 'retailer'
    when 'online store' then 'retailer'
    when 'classifieds' then 'classifieds'
    when 'social' then 'social'
    when 'other' then 'other'
    when '' then 'other'
    else 'other'
  end;

  v_availability_status := case lower(coalesce(trim(p_availability_status), ''))
    when 'in_stock' then 'in_stock'
    when 'in stock' then 'in_stock'
    when 'limited' then 'limited'
    when 'limited_stock' then 'limited'
    when 'limited stock' then 'limited'
    when 'out_of_stock' then 'out_of_stock'
    when 'out of stock' then 'out_of_stock'
    when 'preorder' then 'preorder'
    when 'pre-order' then 'preorder'
    when 'unknown' then 'unknown'
    when '' then 'unknown'
    else 'unknown'
  end;

  v_currency_code := case
    when coalesce(trim(p_currency_code), '') = '' then 'EGP'
    else upper(trim(p_currency_code))
  end;

  insert into public.research_items (
    request_id,
    research_run_id,
    option_label,
    source_name,
    source_type,
    listing_url,
    product_title,
    product_brand,
    product_model,
    product_specs_summary,
    price_amount,
    currency_code,
    availability_status,
    seller_name,
    seller_location,
    warranty_info,
    price_last_checked_at,
    price_change_note,
    trust_score,
    value_score,
    fit_score,
    final_score,
    is_candidate,
    is_shortlisted,
    raw_payload
  )
  values (
    p_request_id,
    p_research_run_id,
    p_option_label,
    coalesce(p_source_name, 'Unknown Source'),
    v_source_type,
    p_listing_url,
    coalesce(p_product_title, 'Untitled Item'),
    p_product_brand,
    p_product_model,
    p_product_specs_summary,
    p_price_amount,
    v_currency_code,
    v_availability_status,
    p_seller_name,
    p_seller_location,
    p_warranty_info,
    p_price_last_checked_at,
    p_price_change_note,
    p_trust_score,
    p_value_score,
    p_fit_score,
    p_final_score,
    coalesce(p_is_candidate, true),
    coalesce(p_is_shortlisted, false),
    coalesce(p_raw_payload, '{}'::jsonb)
  )
  returning id into v_research_item_id;

  update public.research_runs
  set
    results_count = coalesce(results_count, 0) + 1,
    updated_at = now()
  where id = p_research_run_id;

  return query
  select v_research_item_id, p_request_id, p_research_run_id;
end;
$$;


ALTER FUNCTION "public"."fn_insert_research_item"("p_request_id" "uuid", "p_research_run_id" "uuid", "p_option_label" "text", "p_source_name" "text", "p_source_type" "text", "p_listing_url" "text", "p_product_title" "text", "p_product_brand" "text", "p_product_model" "text", "p_product_specs_summary" "text", "p_price_amount" numeric, "p_currency_code" "text", "p_availability_status" "text", "p_seller_name" "text", "p_seller_location" "text", "p_warranty_info" "text", "p_price_last_checked_at" timestamp with time zone, "p_price_change_note" "text", "p_trust_score" numeric, "p_value_score" numeric, "p_fit_score" numeric, "p_final_score" numeric, "p_is_candidate" boolean, "p_is_shortlisted" boolean, "p_raw_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_active_staff_4a"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members
        WHERE auth_user_id = auth.uid() AND is_active = true
    );
END;
$$;


ALTER FUNCTION "public"."fn_is_active_staff_4a"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_active_staff_7b"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members
        WHERE auth_user_id = auth.uid() AND is_active = true
    );
END;
$$;


ALTER FUNCTION "public"."fn_is_active_staff_7b"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_contributor_hr"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_members s
    WHERE s.auth_user_id = auth.uid() AND s.is_active = true
    AND (s.staff_role IN ('admin', 'owner')
      OR EXISTS (
        SELECT 1 FROM public.staff_member_roles r
        WHERE r.staff_member_id = s.id AND r.is_active = true
        AND r.role_code IN ('admin', 'owner', 'contributor_hr', 'contributor_admin', 'fraud_reviewer')
      ))
  );
END; $$;


ALTER FUNCTION "public"."fn_is_contributor_hr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_staff"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select exists (
  select 1
  from public.staff_members s
  where s.auth_user_id = p_user_id
    and s.is_active = true
);
$$;


ALTER FUNCTION "public"."fn_is_staff"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_is_staff"("p_user_id" "uuid") IS 'Returns true if the supplied or current auth user is an active staff member.';



CREATE OR REPLACE FUNCTION "public"."fn_is_staff_manager"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND (s.staff_role = 'admin' OR s.staff_role = 'owner')
    ) OR EXISTS (
        SELECT 1 FROM public.staff_members s
        JOIN public.staff_member_roles r ON r.staff_member_id = s.id
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND r.is_active = true
        AND (r.role_code = 'admin' OR r.role_code = 'owner')
    );
END;
$$;


ALTER FUNCTION "public"."fn_is_staff_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_link_referral"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_l1_referrer uuid;
  v_l2_referrer uuid;
BEGIN
  IF NEW.referred_by_id IS NOT NULL THEN
    v_l1_referrer := NEW.referred_by_id;
    INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
    VALUES (v_l1_referrer, NEW.id, 1, 'signed_up');

    SELECT referred_by_id INTO v_l2_referrer FROM public.contributors WHERE id = v_l1_referrer;
    IF v_l2_referrer IS NOT NULL THEN
      INSERT INTO public.contributor_referrals (referrer_id, referred_id, level, status)
      VALUES (v_l2_referrer, NEW.id, 2, 'signed_up');
    END IF;
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_link_referral"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lock_and_insert_transaction"("p_contributor_id" "uuid", "p_wallet_id" "uuid", "p_tx_type" "text", "p_amount_egp" numeric, "p_amount_points" integer, "p_reference_type" "text", "p_reference_id" "uuid", "p_description_en" "text", "p_description_ar" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_tx_id uuid;
BEGIN
  -- 1. Explicit row lock
  SELECT balance_egp, pending_withdrawal_egp INTO v_balance, v_pending
  FROM public.contributor_wallets
  WHERE id = p_wallet_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- 2. Pre-check for negative balance (overdraft)
  -- For withdrawal_hold, manual_adjustment, or fraud_clawback, check if balance goes negative
  IF p_amount_egp < 0 AND p_tx_type IN ('withdrawal_hold', 'fraud_clawback', 'manual_adjustment') AND (v_balance + p_amount_egp) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- For completed withdrawal, check if pending goes negative
  IF p_amount_egp < 0 AND p_tx_type = 'withdrawal' AND (v_pending + p_amount_egp) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient pending balance');
  END IF;

  -- 3. Insert transaction
  INSERT INTO public.wallet_transactions (
    contributor_id, wallet_id, tx_type, amount_egp, amount_points,
    reference_type, reference_id, description_en, description_ar, metadata, idempotency_key
  ) VALUES (
    p_contributor_id, p_wallet_id, p_tx_type, p_amount_egp, p_amount_points,
    p_reference_type, p_reference_id, p_description_en, p_description_ar, p_metadata, p_idempotency_key
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id);
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;


ALTER FUNCTION "public"."fn_lock_and_insert_transaction"("p_contributor_id" "uuid", "p_wallet_id" "uuid", "p_tx_type" "text", "p_amount_egp" numeric, "p_amount_points" integer, "p_reference_type" "text", "p_reference_id" "uuid", "p_description_en" "text", "p_description_ar" "text", "p_metadata" "jsonb", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_log_request_compliance_hit"("p_request_id" "uuid", "p_rule_code" "text", "p_matched_keyword" "text" DEFAULT NULL::"text", "p_matched_excerpt" "text" DEFAULT NULL::"text", "p_match_source" "text" DEFAULT 'manual'::"text", "p_language_code" "text" DEFAULT 'unknown'::"text", "p_confidence_score" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("hit_id" "uuid", "request_id" "uuid", "rule_code" "text", "decision_mode" "text", "rule_category" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_rule_id uuid;
  v_rule_code text;
  v_decision_mode text;
  v_rule_category text;
  v_hit_id uuid;
  v_created_at timestamptz;
  v_match_source text;
  v_language_code text;
begin
  select
    r.id,
    r.rule_code,
    r.decision_mode,
    r.rule_category
  into
    v_rule_id,
    v_rule_code,
    v_decision_mode,
    v_rule_category
  from public.compliance_rules r
  where r.rule_code = upper(btrim(p_rule_code))
    and r.is_active = true;

  if v_rule_id is null then
    raise exception 'Active compliance rule not found: %', p_rule_code;
  end if;

  if not exists (
    select 1
    from public.requests rq
    where rq.id = p_request_id
  ) then
    raise exception 'Request not found: %', p_request_id;
  end if;

  v_match_source := lower(coalesce(btrim(p_match_source), 'manual'));
  if v_match_source not in ('manual', 'keyword', 'ai', 'staff', 'system') then
    v_match_source := 'manual';
  end if;

  v_language_code := lower(coalesce(btrim(p_language_code), 'unknown'));
  if v_language_code not in ('ar', 'en', 'mixed', 'unknown') then
    v_language_code := 'unknown';
  end if;

  insert into public.request_compliance_hits as h (
    request_id,
    rule_id,
    matched_keyword,
    matched_excerpt,
    match_source,
    language_code,
    confidence_score,
    actor_staff_id,
    notes,
    metadata
  )
  values (
    p_request_id,
    v_rule_id,
    nullif(btrim(p_matched_keyword), ''),
    nullif(btrim(p_matched_excerpt), ''),
    v_match_source,
    v_language_code,
    p_confidence_score,
    p_actor_staff_id,
    p_notes,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning
    h.id,
    h.created_at
  into
    v_hit_id,
    v_created_at;

  hit_id := v_hit_id;
  request_id := p_request_id;
  rule_code := v_rule_code;
  decision_mode := v_decision_mode;
  rule_category := v_rule_category;
  created_at := v_created_at;

  return next;
end;
$$;


ALTER FUNCTION "public"."fn_log_request_compliance_hit"("p_request_id" "uuid", "p_rule_code" "text", "p_matched_keyword" "text", "p_matched_excerpt" "text", "p_match_source" "text", "p_language_code" "text", "p_confidence_score" numeric, "p_notes" "text", "p_actor_staff_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_log_request_customer_message"("p_request_id" "uuid", "p_report_id" "uuid" DEFAULT NULL::"uuid", "p_message_type" "text" DEFAULT 'report_ready'::"text", "p_language_code" "text" DEFAULT 'ar'::"text", "p_subject_text" "text" DEFAULT NULL::"text", "p_body_text" "text" DEFAULT NULL::"text", "p_delivery_channel" "text" DEFAULT 'internal'::"text", "p_delivery_status" "text" DEFAULT 'draft'::"text", "p_created_by_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("message_audit_id" "uuid", "request_id" "uuid", "message_type" "text", "language_code" "text", "delivery_status" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_message_id uuid;
begin
  insert into public.request_customer_message_audit (
    request_id,
    report_id,
    message_type,
    language_code,
    subject_text,
    body_text,
    delivery_channel,
    delivery_status,
    created_by_staff_id
  )
  values (
    p_request_id,
    p_report_id,
    coalesce(p_message_type, 'report_ready'),
    case
      when lower(coalesce(p_language_code, 'ar')) = 'en' then 'en'
      else 'ar'
    end,
    p_subject_text,
    p_body_text,
    coalesce(p_delivery_channel, 'internal'),
    case
      when lower(coalesce(p_delivery_status, 'draft')) in ('draft','queued','sent','failed','internal_only')
        then lower(p_delivery_status)
      else 'draft'
    end,
    p_created_by_staff_id
  )
  returning id into v_message_id;

  return query
  select
    v_message_id,
    p_request_id,
    coalesce(p_message_type, 'report_ready'),
    case when lower(coalesce(p_language_code, 'ar')) = 'en' then 'en' else 'ar' end,
    case
      when lower(coalesce(p_delivery_status, 'draft')) in ('draft','queued','sent','failed','internal_only')
        then lower(p_delivery_status)
      else 'draft'
    end;
end;
$$;


ALTER FUNCTION "public"."fn_log_request_customer_message"("p_request_id" "uuid", "p_report_id" "uuid", "p_message_type" "text", "p_language_code" "text", "p_subject_text" "text", "p_body_text" "text", "p_delivery_channel" "text", "p_delivery_status" "text", "p_created_by_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_output_summary" "text" DEFAULT NULL::"text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("job_id" "uuid", "request_id" "uuid", "job_type" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid;
  v_assigned uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  if not public.fn_is_staff(v_actor) then
    raise exception 'Only active staff can update jobs';
  end if;

  select j.assigned_to_user_id
  into v_assigned
  from public.agent_jobs j
  where j.id = p_job_id;

  if v_assigned is not null and v_assigned <> v_actor then
    raise exception 'Job is assigned to another staff member';
  end if;

  update public.agent_jobs j
  set status = 'waiting_approval',
      assigned_to_user_id = coalesce(j.assigned_to_user_id, v_actor),
      output_payload = coalesce(p_output_payload, '{}'::jsonb),
      output_summary = coalesce(p_output_summary, j.output_summary),
      updated_at = now()
  where j.id = p_job_id
    and j.status in ('queued', 'running');

  if not found then
    raise exception 'Job cannot move to waiting_approval from current status';
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
    'Job moved to waiting approval',
    jsonb_build_object(
      'actor_user_id', v_actor,
      'output_summary', p_output_summary
    )
  );

  return query
  select
    j.id,
    j.request_id,
    j.job_type,
    j.status
  from public.agent_jobs j
  where j.id = p_job_id;
end;
$$;


ALTER FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") IS 'Moves a queued/running job into waiting_approval with output payload and summary.';



CREATE OR REPLACE FUNCTION "public"."fn_normalize_phone_eg"("p_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
declare
  v text;
  d text;
begin
  if p_input is null or btrim(p_input) = '' then
    return null;
  end if;

  v := btrim(p_input);

  -- remove spaces, dashes, parentheses
  v := regexp_replace(v, '[\s\-\(\)]', '', 'g');

  -- convert 00XXXXXXXX to +XXXXXXXX
  if left(v, 2) = '00' then
    v := '+' || substr(v, 3);
  end if;

  if left(v, 1) = '+' then
    d := regexp_replace(substr(v, 2), '[^0-9]', '', 'g');
    if d = '' then
      return null;
    end if;
    v := '+' || d;
  else
    d := regexp_replace(v, '[^0-9]', '', 'g');
    if d = '' then
      return null;
    end if;
    v := d;
  end if;

  -- Egypt formats
  if v ~ '^\+201[0-9]{9}$' then
    return v;
  end if;

  if v ~ '^201[0-9]{9}$' then
    return '+' || v;
  end if;

  if v ~ '^01[0-9]{9}$' then
    return '+20' || substr(v, 2);
  end if;

  -- Generic international fallback
  if v ~ '^\+[1-9][0-9]{6,15}$' then
    return v;
  end if;

  if v ~ '^[1-9][0-9]{6,15}$' then
    return '+' || v;
  end if;

  return null;
end;
$_$;


ALTER FUNCTION "public"."fn_normalize_phone_eg"("p_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_on_product_price_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_diff numeric;
    v_pct numeric;
    v_dir text;
BEGIN
    -- Only trigger if price has changed or if inserting
    IF (TG_OP = 'INSERT') OR (OLD.current_price IS DISTINCT FROM NEW.current_price) THEN
        -- Record in history
        INSERT INTO public.price_history (product_id, price, captured_at)
        VALUES (NEW.id, NEW.current_price, now());
        
        -- Record event if it's an update
        IF TG_OP = 'UPDATE' THEN
            v_diff := NEW.current_price - OLD.current_price;
            IF OLD.current_price > 0 THEN
                v_pct := round((v_diff / OLD.current_price) * 100, 2);
            ELSE
                v_pct := 100.00;
            END IF;
            
            IF v_diff > 0 THEN
                v_dir := 'up';
            ELSIF v_diff < 0 THEN
                v_dir := 'down';
            ELSE
                v_dir := 'no_change';
            END IF;

            INSERT INTO public.price_events (product_id, old_price, new_price, difference, percentage_change, direction, created_at)
            VALUES (NEW.id, OLD.current_price, NEW.current_price, v_diff, v_pct, v_dir, now());
        END IF;
    END IF;
    
    NEW.last_updated := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_on_product_price_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_operational_states_canonical_state_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_operational_states_canonical_state_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer DEFAULT 3, "p_note" "text" DEFAULT NULL::"text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "published_offers" integer, "snapshot_count" integer, "operational_stage" "text", "stage_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_published_count integer := 0;
  v_snapshot_count integer := 0;
  v_actor uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

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


COMMENT ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") IS 'Publishes active shortlist to offers, snapshots them into one report, and moves request into report_review / waiting_approval.';



CREATE OR REPLACE FUNCTION "public"."fn_prepare_snapshots_from_shortlist"("p_request_id" "uuid", "p_snapshot_kind" "text" DEFAULT 'customer_report'::"text") RETURNS TABLE("request_id" "uuid", "created_snapshots" integer, "total_active_shortlist" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_created integer := 0;
  v_total_active integer := 0;
  v_report_id uuid;
  v_next_version integer;
begin
  -- active shortlist count
  select count(*)
  into v_total_active
  from public.request_candidate_shortlists s
  where s.request_id = p_request_id
    and coalesce(s.is_active, true) = true;

  -- reuse latest draft report if exists
  select r.id
  into v_report_id
  from public.reports r
  where r.request_id = p_request_id
    and r.report_status = 'draft'
  order by r.report_version desc, r.created_at desc
  limit 1;

  -- otherwise create a new draft report
  if v_report_id is null then
    select coalesce(max(r.report_version), 0) + 1
    into v_next_version
    from public.reports r
    where r.request_id = p_request_id;

    insert into public.reports (
      request_id,
      report_version,
      report_status,
      executive_summary,
      recommendation_summary,
      why_not_cheapest,
      price_validity_note,
      generated_by
    )
    values (
      p_request_id,
      v_next_version,
      'draft',
      'Draft report generated from active shortlist items.',
      'Customer-facing shortlist snapshots are being prepared.',
      'The cheapest option is not always the best overall value.',
      'Prices and availability may change based on timing and market updates.',
      'admin'
    )
    returning id into v_report_id;
  end if;

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
    v_report_id,
    s.request_id,
    s.id as shortlist_id,
    s.published_offer_id as offer_id,
    greatest(coalesce(s.ranking_position, 1), 1) as display_rank,
    case
      when lower(coalesce(s.candidate_channel, 'online')) = 'offline' then 'offline'
      else 'online'
    end as candidate_channel,
    coalesce(ri.product_title, s.option_label, 'Untitled option') as display_title,
    ri.product_brand as display_brand,
    ri.product_model as display_model,
    ri.product_specs_summary as display_specs_summary,
    ri.price_amount as display_price_amount,
    coalesce(ri.currency_code, 'EGP') as currency_code,
    ri.availability_status,
    ri.warranty_info,
    coalesce(s.trust_score, ri.trust_score) as trust_score,
    coalesce(s.value_score, ri.value_score) as value_score,
    coalesce(s.final_score, ri.final_score) as final_score,
    coalesce(s.reason_summary, 'Shortlisted recommendation') as highlight_summary,
    s.customer_summary,
    coalesce(s.reveal_locked, true) as reveal_locked,
    case
      when lower(coalesce(s.candidate_channel, 'online')) = 'offline' then 'merchant_contact'
      when ri.listing_url is not null then 'online_url'
      else 'none'
    end as reveal_kind,
    ri.listing_url as hidden_reference_url,
    ri.seller_name as hidden_merchant_name,
    ri.seller_location as hidden_merchant_location,
    nullif(
      concat_ws(
        ' | ',
        case when ri.warranty_info is not null then 'Warranty: ' || ri.warranty_info end,
        case when ri.price_change_note is not null then 'Price note: ' || ri.price_change_note end
      ),
      ''
    ) as hidden_contact_notes
  from public.request_candidate_shortlists s
  left join public.research_items ri
    on ri.id = s.research_item_id
  where s.request_id = p_request_id
    and coalesce(s.is_active, true) = true
    and not exists (
      select 1
      from public.report_option_snapshots ros
      where ros.report_id = v_report_id
        and ros.shortlist_id = s.id
    );

  get diagnostics v_created = row_count;

  return query
  select p_request_id, v_created, v_total_active;
end;
$$;


ALTER FUNCTION "public"."fn_prepare_snapshots_from_shortlist"("p_request_id" "uuid", "p_snapshot_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pricing_lifecycle_state_machine"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Automatically manage updated_at
    NEW.updated_at := now();

    -- Determine dynamic status state machine
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.status := 'deleted';
        NEW.is_active := false;
    ELSIF NEW.is_active = false THEN
        NEW.status := 'inactive';
    ELSIF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
        NEW.status := 'expired';
    ELSIF NEW.starts_at IS NOT NULL AND NEW.starts_at > now() THEN
        NEW.status := 'scheduled';
    ELSE
        NEW.status := 'active';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_pricing_lifecycle_state_machine"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_process_referral_reward"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_reward_stage text;
  v_points int := 0;
  v_cash numeric := 0;
BEGIN
  -- We only care if status changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    IF NEW.status = 'approved' THEN
      v_reward_stage := 'approved';
      v_points := 50;
      v_cash := 0;
    ELSIF NEW.status = 'active' THEN
      -- 'active' implies they started doing tasks
      v_reward_stage := 'first_task_completed';
      v_points := 0;
      v_cash := 25.00;
    ELSIF NEW.status = 'earning' THEN
      v_reward_stage := 'earning_started';
      v_points := 0;
      v_cash := 0; -- Handled via L2 percentage split
    END IF;

    -- Only insert if there's a defined stage
    IF v_reward_stage IS NOT NULL THEN
      INSERT INTO public.referral_rewards (contributor_id, source_user_id, reward_stage, points_awarded, cash_awarded_egp)
      VALUES (NEW.referrer_id, NEW.referred_id, v_reward_stage, v_points, v_cash);
      
      -- Add directly to wallet if rewards exist
      IF v_points > 0 OR v_cash > 0 THEN
        INSERT INTO public.wallet_transactions (contributor_id, wallet_id, tx_type, amount_egp, amount_points, reference_type, description_en, description_ar)
        SELECT NEW.referrer_id, id, 'referral_reward', v_cash, v_points, 'referral', 'Team building reward for ' || v_reward_stage, 'مكافأة بناء فريق للمرحلة: ' || v_reward_stage
        FROM public.contributor_wallets WHERE contributor_id = NEW.referrer_id;

        -- UPDATE the new tracking column
        IF v_cash > 0 THEN
          UPDATE public.contributors
          SET referral_bonus_earned_egp = referral_bonus_earned_egp + v_cash
          WHERE id = NEW.referrer_id;
        END IF;
      END IF;
    END IF;

    -- Update referral challenge active count if they reached approved/active
    IF NEW.status IN ('approved', 'active', 'earning') AND OLD.status = 'signed_up' THEN
      UPDATE public.referral_challenges
      SET current_active_count = current_active_count + 1
      WHERE contributor_id = NEW.referrer_id AND is_active = true;
    END IF;

  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_process_referral_reward"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_process_wallet_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. If adding funds or points (positive reward or adjustment)
  IF NEW.amount_egp > 0 OR NEW.amount_points > 0 THEN
    UPDATE public.contributor_wallets
    SET balance_egp = balance_egp + NEW.amount_egp,
        points_balance = points_balance + NEW.amount_points,
        lifetime_earned_egp = lifetime_earned_egp + NEW.amount_egp,
        last_transaction_at = now()
    WHERE id = NEW.wallet_id;
  
  -- 2. If removing/adjusting funds (negative amount)
  ELSIF NEW.amount_egp < 0 THEN
    -- A. If it is completing a withdrawal payout (funds move out of pending)
    IF NEW.tx_type = 'withdrawal' THEN
      UPDATE public.contributor_wallets
      SET pending_withdrawal_egp = pending_withdrawal_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          lifetime_withdrawn_egp = lifetime_withdrawn_egp - NEW.amount_egp, -- amount_egp is negative, so this adds
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
      
    -- B. If it is creating a withdrawal hold (funds move from balance to pending)
    ELSIF NEW.tx_type = 'withdrawal_hold' THEN
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          pending_withdrawal_egp = pending_withdrawal_egp - NEW.amount_egp, -- amount_egp is negative, so this adds (double negative)
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
      
    -- C. Generic negative adjustments (clawbacks, negative manual adjustments)
    ELSE
      UPDATE public.contributor_wallets
      SET balance_egp = balance_egp + NEW.amount_egp, -- amount_egp is negative, so this subtracts
          points_balance = GREATEST(0, points_balance + NEW.amount_points),
          last_transaction_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_process_wallet_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") RETURNS TABLE("shortlist_id" "uuid", "offer_id" "uuid", "ranking_position" integer, "candidate_channel" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r record;
  v_offer_id uuid;
begin
  for r in
    select *
    from public.v_request_shortlist_detailed
    where request_id = p_request_id
      and is_active = true
      and published_offer_id is null
    order by ranking_position, shortlist_created_at, shortlist_id
  loop
    insert into public.offers (
      request_id,
      option_label,
      source_type,
      product_title,
      product_brand,
      product_model,
      product_specs_summary,
      price_amount,
      currency_code,
      availability_status,
      warranty_info,
      trust_score,
      value_score,
      ranking_position,
      is_recommended,
      merchant_id
    )
    values (
      r.request_id,
      r.effective_option_label,
      coalesce(r.source_type, 'other'),
      r.product_title,
      r.product_brand,
      r.product_model,
      r.product_specs_summary,
      r.price_amount,
      coalesce(r.currency_code, 'EGP'),
      coalesce(r.availability_status, 'unknown'),
      r.warranty_info,
      r.effective_trust_score,
      r.effective_value_score,
      r.ranking_position,
      r.is_recommended,
      r.merchant_id
    )
    returning id into v_offer_id;

    update public.request_candidate_shortlists
    set published_offer_id = v_offer_id,
        updated_at = now()
    where id = r.shortlist_id;

    shortlist_id := r.shortlist_id;
    offer_id := v_offer_id;
    ranking_position := r.ranking_position;
    candidate_channel := r.candidate_channel;
    return next;
  end loop;
end;
$$;


ALTER FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") IS 'Publishes active shortlist rows for one request into legacy offers table, then back-links shortlist rows to created offers. Internal use.';



CREATE OR REPLACE FUNCTION "public"."fn_rate_merchant"("p_merchant_id" "uuid", "p_request_id" "uuid" DEFAULT NULL::"uuid", "p_overall_score" numeric DEFAULT NULL::numeric, "p_reliability_score" numeric DEFAULT NULL::numeric, "p_quality_score" numeric DEFAULT NULL::numeric, "p_price_competitiveness_score" numeric DEFAULT NULL::numeric, "p_service_score" numeric DEFAULT NULL::numeric, "p_note" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("merchant_id" "uuid", "evaluations_count" bigint, "new_overall_score" numeric, "new_reliability_score" numeric, "new_quality_score" numeric, "new_price_competitiveness_score" numeric, "new_service_score" numeric)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count bigint;
  v_overall numeric;
  v_reliability numeric;
  v_quality numeric;
  v_price numeric;
  v_service numeric;
begin
  if not exists (
    select 1
    from public.merchants m
    where m.id = p_merchant_id
  ) then
    raise exception 'Merchant not found: %', p_merchant_id;
  end if;

  insert into public.merchant_evaluations (
    merchant_id,
    request_id,
    evaluation_source,
    overall_score,
    reliability_score,
    quality_score,
    price_competitiveness_score,
    service_score,
    note,
    actor_staff_id
  )
  values (
    p_merchant_id,
    p_request_id,
    'internal_review',
    p_overall_score,
    p_reliability_score,
    p_quality_score,
    p_price_competitiveness_score,
    p_service_score,
    p_note,
    p_actor_staff_id
  );

  select
    count(*)::bigint,
    avg(overall_score),
    avg(reliability_score),
    avg(quality_score),
    avg(price_competitiveness_score),
    avg(service_score)
  into
    v_count,
    v_overall,
    v_reliability,
    v_quality,
    v_price,
    v_service
  from public.merchant_evaluations me
  where me.merchant_id = p_merchant_id;

  update public.merchants
  set
    overall_score = round(v_overall, 2),
    reliability_score = round(v_reliability, 2),
    quality_score = round(v_quality, 2),
    price_competitiveness_score = round(v_price, 2),
    service_score = round(v_service, 2),
    last_active_at = now()
  where id = p_merchant_id;

  return query
  select
    p_merchant_id,
    v_count,
    round(v_overall, 2),
    round(v_reliability, 2),
    round(v_quality, 2),
    round(v_price, 2),
    round(v_service, 2);
end;
$$;


ALTER FUNCTION "public"."fn_rate_merchant"("p_merchant_id" "uuid", "p_request_id" "uuid", "p_overall_score" numeric, "p_reliability_score" numeric, "p_quality_score" numeric, "p_price_competitiveness_score" numeric, "p_service_score" numeric, "p_note" "text", "p_actor_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_refresh_vendor_trust_from_reviews"("p_vendor_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_avg_rating      numeric;
  v_review_count    int;
  v_base_score      int;
  v_review_delta    int;
  v_final_score     int;
BEGIN
  SELECT
    COALESCE(
      SUM(((vendor_rating + vendor_availability + vendor_price_accuracy + vendor_communication) / 4.0) * (CASE WHEN is_verified_purchase = true THEN 2.0 ELSE 1.0 END)) 
      / NULLIF(SUM(CASE WHEN is_verified_purchase = true THEN 2.0 ELSE 1.0 END), 0),
      3.0
    ),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.vendor_reviews
  WHERE vendor_id = p_vendor_id
    AND is_published = true
    AND is_archived = false
    AND vendor_rating IS NOT NULL;

  IF v_review_count = 0 THEN RETURN; END IF;

  -- Base score stays, reviews can influence ±20 points
  SELECT trust_score INTO v_base_score FROM public.vendors WHERE id = p_vendor_id;

  -- avg_rating 1-5 → delta -20 to +10
  v_review_delta := ROUND(((v_avg_rating - 3.0) / 2.0) * 15);
  v_final_score  := GREATEST(0, LEAST(100, v_base_score + v_review_delta));

  UPDATE public.vendors SET trust_score = v_final_score WHERE id = p_vendor_id;

  INSERT INTO public.vendor_audit_log(vendor_id, event_name, new_value)
  VALUES (p_vendor_id, 'TRUST_REFRESHED_FROM_REVIEWS',
          jsonb_build_object('avg_rating', v_avg_rating, 'review_count', v_review_count,
                             'delta', v_review_delta, 'new_score', v_final_score));
END;
$$;


ALTER FUNCTION "public"."fn_refresh_vendor_trust_from_reviews"("p_vendor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- A. Insert into vendors
  INSERT INTO public.vendors (
    display_name,
    whatsapp_number,
    governorate,
    area,
    notes,
    system_status
  ) VALUES (
    p_business_name_ar,
    p_primary_phone,
    p_governorate,
    p_area,
    p_notes,
    'Pending Verification'
  ) RETURNING id INTO v_vendor_id;

  -- B. Insert into vendor_profile_details
  INSERT INTO public.vendor_profile_details (
    vendor_id,
    business_name_ar,
    business_name_en,
    merchant_type,
    category,
    city,
    address,
    secondary_phone,
    email,
    website
  ) VALUES (
    v_vendor_id,
    p_business_name_ar,
    p_business_name_en,
    p_merchant_type,
    p_category,
    p_city,
    p_address,
    p_secondary_phone,
    p_email,
    p_website
  );

  RETURN v_vendor_id;
END;
$$;


ALTER FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text", "p_auth_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- A. Insert into vendors
  INSERT INTO public.vendors (
    display_name,
    whatsapp_number,
    governorate,
    area,
    notes,
    system_status,
    auth_user_id
  ) VALUES (
    p_business_name_ar,
    p_primary_phone,
    p_governorate,
    p_area,
    p_notes,
    'Active', -- Auto-approve since they verified via OTP
    p_auth_user_id
  ) RETURNING id INTO v_vendor_id;

  -- B. Insert into vendor_profile_details
  INSERT INTO public.vendor_profile_details (
    vendor_id,
    business_name_ar,
    business_name_en,
    merchant_type,
    category,
    city,
    address,
    secondary_phone,
    email,
    website
  ) VALUES (
    v_vendor_id,
    p_business_name_ar,
    p_business_name_en,
    p_merchant_type,
    p_category,
    p_city,
    p_address,
    p_secondary_phone,
    p_email,
    p_website
  );

  RETURN v_vendor_id;
END;
$$;


ALTER FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text", "p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text" DEFAULT NULL::"text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "notify_job_created" boolean, "operational_stage" "text", "stage_status" "text", "client_released_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text", "p_actor_user_id" "uuid") IS 'Releases a prepared request to the customer, stamps client_released_at, and queues notify_customer job if none is active.';



CREATE OR REPLACE FUNCTION "public"."fn_release_request_to_customer_by_staff"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("request_id" "uuid", "notify_job_created" boolean, "operational_stage" "text", "stage_status" "text", "client_released_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_actor_user_id uuid;
begin
  select s.auth_user_id
  into v_actor_user_id
  from public.staff_members s
  where s.id = p_actor_staff_id
    and s.is_active = true;

  if v_actor_user_id is null then
    raise exception 'Active staff member not found or missing auth_user_id: %', p_actor_staff_id;
  end if;

  return query
  select *
  from public.fn_release_request_to_customer(
    p_request_id := p_request_id,
    p_note := coalesce(p_note, 'Release to customer by staff'),
    p_actor_user_id := v_actor_user_id
  );
end;
$$;


ALTER FUNCTION "public"."fn_release_request_to_customer_by_staff"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_requests_canonical_state_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_requests_canonical_state_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_resolve_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    IF p_is_archived THEN
        RETURN 'ARCHIVED';
    END IF;

    IF p_current_status = 'closed'
       OR (p_client_released_at IS NOT NULL AND p_current_status <> 'closed') THEN
        RETURN 'COMPLETED';
    END IF;

    IF p_current_status = 'client_ready'
       AND p_client_released_at IS NULL THEN
        RETURN 'READY';
    END IF;

    IF p_reviewer_decision IN ('reject', 'needs_clarification') THEN
        RETURN 'ISSUES';
    END IF;

    IF p_reviewer_decision = 'approve'
       AND p_current_status IN ('in_progress', 'research', 'reporting') THEN
        RETURN 'OPERATIONS';
    END IF;

    IF p_reviewer_decision IS NULL
       AND p_current_status IN ('submitted', 'open') THEN
        RETURN 'INTAKE';
    END IF;

    RETURN 'UNKNOWN';
END;
$$;


ALTER FUNCTION "public"."fn_resolve_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_restore_request"("p_request_id" "uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count bigint;
begin
  update public.requests
  set
    is_archived = false,
    archived_at = null,
    archived_by_user_id = null,
    archive_reason = null
  where id = p_request_id
    and coalesce(is_archived, false) = true;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."fn_restore_request"("p_request_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_review_request"("p_request_id" "uuid", "p_decision" "text", "p_note" "text" DEFAULT NULL::"text", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid", "p_intake_ai_decision" "text" DEFAULT NULL::"text", "p_intake_ai_confidence" numeric DEFAULT NULL::numeric, "p_intake_reason_code" "text" DEFAULT NULL::"text", "p_intake_summary" "text" DEFAULT NULL::"text", "p_intake_internal_reasoning" "text" DEFAULT NULL::"text", "p_intake_clarification_questions" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("request_id" "uuid", "previous_status" "text", "new_status" "text", "reviewer_decision" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
  v_new_status text;
  v_decision text;
  v_staff_ok boolean;
begin
  v_decision := lower(trim(p_decision));

  if v_decision not in ('approve', 'reject', 'clarify') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  select r.current_status
  into v_old_status
  from public.requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  if p_actor_staff_id is not null then
    select exists (
      select 1
      from public.staff_members s
      where s.id = p_actor_staff_id
        and s.is_active = true
    )
    into v_staff_ok;

    if coalesce(v_staff_ok, false) = false then
      raise exception 'Active staff member not found: %', p_actor_staff_id;
    end if;
  end if;

  if v_decision = 'approve' then
    v_new_status := 'accepted';
  elsif v_decision = 'reject' then
    v_new_status := 'rejected';
  else
    v_new_status := 'needs_clarification';
  end if;

  update public.requests
  set
    intake_ai_decision = coalesce(p_intake_ai_decision, intake_ai_decision),
    intake_ai_confidence = coalesce(p_intake_ai_confidence, intake_ai_confidence),
    intake_reason_code = coalesce(p_intake_reason_code, intake_reason_code),
    intake_summary = coalesce(p_intake_summary, intake_summary),
    intake_internal_reasoning = coalesce(p_intake_internal_reasoning, intake_internal_reasoning),
    intake_clarification_questions = coalesce(p_intake_clarification_questions, intake_clarification_questions),
    reviewer_decision = v_decision,
    reviewer_decided_by_staff_id = coalesce(p_actor_staff_id, reviewer_decided_by_staff_id),
    reviewer_decided_at = now(),
    reviewer_notes = p_note,
    accepted_at = case when v_decision = 'approve' then now() else accepted_at end,
    rejected_at = case when v_decision = 'reject' then now() else rejected_at end,
    clarification_requested_at = case when v_decision = 'clarify' then now() else clarification_requested_at end,
    current_status = v_new_status
  where id = p_request_id;

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
    p_request_id,
    case
      when v_decision = 'approve' then 'review_approve'
      when v_decision = 'reject' then 'review_reject'
      else 'review_clarify'
    end,
    p_note,
    p_actor_staff_id,
    v_old_status,
    v_new_status,
    jsonb_build_object(
      'intake_ai_decision', p_intake_ai_decision,
      'intake_ai_confidence', p_intake_ai_confidence,
      'intake_reason_code', p_intake_reason_code,
      'intake_summary', p_intake_summary,
      'intake_internal_reasoning', p_intake_internal_reasoning,
      'intake_clarification_questions', coalesce(p_intake_clarification_questions, '[]'::jsonb)
    )
  );

  return query
  select p_request_id, v_old_status, v_new_status, v_decision;
end;
$$;


ALTER FUNCTION "public"."fn_review_request"("p_request_id" "uuid", "p_decision" "text", "p_note" "text", "p_actor_staff_id" "uuid", "p_intake_ai_decision" "text", "p_intake_ai_confidence" numeric, "p_intake_reason_code" "text", "p_intake_summary" "text", "p_intake_internal_reasoning" "text", "p_intake_clarification_questions" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_run_economy_stabilizer"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_config            jsonb;
  v_warn_pct          numeric;
  v_crit_pct          numeric;
  v_reduce_warn       numeric;
  v_reduce_crit       numeric;
  v_current_week_payout numeric;
  v_last_week_payout  numeric;
  v_growth_pct        numeric;
  v_status            text := 'normal';
  v_multiplier        numeric := 1.0;
  v_action            text := 'none';
  v_global_enabled    boolean;
BEGIN
  -- Read stabilizer config
  SELECT value INTO v_config FROM public.economy_config WHERE config_key = 'stabilizer_config';
  v_warn_pct    := (v_config->>'weekly_growth_warning_pct')::numeric;
  v_crit_pct    := (v_config->>'weekly_growth_critical_pct')::numeric;
  v_reduce_warn := (v_config->>'auto_reduce_multiplier_warning')::numeric;
  v_reduce_crit := (v_config->>'auto_reduce_multiplier_critical')::numeric;

  -- Check if stabilizer is enabled
  SELECT (value->>'stabilizer_enabled')::boolean INTO v_global_enabled
  FROM public.economy_config WHERE config_key = 'global';
  IF NOT v_global_enabled THEN
    RETURN jsonb_build_object('status', 'disabled', 'action', 'none');
  END IF;

  -- Compute current week vs last week payouts
  BEGIN
    SELECT COALESCE(SUM(amount_egp), 0) INTO v_current_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now());

    SELECT COALESCE(SUM(amount_egp), 0) INTO v_last_week_payout
    FROM public.wallet_transactions
    WHERE tx_type IN ('task_reward', 'referral_reward')
      AND created_at >= date_trunc('week', now() - INTERVAL '1 week')
      AND created_at < date_trunc('week', now());
  EXCEPTION WHEN undefined_table THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'wallet_transactions table not yet active');
  END;

  -- Calculate growth rate
  IF v_last_week_payout > 0 THEN
    v_growth_pct := ((v_current_week_payout - v_last_week_payout) / v_last_week_payout) * 100;
  ELSE
    v_growth_pct := 0;
  END IF;

  -- Apply stabilizer rules
  IF v_growth_pct >= v_crit_pct THEN
    v_status     := 'critical';
    v_multiplier := v_reduce_crit;   -- 0.70
    v_action     := format('AUTO_REDUCE_MULTIPLIER to %s (critical growth: %s%%)', v_reduce_crit, v_growth_pct);

    INSERT INTO public.economy_stabilizer_events
      (event_type, trigger_metric, trigger_value, threshold_value, action_taken, new_multiplier)
    VALUES
      ('critical_triggered', 'weekly_payout_growth', v_growth_pct, v_crit_pct, v_action, v_multiplier);

  ELSIF v_growth_pct >= v_warn_pct THEN
    v_status     := 'warning';
    v_multiplier := v_reduce_warn;   -- 0.85
    v_action     := format('AUTO_REDUCE_MULTIPLIER to %s (warning growth: %s%%)', v_reduce_warn, v_growth_pct);

    INSERT INTO public.economy_stabilizer_events
      (event_type, trigger_metric, trigger_value, threshold_value, action_taken, new_multiplier)
    VALUES
      ('warning_triggered', 'weekly_payout_growth', v_growth_pct, v_warn_pct, v_action, v_multiplier);
  ELSE
    v_status     := 'normal';
    v_multiplier := 1.0;
    v_action     := 'none';
  END IF;

  -- Record snapshot
  INSERT INTO public.economy_stabilizer_snapshots
    (snapshot_date, total_payouts_egp, payout_growth_pct_wow, stabilizer_status, multiplier_adjustment, auto_action_taken)
  VALUES
    (CURRENT_DATE, v_current_week_payout, v_growth_pct, v_status, v_multiplier, v_action)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'status',          v_status,
    'growth_pct',      v_growth_pct,
    'multiplier',      v_multiplier,
    'action',          v_action,
    'this_week_egp',   v_current_week_payout,
    'last_week_egp',   v_last_week_payout
  );
END; $$;


ALTER FUNCTION "public"."fn_run_economy_stabilizer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_save_merchant_from_research_item"("p_research_item_id" "uuid", "p_actor_staff_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("merchant_id" "uuid", "action_taken" "text", "merchant_name" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item record;
  v_merchant_id uuid;
  v_action text;
  v_name text;
  v_city text;
  v_type text;
begin
  select *
  into v_item
  from public.research_items ri
  where ri.id = p_research_item_id;

  if not found then
    raise exception 'Research item not found: %', p_research_item_id;
  end if;

  v_name := coalesce(
    nullif(trim(v_item.seller_name), ''),
    nullif(trim(v_item.source_name), ''),
    'Unknown Merchant'
  );

  v_city := nullif(trim(coalesce(v_item.seller_location, '')), '');

  v_type := case lower(coalesce(v_item.source_type, ''))
    when 'marketplace' then 'online_store'
    when 'retailer' then 'online_store'
    when 'brand_store' then 'online_store'
    when 'classifieds' then 'online_store'
    when 'social' then 'online_store'
    else 'online_store'
  end;

  select m.id
  into v_merchant_id
  from public.merchants m
  where lower(trim(m.name)) = lower(trim(v_name))
    and coalesce(lower(trim(m.city)), '') = coalesce(lower(trim(v_city)), '')
    and coalesce(lower(trim(m.merchant_type)), '') = lower(trim(v_type))
  limit 1;

  if v_merchant_id is null then
    insert into public.merchants (
      merchant_code,
      name,
      merchant_type,
      city,
      area,
      email,
      overall_score,
      is_active,
      notes,
      supports_online,
      supports_offline,
      default_currency_code,
      raw_profile
    )
    values (
      'MER-AUTO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      v_name,
      v_type,
      v_city,
      null,
      null,
      null,
      true,
      coalesce(p_note, 'Auto-created from research item'),
      true,
      false,
      coalesce(v_item.currency_code, 'EGP'),
      jsonb_build_object(
        'created_from', 'research_item',
        'research_item_id', v_item.id,
        'source_name', v_item.source_name,
        'source_type', v_item.source_type
      )
    )
    returning id into v_merchant_id;

    v_action := 'created';
  else
    update public.merchants
    set
      last_active_at = now(),
      last_contacted_at = coalesce(last_contacted_at, now())
    where id = v_merchant_id;

    v_action := 'existing';
  end if;

  if v_item.listing_url is not null then
    insert into public.merchant_source_links (
      merchant_id,
      source_type,
      source_label,
      source_url,
      is_active,
      notes
    )
    values (
      v_merchant_id,
      coalesce(v_item.source_type, 'other'),
      v_item.source_name,
      v_item.listing_url,
      true,
      'Captured from research item'
    )
    on conflict on constraint uq_merchant_source_links
    do nothing;
  end if;

  insert into public.request_merchant_matches (
    request_id,
    merchant_id,
    source_channel,
    match_status,
    match_score,
    quote_amount,
    currency_code,
    note
  )
  values (
    v_item.request_id,
    v_merchant_id,
    'online',
    'suggested',
    v_item.final_score,
    v_item.price_amount,
    coalesce(v_item.currency_code, 'EGP'),
    coalesce(p_note, 'Linked from research item')
  )
  on conflict on constraint uq_request_merchant_match
  do update set
    match_score = excluded.match_score,
    quote_amount = excluded.quote_amount,
    currency_code = excluded.currency_code,
    note = excluded.note,
    updated_at = now();

  return query
  select v_merchant_id, v_action, v_name;
end;
$$;


ALTER FUNCTION "public"."fn_save_merchant_from_research_item"("p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text" DEFAULT NULL::"text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_needs_manual_review" boolean DEFAULT NULL::boolean, "p_approved_for_processing" boolean DEFAULT NULL::boolean, "p_report_ready" boolean DEFAULT NULL::boolean) RETURNS TABLE("request_id" "uuid", "operational_stage" "text", "stage_status" "text", "approved_for_processing" boolean, "needs_manual_review" boolean, "report_ready" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text", "p_actor_user_id" "uuid", "p_needs_manual_review" boolean, "p_approved_for_processing" boolean, "p_report_ready" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text", "p_actor_user_id" "uuid", "p_needs_manual_review" boolean, "p_approved_for_processing" boolean, "p_report_ready" boolean) IS 'Generic internal helper to move request operational stage and append workflow event log.';



CREATE OR REPLACE FUNCTION "public"."fn_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_shortlist_research_item"("p_request_id" "uuid", "p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_ranking_position" integer DEFAULT NULL::integer, "p_reason_summary" "text" DEFAULT NULL::"text", "p_customer_summary" "text" DEFAULT NULL::"text", "p_is_recommended" boolean DEFAULT true, "p_reveal_locked" boolean DEFAULT true) RETURNS TABLE("shortlist_id" "uuid", "request_id" "uuid", "research_item_id" "uuid", "ranking_position" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_shortlist_id uuid;
  v_existing_shortlist_id uuid;
  v_rank integer;
  v_actor_auth_user_id uuid;
  v_item record;
begin
  select s.auth_user_id
  into v_actor_auth_user_id
  from public.staff_members s
  where s.id = p_actor_staff_id
    and s.is_active = true;

  if v_actor_auth_user_id is null then
    raise exception 'Active staff member not found or not linked to auth user: %', p_actor_staff_id;
  end if;

  select
    ri.*
  into v_item
  from public.research_items ri
  where ri.id = p_research_item_id
    and ri.request_id = p_request_id;

  if not found then
    raise exception 'Research item % not found for request %', p_research_item_id, p_request_id;
  end if;

  select s.id
  into v_existing_shortlist_id
  from public.request_candidate_shortlists s
  where s.request_id = p_request_id
    and s.research_item_id = p_research_item_id
    and coalesce(s.is_active, true) = true
  limit 1;

  if p_ranking_position is null then
    select coalesce(max(s.ranking_position), 0) + 1
    into v_rank
    from public.request_candidate_shortlists s
    where s.request_id = p_request_id
      and coalesce(s.is_active, true) = true;
  else
    v_rank := p_ranking_position;
  end if;

  if v_existing_shortlist_id is not null then
    update public.request_candidate_shortlists s
    set
      selected_by_user_id = v_actor_auth_user_id,
      ranking_position = v_rank,
      option_label = coalesce(v_item.option_label, s.option_label),
      trust_score = v_item.trust_score,
      value_score = v_item.value_score,
      fit_score = v_item.fit_score,
      final_score = v_item.final_score,
      reason_summary = coalesce(p_reason_summary, s.reason_summary, 'Selected from research item'),
      customer_summary = coalesce(p_customer_summary, s.customer_summary),
      reveal_locked = coalesce(p_reveal_locked, s.reveal_locked),
      is_recommended = coalesce(p_is_recommended, s.is_recommended),
      is_active = true
    where s.id = v_existing_shortlist_id
    returning s.id into v_shortlist_id;
  else
    insert into public.request_candidate_shortlists (
      request_id,
      candidate_channel,
      research_item_id,
      merchant_quote_id,
      selected_by_user_id,
      ranking_position,
      option_label,
      trust_score,
      value_score,
      fit_score,
      final_score,
      reason_summary,
      customer_summary,
      reveal_locked,
      is_recommended,
      is_active
    )
    values (
      p_request_id,
      'online',
      p_research_item_id,
      null,
      v_actor_auth_user_id,
      v_rank,
      v_item.option_label,
      v_item.trust_score,
      v_item.value_score,
      v_item.fit_score,
      v_item.final_score,
      coalesce(p_reason_summary, 'Selected from research item'),
      p_customer_summary,
      coalesce(p_reveal_locked, true),
      coalesce(p_is_recommended, true),
      true
    )
    returning id into v_shortlist_id;
  end if;

  update public.research_items
  set
    is_shortlisted = true,
    is_candidate = true,
    updated_at = now()
  where id = p_research_item_id;

  return query
  select v_shortlist_id, p_request_id, p_research_item_id, v_rank;
end;
$$;


ALTER FUNCTION "public"."fn_shortlist_research_item"("p_request_id" "uuid", "p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_ranking_position" integer, "p_reason_summary" "text", "p_customer_summary" "text", "p_is_recommended" boolean, "p_reveal_locked" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_single_active_pricing_rule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_updated integer;
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate older active versions for that service
        UPDATE public.service_pricing_versions
        SET is_active = false
        WHERE service_key = NEW.service_key
          AND id <> NEW.id
          AND is_active = true;
          
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        
        -- Log conflict resolution event
        INSERT INTO public.pricing_event_logs 
            (service_type, pricing_version_id, event_type, description, old_status, new_status)
        VALUES (
            NEW.service_key, 
            NEW.id, 
            'activation', 
            'Activated pricing version ' || NEW.version_no || '. Automatically deactivated ' || v_rows_updated || ' old active record(s).',
            'multiple_active_check',
            'single_active'
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_single_active_pricing_rule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_single_active_pricing_rule_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_updated integer;
BEGIN
    -- Only enforce if the record is set to active and is currently active
    IF NEW.is_active = true AND NEW.status = 'active' THEN
        UPDATE public.service_pricing_versions
        SET is_active = false
        WHERE service_key = NEW.service_key
          AND id <> NEW.id
          AND is_active = true
          AND deleted_at IS NULL;
          
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        
        IF v_rows_updated > 0 THEN
            INSERT INTO public.pricing_event_logs 
                (service_type, pricing_version_id, event_type, description, old_status, new_status)
            VALUES (
                NEW.service_key, 
                NEW.id, 
                'activation', 
                'Activated pricing version ' || NEW.version_no || '. Auto deactivated ' || v_rows_updated || ' conflict active record(s).',
                'multiple_active_check',
                'single_active'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_single_active_pricing_rule_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_soft_delete_pricing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.service_pricing_versions
    SET deleted_at = now(),
        status = 'deleted',
        is_active = false
    WHERE id = OLD.id;
    
    -- Log soft delete event
    INSERT INTO public.pricing_event_logs 
        (service_type, pricing_version_id, event_type, description, old_status, new_status)
    VALUES (
        OLD.service_key, 
        OLD.id, 
        'deactivation', 
        'Soft-deleted pricing version ' || OLD.version_no,
        OLD.status,
        'deleted'
    );

    RETURN NULL; -- halts actual physical delete
END;
$$;


ALTER FUNCTION "public"."fn_soft_delete_pricing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_specializations_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."fn_specializations_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_staff_has_role"("p_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND (s.staff_role = 'admin' OR s.staff_role = 'owner' OR s.staff_role = p_role)
    ) OR EXISTS (
        SELECT 1 FROM public.staff_members s
        JOIN public.staff_member_roles r ON r.staff_member_id = s.id
        WHERE s.auth_user_id = auth.uid() 
        AND s.is_active = true
        AND r.is_active = true
        AND (r.role_code = p_role OR r.role_code = 'admin' OR r.role_code = 'owner')
    );
END;
$$;


ALTER FUNCTION "public"."fn_staff_has_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_staff_role"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select s.staff_role
from public.staff_members s
where s.auth_user_id = p_user_id
  and s.is_active = true
limit 1;
$$;


ALTER FUNCTION "public"."fn_staff_role"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_staff_role"("p_user_id" "uuid") IS 'Returns active staff role for the supplied or current auth user.';



CREATE OR REPLACE FUNCTION "public"."fn_staff_team"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select s.team_code
from public.staff_members s
where s.auth_user_id = p_user_id
  and s.is_active = true
limit 1;
$$;


ALTER FUNCTION "public"."fn_staff_team"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_staff_team"("p_user_id" "uuid") IS 'Returns active staff team for the supplied or current auth user.';



CREATE OR REPLACE FUNCTION "public"."fn_start_request_processing_after_approval"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text" DEFAULT NULL::"text", "p_force" boolean DEFAULT true) RETURNS TABLE("request_id" "uuid", "previous_status" "text", "new_status" "text", "created_jobs" integer, "search_scope" "text", "operational_stage" "text", "stage_status" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old_status text;
  v_new_status text;
  v_existing_jobs integer;
  v_search_scope text;
  v_operational_stage text;
  v_stage_status text;
  v_created_jobs integer;
  v_staff_auth_user_id uuid;
begin
  -- lock request row
  select r.current_status
  into v_old_status
  from public.requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found: %', p_request_id;
  end if;

  -- validate staff
  select s.auth_user_id
  into v_staff_auth_user_id
  from public.staff_members s
  where s.id = p_actor_staff_id
    and s.is_active = true;

  if v_staff_auth_user_id is null then
    raise exception 'Active staff member not found or not linked to auth user: %', p_actor_staff_id;
  end if;

  -- request must be accepted first
  if v_old_status <> 'accepted' then
    raise exception 'Request % must be accepted before starting processing. Current status: %', p_request_id, v_old_status;
  end if;

  -- blocked admin flags
  if exists (
    select 1
    from public.requests r
    where r.id = p_request_id
      and (
        coalesce(r.is_cancelled, false) = true
        or coalesce(r.is_archived, false) = true
        or coalesce(r.is_soft_deleted, false) = true
      )
  ) then
    raise exception 'Request % cannot be started because it is cancelled, archived, or soft-deleted', p_request_id;
  end if;

  -- if jobs already exist, return current pipeline state
  select count(*)
  into v_existing_jobs
  from public.agent_jobs j
  where j.request_id = p_request_id;

  if coalesce(v_existing_jobs, 0) > 0 then
    select rp.search_scope
    into v_search_scope
    from public.request_preferences rp
    where rp.request_id = p_request_id;

    select
      vpp.operational_stage,
      vpp.stage_status
    into
      v_operational_stage,
      v_stage_status
    from public.v_request_pipeline_progress vpp
    where vpp.request_id = p_request_id;

    return query
    select
      p_request_id,
      v_old_status,
      v_old_status,
      0,
      v_search_scope,
      v_operational_stage,
      v_stage_status;

    return;
  end if;

  -- create jobs using existing function
  select
    t.created_jobs,
    t.search_scope,
    t.operational_stage,
    t.stage_status
  into
    v_created_jobs,
    v_search_scope,
    v_operational_stage,
    v_stage_status
  from public.fn_submit_request_for_processing(
    p_request_id := p_request_id,
    p_note := coalesce(p_note, 'Start processing after approval'),
    p_force := p_force,
    p_actor_user_id := v_staff_auth_user_id
  ) t
  limit 1;

  v_new_status := 'accepted';

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
    p_request_id,
    'start_processing',
    coalesce(p_note, 'Start processing after approval'),
    p_actor_staff_id,
    v_old_status,
    v_new_status,
    jsonb_build_object(
      'created_jobs', coalesce(v_created_jobs, 0),
      'search_scope', v_search_scope,
      'operational_stage', v_operational_stage,
      'stage_status', v_stage_status
    )
  );

  return query
  select
    p_request_id,
    v_old_status,
    v_new_status,
    coalesce(v_created_jobs, 0),
    v_search_scope,
    v_operational_stage,
    v_stage_status;
end;
$$;


ALTER FUNCTION "public"."fn_start_request_processing_after_approval"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text", "p_force" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text" DEFAULT NULL::"text", "p_force" boolean DEFAULT false, "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("request_id" "uuid", "created_jobs" integer, "search_scope" "text", "operational_stage" "text", "stage_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_scope text;
  v_latest_decision text;
  v_customer_id uuid;
  v_subscription_id uuid;
  v_created_jobs integer := 0;
  v_rows integer := 0;
  v_actor uuid;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());

  perform public.fn_ensure_request_operational_state(p_request_id);

  select
    rp.search_scope
  into v_scope
  from public.request_preferences rp
  where rp.request_id = p_request_id;

  v_scope := coalesce(v_scope, 'online_and_offline');

  select
    lq.decision_recommendation
  into v_latest_decision
  from public.v_request_latest_qualification lq
  where lq.request_id = p_request_id;

  if v_latest_decision = 'reject' and not p_force then
    raise exception 'Latest qualification recommends reject; use force=true to override';
  end if;

  select
    r.customer_id
  into v_customer_id
  from public.requests r
  where r.id = p_request_id;

  select
    cs.id
  into v_subscription_id
  from public.customer_subscriptions cs
  where cs.customer_id = v_customer_id
    and cs.status = 'active'
  order by cs.started_at desc, cs.id desc
  limit 1;

  insert into public.usage_events (
    customer_id,
    subscription_id,
    request_id,
    event_type,
    quantity,
    occurred_at,
    metadata
  )
  select
    v_customer_id,
    v_subscription_id,
    p_request_id,
    'request_created',
    1,
    now(),
    jsonb_build_object('source', 'fn_submit_request_for_processing')
  where v_customer_id is not null
    and not exists (
      select 1
      from public.usage_events ue
      where ue.request_id = p_request_id
        and ue.event_type = 'request_created'
    );

  if v_scope in ('online_only', 'online_and_offline') then
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
      'online_research',
      'queued',
      5,
      null,
      jsonb_build_object('search_scope', v_scope),
      '{}'::jsonb,
      null
    where not exists (
      select 1
      from public.agent_jobs j
      where j.request_id = p_request_id
        and j.job_type = 'online_research'
        and j.status in ('queued','running','waiting_approval')
    );

    get diagnostics v_rows = row_count;
    v_created_jobs := v_created_jobs + v_rows;
  end if;

  if v_scope in ('offline_only', 'online_and_offline') then
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
      'offline_sourcing',
      'queued',
      5,
      null,
      jsonb_build_object('search_scope', v_scope),
      '{}'::jsonb,
      null
    where not exists (
      select 1
      from public.agent_jobs j
      where j.request_id = p_request_id
        and j.job_type = 'offline_sourcing'
        and j.status in ('queued','running','waiting_approval')
    );

    get diagnostics v_rows = row_count;
    v_created_jobs := v_created_jobs + v_rows;
  end if;

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
    x.job_type,
    'queued',
    x.priority,
    null,
    jsonb_build_object('search_scope', v_scope),
    '{}'::jsonb,
    null
  from (
    values
      ('ranking', 6),
      ('fusion', 7),
      ('client_report', 8)
  ) as x(job_type, priority)
  where not exists (
    select 1
    from public.agent_jobs j
    where j.request_id = p_request_id
      and j.job_type = x.job_type
      and j.status in ('queued','running','waiting_approval')
  );

  get diagnostics v_rows = row_count;
  v_created_jobs := v_created_jobs + v_rows;

  perform public.fn_set_request_operational_stage(
    p_request_id,
    'research',
    'in_progress',
    coalesce(p_note, 'Request submitted for processing'),
    v_actor,
    false,
    true,
    false
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
    'pipeline_submitted',
    'qualification',
    null,
    'research',
    'in_progress',
    coalesce(p_note, 'Pipeline submitted'),
    jsonb_build_object(
      'search_scope', v_scope,
      'latest_qualification_decision', v_latest_decision,
      'created_jobs', v_created_jobs,
      'forced', p_force
    )
  );

  return query
  select
    p_request_id,
    v_created_jobs,
    v_scope,
    s.operational_stage,
    s.stage_status
  from public.request_operational_states s
  where s.request_id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text", "p_force" boolean, "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text", "p_force" boolean, "p_actor_user_id" "uuid") IS 'Starts the operational pipeline for one request, logs request_created usage once, and queues jobs based on search scope.';



CREATE OR REPLACE FUNCTION "public"."fn_sync_customer_contacts_from_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_phone text;
  v_email text;
begin
  v_phone := coalesce(
    nullif(btrim(new.phone_number_normalized), ''),
    nullif(btrim(new.phone_number_raw), '')
  );

  v_email := case
    when nullif(btrim(new.email), '') is not null then lower(btrim(new.email))
    else null
  end;

  -- PHONE SYNC
  if v_phone is not null then
    update public.customer_contacts
    set
      is_primary = false,
      updated_at = now()
    where customer_id = new.id
      and contact_type = 'phone'
      and contact_value <> v_phone
      and is_primary = true;

    insert into public.customer_contacts (
      customer_id,
      contact_type,
      contact_value,
      is_primary,
      is_verified,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'phone',
      v_phone,
      true,
      (new.phone_verified_at is not null),
      'Synced from customers table',
      now(),
      now()
    )
    on conflict (customer_id, contact_type, contact_value)
    do update set
      is_primary = true,
      is_verified = excluded.is_verified,
      updated_at = now();
  end if;

  -- EMAIL SYNC
  if v_email is not null then
    update public.customer_contacts
    set
      is_primary = false,
      updated_at = now()
    where customer_id = new.id
      and contact_type = 'email'
      and contact_value <> v_email
      and is_primary = true;

    insert into public.customer_contacts (
      customer_id,
      contact_type,
      contact_value,
      is_primary,
      is_verified,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'email',
      v_email,
      true,
      false,
      'Synced from customers table',
      now(),
      now()
    )
    on conflict (customer_id, contact_type, contact_value)
    do update set
      is_primary = true,
      updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_sync_customer_contacts_from_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_customer_phone_verified"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. If phone_verified is explicitly set to true and phone_verified_at is NULL, set it to now()
  IF NEW.phone_verified = true AND NEW.phone_verified_at IS NULL THEN
    NEW.phone_verified_at := now();
  -- 2. If phone_verified is explicitly set to false/NULL and phone_verified_at is not NULL, clear it
  ELSIF (NEW.phone_verified IS NOT TRUE) AND NEW.phone_verified_at IS NOT NULL THEN
    NEW.phone_verified_at := NULL;
  -- 3. If phone_verified_at is set to non-NULL and phone_verified is not true, set it to true
  ELSIF NEW.phone_verified_at IS NOT NULL AND (NEW.phone_verified IS NOT TRUE) THEN
    NEW.phone_verified := true;
  -- 4. If phone_verified_at is set to NULL and phone_verified is true, set it to false
  ELSIF NEW.phone_verified_at IS NULL AND NEW.phone_verified = true THEN
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_customer_phone_verified"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_phone text;
  v_whatsapp text;
  v_email text;
begin
  v_phone := nullif(btrim(new.primary_phone), '');
  v_whatsapp := nullif(btrim(new.whatsapp), '');
  v_email := case
    when nullif(btrim(new.email), '') is not null then lower(btrim(new.email))
    else null
  end;

  -- PHONE
  if v_phone is not null then
    update public.merchant_contacts
    set
      is_primary = false,
      updated_at = now()
    where merchant_id = new.id
      and contact_type = 'phone'
      and contact_value <> v_phone
      and is_primary = true;

    insert into public.merchant_contacts (
      merchant_id,
      contact_type,
      contact_label,
      contact_value,
      is_primary,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'phone',
      'Primary phone',
      v_phone,
      true,
      'Synced from merchants table',
      now(),
      now()
    )
    on conflict (merchant_id, contact_type, contact_value)
    do update set
      is_primary = true,
      updated_at = now();
  end if;

  -- WHATSAPP
  if v_whatsapp is not null then
    update public.merchant_contacts
    set
      is_primary = false,
      updated_at = now()
    where merchant_id = new.id
      and contact_type = 'whatsapp'
      and contact_value <> v_whatsapp
      and is_primary = true;

    insert into public.merchant_contacts (
      merchant_id,
      contact_type,
      contact_label,
      contact_value,
      is_primary,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'whatsapp',
      'WhatsApp',
      v_whatsapp,
      true,
      'Synced from merchants table',
      now(),
      now()
    )
    on conflict (merchant_id, contact_type, contact_value)
    do update set
      is_primary = true,
      updated_at = now();
  end if;

  -- EMAIL
  if v_email is not null then
    update public.merchant_contacts
    set
      is_primary = false,
      updated_at = now()
    where merchant_id = new.id
      and contact_type = 'email'
      and contact_value <> v_email
      and is_primary = true;

    insert into public.merchant_contacts (
      merchant_id,
      contact_type,
      contact_label,
      contact_value,
      is_primary,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'email',
      'Email',
      v_email,
      true,
      'Synced from merchants table',
      now(),
      now()
    )
    on conflict (merchant_id, contact_type, contact_value)
    do update set
      is_primary = true,
      updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if nullif(btrim(new.website_url), '') is not null then
    insert into public.merchant_source_links (
      merchant_id,
      source_type,
      source_label,
      source_url,
      is_active,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'website',
      'Website',
      btrim(new.website_url),
      true,
      'Synced from merchants.website_url',
      now(),
      now()
    )
    on conflict (merchant_id, source_url) do update
    set
      is_active = true,
      updated_at = now();
  end if;

  if nullif(btrim(new.facebook_url), '') is not null then
    insert into public.merchant_source_links (
      merchant_id,
      source_type,
      source_label,
      source_url,
      is_active,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'facebook',
      'Facebook',
      btrim(new.facebook_url),
      true,
      'Synced from merchants.facebook_url',
      now(),
      now()
    )
    on conflict (merchant_id, source_url) do update
    set
      is_active = true,
      updated_at = now();
  end if;

  if nullif(btrim(new.instagram_url), '') is not null then
    insert into public.merchant_source_links (
      merchant_id,
      source_type,
      source_label,
      source_url,
      is_active,
      notes,
      created_at,
      updated_at
    )
    values (
      new.id,
      'instagram',
      'Instagram',
      btrim(new.instagram_url),
      true,
      'Synced from merchants.instagram_url',
      now(),
      now()
    )
    on conflict (merchant_id, source_url) do update
    set
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_pricing_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.service_key IS NOT NULL AND NEW.service_type IS NULL THEN
            NEW.service_type := NEW.service_key;
        ELSIF NEW.service_type IS NOT NULL AND NEW.service_key IS NULL THEN
            NEW.service_key := NEW.service_type;
        END IF;

        IF NEW.current_price IS NOT NULL AND NEW.promo_price IS NULL THEN
            NEW.promo_price := NEW.current_price;
        ELSIF NEW.promo_price IS NOT NULL AND NEW.current_price IS NULL THEN
            NEW.current_price := NEW.promo_price;
        END IF;

        IF NEW.currency_code IS NOT NULL AND NEW.currency IS NULL THEN
            NEW.currency := NEW.currency_code;
        ELSIF NEW.currency IS NOT NULL AND NEW.currency_code IS NULL THEN
            NEW.currency_code := NEW.currency;
        END IF;

        IF NEW.ends_at IS NOT NULL AND NEW.expires_at IS NULL THEN
            NEW.expires_at := NEW.ends_at;
        ELSIF NEW.expires_at IS NOT NULL AND NEW.ends_at IS NULL THEN
            NEW.ends_at := NEW.expires_at;
        END IF;

        IF NEW.created_by_staff_id IS NOT NULL AND NEW.created_by IS NULL THEN
            NEW.created_by := NEW.created_by_staff_id;
        ELSIF NEW.created_by IS NOT NULL AND NEW.created_by_staff_id IS NULL THEN
            NEW.created_by_staff_id := NEW.created_by;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.service_key IS DISTINCT FROM NEW.service_key THEN
            NEW.service_type := NEW.service_key;
        ELSIF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
            NEW.service_key := NEW.service_type;
        END IF;

        IF OLD.current_price IS DISTINCT FROM NEW.current_price THEN
            NEW.promo_price := NEW.current_price;
        ELSIF OLD.promo_price IS DISTINCT FROM NEW.promo_price THEN
            NEW.current_price := NEW.promo_price;
        END IF;

        IF OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
            NEW.currency := NEW.currency_code;
        ELSIF OLD.currency IS DISTINCT FROM NEW.currency THEN
            NEW.currency_code := NEW.currency;
        END IF;

        IF OLD.ends_at IS DISTINCT FROM NEW.ends_at THEN
            NEW.expires_at := NEW.ends_at;
        ELSIF OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
            NEW.ends_at := NEW.expires_at;
        END IF;

        IF OLD.created_by_staff_id IS DISTINCT FROM NEW.created_by_staff_id THEN
            NEW.created_by := NEW.created_by_staff_id;
        ELSIF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
            NEW.created_by_staff_id := NEW.created_by;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_pricing_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer DEFAULT 3) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
  v_inserted integer := 0;
begin
  select r.request_id
  into v_request_id
  from public.reports r
  where r.id = p_report_id;

  if v_request_id is null then
    raise exception 'Report % not found or has no request_id', p_report_id;
  end if;

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


COMMENT ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) IS 'Snapshots the current active shortlist into customer-facing report_option_snapshots for one report.';



CREATE OR REPLACE FUNCTION "public"."fn_sync_request_current_status"("p_request_id" "uuid") RETURNS TABLE("request_id" "uuid", "previous_status" "text", "new_status" "text", "customer_visible_status" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_prev text;
  v_new text;
  v_visible text;
begin
  select r.current_status
  into v_prev
  from public.requests r
  where r.id = p_request_id;

  if v_prev is null then
    raise exception 'Request not found: %', p_request_id;
  end if;

  select ui.customer_visible_status
  into v_visible
  from public.v_request_ui_status ui
  where ui.request_id = p_request_id;

  v_new := case
    when v_prev in ('closed', 'rejected', 'needs_clarification') then v_prev
    when v_visible in ('report_ready', 'partially_revealed', 'fully_revealed') then 'client_ready'
    else v_prev
  end;

  if v_new is distinct from v_prev then
    update public.requests r
    set
      current_status = v_new,
      updated_at = now()
    where r.id = p_request_id;
  end if;

  return query
  select
    p_request_id,
    v_prev,
    v_new,
    coalesce(v_visible, v_new);
end;
$$;


ALTER FUNCTION "public"."fn_sync_request_current_status"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_request_status_to_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.customer_requests
    SET status = CASE 
        WHEN NEW.canonical_state = 'COMPLETED' THEN 'fulfilled'
        WHEN NEW.canonical_state = 'ARCHIVED' THEN 'cancelled'
        ELSE 'processing'
    END,
    updated_at = now()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_request_status_to_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") RETURNS TABLE("request_id" "uuid", "request_code" "text", "customer_id" "uuid", "customer_name" "text", "title" "text", "raw_description" "text", "current_status" "text", "customer_visible_status" "text", "source_channel" "text", "preferred_language" "text", "search_scope" "text", "operational_stage" "text", "stage_status" "text", "pipeline_completion_pct" numeric, "customer_reveal_completion_pct" numeric, "reports_count" bigint, "latest_report_id" "uuid", "latest_report_status" "text", "latest_report_created_at" timestamp with time zone, "snapshot_count" bigint, "unlock_count" bigint, "client_released_at" timestamp with time zone, "request_created_at" timestamp with time zone, "request_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_phone text;
begin
  if p_request_code is null or btrim(p_request_code) = '' then
    raise exception 'Request code is required';
  end if;

  v_phone := public.fn_normalize_phone_eg(p_phone_input);

  if v_phone is null then
    raise exception 'Valid phone is required';
  end if;

  return query
  select
    v.request_id,
    v.request_code,
    v.customer_id,
    v.customer_name,
    v.title,
    v.raw_description,
    v.current_status,
    v.customer_visible_status,
    v.source_channel,
    v.preferred_language,
    v.search_scope,
    v.operational_stage,
    v.stage_status,
    v.pipeline_completion_pct,
    v.customer_reveal_completion_pct,
    v.reports_count,
    v.latest_report_id,
    v.latest_report_status,
    v.latest_report_created_at,
    v.snapshot_count,
    v.unlock_count,
    v.client_released_at,
    v.request_created_at,
    v.request_updated_at
  from public.v_guest_request_tracking_overview v
  join public.customers c
    on c.id = v.customer_id
  where upper(btrim(v.request_code)) = upper(btrim(p_request_code))
    and (
      c.phone_number_normalized = v_phone
      or public.fn_normalize_phone_eg(c.phone_number_raw) = v_phone
      or exists (
        select 1
        from public.customer_contacts cc
        where cc.customer_id = c.id
          and cc.contact_type in ('phone', 'whatsapp')
          and public.fn_normalize_phone_eg(cc.contact_value) = v_phone
      )
    )
  order by v.request_created_at desc
  limit 1;
end;
$$;


ALTER FUNCTION "public"."fn_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") RETURNS TABLE("unlock_status" "text", "report_option_snapshot_id" "uuid", "customer_id" "uuid", "request_id" "uuid", "reveals_remaining" integer)
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
begin
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


COMMENT ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") IS 'Unlocks one report option snapshot for the current authenticated customer if within plan allowance. Logs usage.';



CREATE OR REPLACE FUNCTION "public"."fn_update_contributor_trust_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_avg_rating numeric;
  v_score_delta integer;
  v_new_score integer;
BEGIN
  SELECT COALESCE(AVG(rating), 3.0) INTO v_avg_rating
  FROM public.contributor_reviews
  WHERE contributor_id = NEW.contributor_id;

  v_score_delta := CASE
    WHEN v_avg_rating >= 4.5 THEN 10
    WHEN v_avg_rating >= 3.5 THEN 5
    WHEN v_avg_rating >= 2.5 THEN 0
    WHEN v_avg_rating >= 1.5 THEN -10
    ELSE -20
  END;

  SELECT LEAST(100, GREATEST(0, trust_score + v_score_delta)) INTO v_new_score
  FROM public.contributors
  WHERE id = NEW.contributor_id;

  UPDATE public.contributors
  SET trust_score = v_new_score
  WHERE id = NEW.contributor_id;

  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."fn_update_contributor_trust_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_vendor_activate"("p_vendor_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.vendors SET system_status = 'Active' WHERE id = p_vendor_id;
  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, new_value)
  VALUES (p_vendor_id, p_actor_id, 'VENDOR_ACTIVATED', '{}');
END;
$$;


ALTER FUNCTION "public"."fn_vendor_activate"("p_vendor_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_vendor_adjust_trust"("p_vendor_id" "uuid", "p_delta" integer, "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_score  integer;
  v_new_score  integer;
BEGIN
  SELECT trust_score INTO v_old_score FROM public.vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found'; END IF;

  v_new_score := GREATEST(0, LEAST(100, v_old_score + p_delta));

  UPDATE public.vendors SET trust_score = v_new_score WHERE id = p_vendor_id;

  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, old_value, new_value)
  VALUES (
    p_vendor_id, p_actor_id, 'TRUST_SCORE_ADJUSTED',
    jsonb_build_object('trust_score', v_old_score),
    jsonb_build_object('trust_score', v_new_score, 'delta', p_delta, 'reason', p_reason)
  );

  RETURN jsonb_build_object('old_score', v_old_score, 'new_score', v_new_score);
END;
$$;


ALTER FUNCTION "public"."fn_vendor_adjust_trust"("p_vendor_id" "uuid", "p_delta" integer, "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_vendor_suspend"("p_vendor_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.vendors SET system_status = 'Suspended' WHERE id = p_vendor_id;
  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, new_value)
  VALUES (p_vendor_id, p_actor_id, 'VENDOR_SUSPENDED',
          jsonb_build_object('reason', p_reason));
END;
$$;


ALTER FUNCTION "public"."fn_vendor_suspend"("p_vendor_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_vendors_calc_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.account_tier :=
    CASE
      WHEN NEW.trust_score >= 90 THEN 'Gold'
      WHEN NEW.trust_score >= 70 THEN 'Silver'
      ELSE 'Bronze'
    END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_vendors_calc_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_vendors_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_vendors_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_wallet_reconciliation_check"() RETURNS TABLE("wallet_id" "uuid", "contributor_id" "uuid", "expected_total" numeric, "actual_total" numeric, "difference" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS wallet_id,
    w.contributor_id,
    COALESCE(t.expected_sum, 0.00) AS expected_total,
    (w.balance_egp + w.pending_withdrawal_egp) AS actual_total,
    (COALESCE(t.expected_sum, 0.00) - (w.balance_egp + w.pending_withdrawal_egp)) AS difference
  FROM public.contributor_wallets w
  LEFT JOIN (
    SELECT 
      tx.wallet_id,
      SUM(tx.amount_egp) AS expected_sum
    FROM public.wallet_transactions tx
    WHERE tx.tx_type != 'withdrawal_hold' AND tx.status != 'pending'
    GROUP BY tx.wallet_id
  ) t ON w.id = t.wallet_id
  WHERE ABS(COALESCE(t.expected_sum, 0.00) - (w.balance_egp + w.pending_withdrawal_egp)) > 0.001;
END; $$;


ALTER FUNCTION "public"."fn_wallet_reconciliation_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_job_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "log_level" "text" DEFAULT 'info'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_job_logs_log_level_check" CHECK (("log_level" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."agent_job_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "priority" smallint DEFAULT 5 NOT NULL,
    "assigned_to_user_id" "uuid",
    "depends_on_job_id" "uuid",
    "input_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "output_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "output_summary" "text",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['qualification'::"text", 'online_research'::"text", 'offline_sourcing'::"text", 'ranking'::"text", 'fusion'::"text", 'client_report'::"text", 'source_reveal'::"text", 'notify_customer'::"text"]))),
    CONSTRAINT "agent_jobs_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 9))),
    CONSTRAINT "agent_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'waiting_approval'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "agent_jobs_time_check" CHECK ((("finished_at" IS NULL) OR ("started_at" IS NULL) OR ("finished_at" >= "started_at")))
);


ALTER TABLE "public"."agent_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_agent_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_code" "text" NOT NULL,
    "enabled" boolean DEFAULT false,
    "provider" "text" DEFAULT 'disabled'::"text" NOT NULL,
    "model" "text",
    "temperature" numeric DEFAULT 0.2,
    "max_tokens" integer DEFAULT 1500,
    "daily_limit" integer DEFAULT 100,
    "monthly_limit" integer DEFAULT 1000,
    "max_search_results" integer DEFAULT 10,
    "allow_create_draft" boolean DEFAULT true,
    "allow_create_research_items" boolean DEFAULT false,
    "allow_suggest_report_snapshots" boolean DEFAULT false,
    "prompt_version" "text" DEFAULT 'v1'::"text",
    "safety_level" "text" DEFAULT 'strict'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "system_prompt_override" "text"
);


ALTER TABLE "public"."ai_agent_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_copilot_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "staff_id" "uuid",
    "agent_code" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text",
    "input_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "output_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "error_message" "text",
    "token_estimate" integer DEFAULT 0,
    "cost_estimate" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_copilot_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_response_cache" (
    "cache_key" "text" NOT NULL,
    "feature_key" character varying(255) NOT NULL,
    "response_value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."ai_response_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_response_cache" IS 'Stores cached AI results for cost and performance optimization';



CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text",
    "estimated_cost" numeric DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "trigger_price" numeric(12,2) NOT NULL,
    "old_price" numeric(12,2) NOT NULL,
    "savings_amount" numeric(12,2),
    "savings_pct" numeric(8,4),
    "channel" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "retry_count" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alert_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allowed_link_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text" NOT NULL,
    "label" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "added_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."allowed_link_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "related_entity_type" "text" NOT NULL,
    "related_entity_id" "uuid",
    "approval_type" "text" NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approval_notes" "text",
    "approved_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approved_by_user_id" "uuid"
);


ALTER TABLE "public"."approvals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."approvals"."approved_by_user_id" IS 'Normalized approver user id. Keep approved_by text as legacy human-readable audit field.';



CREATE TABLE IF NOT EXISTS "public"."bonus_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "multiplier_boost" numeric(3,2) DEFAULT 0.00 NOT NULL,
    "target_role" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_staff_id" "uuid"
);


ALTER TABLE "public"."bonus_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buyer_qa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" "text" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text",
    "asker_id" "uuid" NOT NULL,
    "answerer_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "buyer_qa_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'answered'::"text", 'flagged'::"text"])))
);


ALTER TABLE "public"."buyer_qa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "preferred_channel" "text" DEFAULT 'email'::"text",
    "allow_marketing" boolean DEFAULT true,
    "allow_status_updates" boolean DEFAULT true,
    "language_preference" "text" DEFAULT 'ar'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communication_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_code" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "language_code" "text" DEFAULT 'ar'::"text" NOT NULL,
    "subject_template" "text",
    "body_template" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communication_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_experiments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "hypothesis" "text",
    "methodology" "text",
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "impact_analysis" "text",
    "created_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_experiments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitor_feature_comparisons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competitor_id" "uuid",
    "feature_name_en" "text" NOT NULL,
    "feature_name_ar" "text" NOT NULL,
    "status_in_competitor_en" "text" NOT NULL,
    "status_in_competitor_ar" "text" NOT NULL,
    "required_phase_number" integer NOT NULL,
    "advantage_desc_en" "text" NOT NULL,
    "advantage_desc_ar" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."competitor_feature_comparisons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "category_en" "text" NOT NULL,
    "category_ar" "text" NOT NULL,
    "strength_rating" integer DEFAULT 3,
    "gap_analysis_en" "text",
    "gap_analysis_ar" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "competitors_strength_rating_check" CHECK ((("strength_rating" >= 1) AND ("strength_rating" <= 5)))
);


ALTER TABLE "public"."competitors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_code" "text" NOT NULL,
    "rule_name_en" "text" NOT NULL,
    "rule_name_ar" "text" NOT NULL,
    "rule_category" "text" NOT NULL,
    "decision_mode" "text" NOT NULL,
    "severity_level" integer DEFAULT 3 NOT NULL,
    "applies_to_products" boolean DEFAULT true NOT NULL,
    "applies_to_services" boolean DEFAULT true NOT NULL,
    "keywords_ar" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "keywords_en" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "requires_human_confirmation" boolean DEFAULT true NOT NULL,
    "legal_note" "text",
    "internal_note" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "compliance_rules_decision_mode_check" CHECK (("decision_mode" = ANY (ARRAY['blocked'::"text", 'manual_review'::"text", 'warning_only'::"text"]))),
    CONSTRAINT "compliance_rules_rule_category_check" CHECK (("rule_category" = ANY (ARRAY['illegal'::"text", 'regulated'::"text", 'unsupported'::"text", 'policy_restricted'::"text", 'religious_restricted'::"text", 'fraud_risk'::"text", 'safety_risk'::"text"]))),
    CONSTRAINT "compliance_rules_severity_level_check" CHECK ((("severity_level" >= 1) AND ("severity_level" <= 5)))
);


ALTER TABLE "public"."compliance_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "body_en" "text",
    "body_ar" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contributor_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "badge_type" "text" NOT NULL,
    "badge_label_en" "text" NOT NULL,
    "badge_label_ar" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contributor_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_device_fingerprints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "screen_fingerprint" "text",
    "timezone" "text",
    "is_flagged" boolean DEFAULT false NOT NULL,
    "flag_reason" "text",
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contributor_device_fingerprints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_hr_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "fraud_audit_id" "uuid" NOT NULL,
    "review_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "staff_reviewer_id" "uuid",
    "staff_notes" "text",
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_hr_reviews_review_status_check" CHECK (("review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."contributor_hr_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_number" integer NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "required_active_referrals" integer NOT NULL,
    "cash_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "monthly_cap_egp" numeric(12,2),
    "unlocked_features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "badge_color" "text" DEFAULT 'hsl(220, 10%, 60%)'::"text" NOT NULL,
    "badge_icon" "text" DEFAULT '⭐️'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "required_trust_score" integer DEFAULT 50,
    "required_lifetime_points" integer DEFAULT 0
);


ALTER TABLE "public"."contributor_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid",
    "message_ar" "text" NOT NULL,
    "message_en" "text" NOT NULL,
    "type" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contributor_notifications_type_check" CHECK (("type" = ANY (ARRAY['warning'::"text", 'success'::"text", 'info'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."contributor_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_id" "uuid" NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'signed_up'::"text" NOT NULL,
    "first_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_referrals_level_check" CHECK (("level" = ANY (ARRAY[1, 2]))),
    CONSTRAINT "contributor_referrals_status_check" CHECK (("status" = ANY (ARRAY['signed_up'::"text", 'approved'::"text", 'active'::"text", 'inactive'::"text", 'frozen'::"text", 'earning'::"text"])))
);


ALTER TABLE "public"."contributor_referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."contributor_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_risk_scores" (
    "contributor_id" "uuid" NOT NULL,
    "risk_score" integer DEFAULT 0 NOT NULL,
    "account_state" "text" DEFAULT 'safe'::"text" NOT NULL,
    "last_evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_risk_scores_account_state_check" CHECK (("account_state" = ANY (ARRAY['safe'::"text", 'suspicious'::"text", 'blocked'::"text"]))),
    CONSTRAINT "contributor_risk_scores_risk_score_check" CHECK ((("risk_score" >= 0) AND ("risk_score" <= 100)))
);


ALTER TABLE "public"."contributor_risk_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_scarcity_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "max_slots" integer DEFAULT 50 NOT NULL,
    "taken_slots" integer DEFAULT 0 NOT NULL,
    "closes_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_scarcity_limits_check" CHECK (("taken_slots" <= "max_slots")),
    CONSTRAINT "contributor_scarcity_limits_max_slots_check" CHECK (("max_slots" >= 0))
);


ALTER TABLE "public"."contributor_scarcity_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_streaks" (
    "contributor_id" "uuid" NOT NULL,
    "daily_streak_count" integer DEFAULT 0 NOT NULL,
    "weekly_streak_count" integer DEFAULT 0 NOT NULL,
    "monthly_streak_count" integer DEFAULT 0 NOT NULL,
    "best_daily_streak" integer DEFAULT 0 NOT NULL,
    "last_active_date" "date",
    "streak_bonus_active" boolean DEFAULT false NOT NULL,
    "streak_multiplier" numeric(4,2) DEFAULT 1.00 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_streaks_daily_streak_count_check" CHECK (("daily_streak_count" >= 0)),
    CONSTRAINT "contributor_streaks_monthly_streak_count_check" CHECK (("monthly_streak_count" >= 0)),
    CONSTRAINT "contributor_streaks_weekly_streak_count_check" CHECK (("weekly_streak_count" >= 0))
);


ALTER TABLE "public"."contributor_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "submission_type" "text" NOT NULL,
    "product_id" "uuid",
    "vendor_id" "uuid",
    "price_reported" numeric(12,2),
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "contributor_submissions_submission_type_check" CHECK (("submission_type" = ANY (ARRAY['price_report'::"text", 'product_link'::"text", 'vendor_offer'::"text"])))
);


ALTER TABLE "public"."contributor_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_verification_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "id_front_path" "text",
    "id_back_path" "text",
    "selfie_path" "text",
    "phone_number" "text" NOT NULL,
    "otp_verified" boolean DEFAULT false NOT NULL,
    "otp_verified_at" timestamp with time zone,
    "ai_screening_result" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_risk_flags" "text"[] DEFAULT '{}'::"text"[],
    "ai_confidence_score" numeric(5,2),
    "hr_decision" "text" DEFAULT 'pending'::"text" NOT NULL,
    "hr_reviewer_staff_id" "uuid",
    "hr_notes" "text",
    "hr_decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_verification_requests_hr_decision_check" CHECK (("hr_decision" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'info_requested'::"text"])))
);


ALTER TABLE "public"."contributor_verification_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "balance_egp" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "points_balance" integer DEFAULT 0 NOT NULL,
    "pending_withdrawal_egp" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "lifetime_earned_egp" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "lifetime_withdrawn_egp" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "last_transaction_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "credit_balance" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "is_frozen" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_balance_non_negative" CHECK (("balance_egp" >= 0.00)),
    CONSTRAINT "contributor_wallets_balance_egp_check" CHECK (("balance_egp" >= (0)::numeric)),
    CONSTRAINT "contributor_wallets_credit_balance_check" CHECK (("credit_balance" >= (0)::numeric)),
    CONSTRAINT "contributor_wallets_pending_withdrawal_egp_check" CHECK (("pending_withdrawal_egp" >= (0)::numeric)),
    CONSTRAINT "contributor_wallets_points_balance_check" CHECK (("points_balance" >= 0))
);


ALTER TABLE "public"."contributor_wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributor_withdrawals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "amount_egp" numeric(12,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_details" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fraud_audit_id" "uuid",
    "staff_reviewer_id" "uuid",
    "rejection_reason" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributor_withdrawals_amount_egp_check" CHECK (("amount_egp" > (0)::numeric)),
    CONSTRAINT "contributor_withdrawals_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['instapay'::"text", 'vodafone_cash'::"text", 'bank_transfer'::"text"]))),
    CONSTRAINT "contributor_withdrawals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'rejected'::"text", 'held_for_review'::"text"])))
);


ALTER TABLE "public"."contributor_withdrawals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "role" "text" DEFAULT 'casual'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "national_id_number" "text",
    "governorate" "text",
    "referral_code" "text" NOT NULL,
    "referred_by_id" "uuid",
    "referral_count" integer DEFAULT 0 NOT NULL,
    "active_referral_count" integer DEFAULT 0 NOT NULL,
    "trust_score" integer DEFAULT 50 NOT NULL,
    "network_health_score" numeric(5,2) DEFAULT 100 NOT NULL,
    "earning_multiplier" numeric(5,2) DEFAULT 1.0 NOT NULL,
    "monthly_cap_egp" numeric(12,2),
    "phone_verified_at" timestamp with time zone,
    "id_verified_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decay_multiplier" numeric DEFAULT 1.0,
    "active_network_count" integer DEFAULT 0,
    "referral_bonus_earned_egp" numeric(12,2) DEFAULT 0.00,
    "last_ip_address" "text",
    "device_fingerprint" "text",
    "failed_withdrawal_attempts" integer DEFAULT 0,
    CONSTRAINT "contributors_role_check" CHECK (("role" = ANY (ARRAY['field_scout'::"text", 'store_insider'::"text", 'casual'::"text"]))),
    CONSTRAINT "contributors_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'active'::"text", 'suspended'::"text", 'under_review'::"text", 'frozen'::"text"]))),
    CONSTRAINT "contributors_trust_score_check" CHECK ((("trust_score" >= 0) AND ("trust_score" <= 100)))
);


ALTER TABLE "public"."contributors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_ads_performances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "reach" integer DEFAULT 0,
    "spend" numeric(12,2) DEFAULT 0.00,
    "leads" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "best_post_desc" "text",
    "deals" integer DEFAULT 0,
    "status" "text" DEFAULT 'not_started'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_ads_performances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contact_type" "text" NOT NULL,
    "contact_value" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_contacts_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['phone'::"text", 'email'::"text", 'whatsapp'::"text", 'telegram'::"text", 'other'::"text"]))),
    CONSTRAINT "customer_contacts_contact_value_not_blank_check" CHECK (("btrim"("contact_value") <> ''::"text"))
);


ALTER TABLE "public"."customer_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_discovery_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "interviewer_id" "uuid",
    "what_wanted_to_buy" "text",
    "how_searches_currently" "text",
    "biggest_frustration" "text",
    "will_pay" boolean DEFAULT false,
    "potential_commission_egp" numeric(12,2) DEFAULT 0.00,
    "additional_notes" "text",
    "visited_pages" "text",
    "used_features" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_discovery_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "dispute_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolution_notes" "text",
    "staff_reviewer_id" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_disputes_dispute_type_check" CHECK (("dispute_type" = ANY (ARRAY['wrong_item'::"text", 'not_delivered'::"text", 'quality_issue'::"text", 'overcharged'::"text", 'fraud'::"text", 'other'::"text"]))),
    CONSTRAINT "customer_disputes_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'under_review'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."customer_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_fee_phases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phase_name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "is_current_phase" boolean DEFAULT false NOT NULL,
    "fee_amount_egp" numeric DEFAULT 0 NOT NULL,
    "first_request_free_with_verified_phone" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_fee_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_intelligence_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "request_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_intelligence_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_points_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "action_type" "text" NOT NULL,
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_points_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_code" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "governorate" "text",
    "preferred_language" "text" DEFAULT 'ar'::"text" NOT NULL,
    "preferred_contact_method" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "phone_number_raw" "text",
    "phone_number_normalized" "text",
    "phone_verified_at" timestamp with time zone,
    "email" "text",
    "free_trial_used_at" timestamp with time zone,
    "block_reason" "text",
    "blocked_at" timestamp with time zone,
    "is_archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "has_used_free_first_request" boolean DEFAULT false NOT NULL,
    "phone_verified" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."auth_user_id" IS 'Normalized link to Supabase auth.users(id). One customer record per auth user.';



CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_code" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "title" "text",
    "raw_description" "text" NOT NULL,
    "interpreted_summary" "text",
    "current_status" "text" DEFAULT 'new'::"text" NOT NULL,
    "source_channel" "text" DEFAULT 'landing_page'::"text" NOT NULL,
    "turnaround_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "intake_ai_decision" "text",
    "intake_ai_confidence" numeric(5,4),
    "intake_reason_code" "text",
    "intake_summary" "text",
    "intake_internal_reasoning" "text",
    "intake_clarification_questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "intake_reviewer_note" "text",
    "reviewer_decision" "text",
    "reviewer_decided_by_staff_id" "uuid",
    "reviewer_decided_at" timestamp with time zone,
    "reviewer_notes" "text",
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "clarification_requested_at" timestamp with time zone,
    "is_cancelled" boolean DEFAULT false NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_by_staff_id" "uuid",
    "cancellation_reason" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by_staff_id" "uuid",
    "archive_reason" "text",
    "is_soft_deleted" boolean DEFAULT false NOT NULL,
    "soft_deleted_at" timestamp with time zone,
    "soft_deleted_by_staff_id" "uuid",
    "soft_delete_reason" "text",
    "request_kind" "text",
    "intake_mode" "text" DEFAULT 'quick'::"text" NOT NULL,
    "pricing_decision" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "service_fee_amount" numeric,
    "execution_requested" boolean DEFAULT false NOT NULL,
    "followup_requested" boolean DEFAULT false NOT NULL,
    "site_visit_requested" boolean DEFAULT false NOT NULL,
    "pricing_notes" "text",
    "reference_image_path" "text",
    "assigned_reviewer_staff_id" "uuid",
    "reviewer_assignment_status" "text" DEFAULT 'unassigned'::"text" NOT NULL,
    "reviewer_assigned_at" timestamp with time zone,
    "reviewer_assigned_by_staff_id" "uuid",
    "archived_by_user_id" "uuid",
    "operations_entered_at" timestamp with time zone,
    "reporting_entered_at" timestamp with time zone,
    "ready_entered_at" timestamp with time zone,
    "pricing_model" "text",
    "payment_policy" "text",
    "budget" numeric(12,2),
    "city" "text",
    "accepts_used" boolean DEFAULT false,
    "priority" "text" DEFAULT 'price'::"text",
    "auction_duration_hours" integer DEFAULT 24,
    "auction_ends_at" timestamp with time zone,
    "selected_bid_id" "uuid",
    "is_recurring" boolean DEFAULT false,
    "reorder_interval_months" integer DEFAULT 0,
    "last_reordered_at" timestamp with time zone,
    "is_business" boolean DEFAULT false,
    "business_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "rfq_document" "text",
    "canonical_state" "text" DEFAULT 'UNKNOWN'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_confidence" numeric,
    "source_type" "text" DEFAULT 'manual'::"text",
    CONSTRAINT "ck_payment_policy" CHECK ((("payment_policy" IS NULL) OR ("payment_policy" = ANY (ARRAY['pay_after_preview'::"text", 'upfront_deposit'::"text", 'milestone_plan'::"text", 'custom_agreement'::"text"])))),
    CONSTRAINT "ck_pricing_model" CHECK ((("pricing_model" IS NULL) OR ("pricing_model" = ANY (ARRAY['fixed_fee'::"text", 'percentage_fee'::"text", 'fixed_plus_percentage'::"text", 'custom_quote'::"text", 'retainer'::"text"])))),
    CONSTRAINT "ck_requests_source_type" CHECK (("source_type" = ANY (ARRAY['manual'::"text", 'ai_text'::"text", 'ai_voice'::"text", 'ai_image'::"text", 'product_link'::"text"]))),
    CONSTRAINT "ck_reviewer_assignment_consistency" CHECK (((("reviewer_assignment_status" = 'unassigned'::"text") AND ("assigned_reviewer_staff_id" IS NULL) AND ("reviewer_assigned_at" IS NULL) AND ("reviewer_assigned_by_staff_id" IS NULL)) OR (("reviewer_assignment_status" = 'assigned'::"text") AND ("assigned_reviewer_staff_id" IS NOT NULL)))),
    CONSTRAINT "ck_reviewer_assignment_status" CHECK (("reviewer_assignment_status" = ANY (ARRAY['unassigned'::"text", 'assigned'::"text"]))),
    CONSTRAINT "requests_intake_mode_check" CHECK (("intake_mode" = ANY (ARRAY['quick'::"text", 'detailed'::"text", 'admin'::"text"]))),
    CONSTRAINT "requests_pricing_decision_check" CHECK (("pricing_decision" = ANY (ARRAY['pending_review'::"text", 'fixed_fee'::"text", 'review_required'::"text", 'quoted'::"text", 'waived'::"text"]))),
    CONSTRAINT "requests_request_kind_check" CHECK ((("request_kind" IS NULL) OR ("request_kind" = ANY (ARRAY['everyday_purchase'::"text", 'high_value_asset'::"text", 'project_supply'::"text", 'general'::"text"])))),
    CONSTRAINT "requests_service_fee_amount_check" CHECK ((("service_fee_amount" IS NULL) OR ("service_fee_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_reliability_stats" AS
 SELECT "c"."id" AS "customer_id",
    COALESCE("r"."total_requests", (0)::bigint) AS "total_requests",
    COALESCE("r"."completed_requests", (0)::bigint) AS "completed_requests",
        CASE
            WHEN (COALESCE("r"."total_requests", (0)::bigint) = 0) THEN 100.0
            ELSE "round"((((COALESCE("r"."completed_requests", (0)::bigint))::numeric / ("r"."total_requests")::numeric) * (100)::numeric), 2)
        END AS "purchase_rate",
        CASE
            WHEN (COALESCE("r"."total_requests", (0)::bigint) = 0) THEN 95.0
            ELSE GREATEST("round"((100.0 - (((COALESCE("r"."abandoned_requests", (0)::bigint))::numeric / ("r"."total_requests")::numeric) * (100)::numeric)), 2), (0)::numeric)
        END AS "response_rate",
        CASE
            WHEN (COALESCE("r"."total_requests", (0)::bigint) = 0) THEN NULL::numeric
            ELSE "round"((((0.6 * ((COALESCE("r"."completed_requests", (0)::bigint))::numeric / ("r"."total_requests")::numeric)) * (100)::numeric) + (0.4 * GREATEST((100.0 - (((COALESCE("r"."abandoned_requests", (0)::bigint))::numeric / ("r"."total_requests")::numeric) * (100)::numeric)), (0)::numeric))), 2)
        END AS "reliability_score"
   FROM ("public"."customers" "c"
     LEFT JOIN ( SELECT "requests"."customer_id",
            "count"("requests"."id") AS "total_requests",
            "count"("requests"."id") FILTER (WHERE (("requests"."selected_bid_id" IS NOT NULL) OR ("requests"."current_status" = ANY (ARRAY['completed'::"text", 'released'::"text"])))) AS "completed_requests",
            "count"("requests"."id") FILTER (WHERE (("requests"."current_status" = ANY (ARRAY['cancelled'::"text", 'expired'::"text"])) AND ("requests"."selected_bid_id" IS NULL))) AS "abandoned_requests"
           FROM "public"."requests"
          GROUP BY "requests"."customer_id") "r" ON (("r"."customer_id" = "c"."id")));


ALTER VIEW "public"."customer_reliability_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "product_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "target_location" "text" NOT NULL,
    "max_price" numeric(10,2),
    "additional_notes" "text",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "is_expanded_by_ai" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_deal_id" "uuid",
    CONSTRAINT "customer_requests_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'fulfilled'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."customer_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_score_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "seriousness_score" numeric(5,2),
    "loyalty_score" numeric(5,2),
    "conversion_score" numeric(5,2),
    "calculated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_score_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "segment_code" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "auto_renew" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "customer_subscriptions_time_check" CHECK ((("ends_at" IS NULL) OR ("ends_at" >= "started_at")))
);


ALTER TABLE "public"."customer_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_verification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contact_type" "text" DEFAULT 'phone'::"text" NOT NULL,
    "contact_value" "text",
    "event_type" "text" NOT NULL,
    "actor_staff_id" "uuid",
    "note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_verification_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_moat_weekly_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recorded_date" "date" DEFAULT CURRENT_DATE,
    "collected_prices" integer DEFAULT 0 NOT NULL,
    "unique_products" integer DEFAULT 0 NOT NULL,
    "verified_merchants" integer DEFAULT 0 NOT NULL,
    "real_reviews" integer DEFAULT 0 NOT NULL,
    "completed_deals" integer DEFAULT 0 NOT NULL,
    "negotiation_data" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_moat_weekly_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."economy_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "is_system_controlled" boolean DEFAULT false NOT NULL,
    "updated_by_staff_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'enabled'::"text" NOT NULL,
    "daily_limit" integer,
    "monthly_limit" integer
);


ALTER TABLE "public"."economy_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."economy_stabilizer_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "trigger_metric" "text",
    "trigger_value" numeric,
    "threshold_value" numeric,
    "action_taken" "text",
    "old_multiplier" numeric(5,2),
    "new_multiplier" numeric(5,2),
    "triggered_by" "text" DEFAULT 'cron'::"text" NOT NULL,
    "staff_override_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "economy_stabilizer_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['warning_triggered'::"text", 'critical_triggered'::"text", 'multiplier_reduced'::"text", 'multiplier_restored'::"text", 'admin_override'::"text", 'system_frozen'::"text"])))
);


ALTER TABLE "public"."economy_stabilizer_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."economy_stabilizer_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "total_payouts_egp" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_referral_rewards_egp" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_task_rewards_egp" numeric(14,2) DEFAULT 0 NOT NULL,
    "active_contributors" integer DEFAULT 0 NOT NULL,
    "new_contributors" integer DEFAULT 0 NOT NULL,
    "new_referrals" integer DEFAULT 0 NOT NULL,
    "payout_growth_pct_wow" numeric(7,2),
    "contributor_growth_pct_wow" numeric(7,2),
    "stabilizer_status" "text" DEFAULT 'normal'::"text" NOT NULL,
    "multiplier_adjustment" numeric(5,2) DEFAULT 1.0 NOT NULL,
    "auto_action_taken" "text",
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "economy_stabilizer_snapshots_stabilizer_status_check" CHECK (("stabilizer_status" = ANY (ARRAY['normal'::"text", 'warning'::"text", 'critical'::"text", 'frozen'::"text"])))
);


ALTER TABLE "public"."economy_stabilizer_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "title" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'ai_concierge'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flag_key" "text" NOT NULL,
    "old_value" boolean,
    "new_value" boolean,
    "changed_by" "uuid",
    "changed_by_role" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_flags_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" character varying(20) NOT NULL,
    "name_en" character varying(255) NOT NULL,
    "name_ar" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "financial_categories_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['INCOME'::character varying, 'EXPENSE'::character varying])::"text"[])))
);


ALTER TABLE "public"."financial_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" character varying(20) NOT NULL,
    "category_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'EGP'::character varying NOT NULL,
    "description" "text",
    "transaction_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "financial_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "financial_transactions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['INCOME'::character varying, 'EXPENSE'::character varying])::"text"[])))
);


ALTER TABLE "public"."financial_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."findora_deal_inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid",
    "customer_id" "uuid",
    "customer_name" "text",
    "customer_phone" "text" NOT NULL,
    "customer_email" "text",
    "notes" "text",
    "inquiry_status" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ck_inquiry_status" CHECK (("inquiry_status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'reserved'::"text", 'closed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."findora_deal_inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."findora_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "original_price" numeric(12,2),
    "deal_price" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text",
    "image_path" "text",
    "category" "text",
    "stock_quantity" integer,
    "deal_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "featured_on_homepage" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by_staff_id" "uuid",
    "updated_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "vendor_id" "uuid",
    "vendor_name_snapshot" "text",
    CONSTRAINT "ck_deal_price_positive" CHECK (("deal_price" >= (0)::numeric)),
    CONSTRAINT "ck_deal_status" CHECK (("deal_status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'sold_out'::"text", 'expired'::"text", 'archived'::"text"]))),
    CONSTRAINT "ck_original_price_valid" CHECK ((("original_price" IS NULL) OR ("original_price" >= "deal_price"))),
    CONSTRAINT "ck_stock_quantity_non_negative" CHECK ((("stock_quantity" IS NULL) OR ("stock_quantity" >= 0)))
);


ALTER TABLE "public"."findora_deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flywheel_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "metric_key" "text" NOT NULL,
    "current_value" numeric DEFAULT 0.0 NOT NULL,
    "target_value" numeric DEFAULT 100.0 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flywheel_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founder_accountability_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "details_en" "text",
    "details_ar" "text",
    "meta_tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."founder_accountability_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founder_weekly_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid",
    "week_start_date" "date" NOT NULL,
    "hours_built" integer DEFAULT 0,
    "customers_contacted" integer DEFAULT 0,
    "merchants_contacted" integer DEFAULT 0,
    "biggest_achievement" "text",
    "blockers" "text",
    "distraction_score" integer DEFAULT 1,
    "progress_comparison" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "top_achievements" "text",
    "not_done" "text",
    "distracted_from_phase" "text",
    "next_week_focus" "text",
    "progress_rating" integer DEFAULT 5,
    CONSTRAINT "founder_weekly_logs_distraction_score_check" CHECK ((("distraction_score" >= 1) AND ("distraction_score" <= 10))),
    CONSTRAINT "founder_weekly_logs_progress_rating_check" CHECK ((("progress_rating" >= 1) AND ("progress_rating" <= 10)))
);


ALTER TABLE "public"."founder_weekly_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fraud_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "alert_level" "text" NOT NULL,
    "alert_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "related_transaction_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolved_by_staff_id" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fraud_alerts_alert_level_check" CHECK (("alert_level" = ANY (ARRAY['warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "fraud_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['velocity_spike'::"text", 'ip_cluster'::"text", 'geo_mismatch'::"text", 'manual_review_required'::"text"]))),
    CONSTRAINT "fraud_alerts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."fraud_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fraud_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "risk_score" integer NOT NULL,
    "decision" "text" NOT NULL,
    "trigger_reason" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fraud_audit_log_decision_check" CHECK (("decision" = ANY (ARRAY['ALLOW'::"text", 'REQUIRE_REVIEW'::"text", 'BLOCK'::"text"]))),
    CONSTRAINT "fraud_audit_log_risk_score_check" CHECK ((("risk_score" >= 0) AND ("risk_score" <= 100)))
);


ALTER TABLE "public"."fraud_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_buying_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pool_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_buying_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_buying_pools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "target_quantity" integer DEFAULT 10 NOT NULL,
    "current_quantity" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_buying_pools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "status" "text" DEFAULT 'idea'::"text",
    "cac_en" "text" NOT NULL,
    "cac_ar" "text" NOT NULL,
    "reach_en" "text" NOT NULL,
    "reach_ar" "text" NOT NULL,
    "tip_en" "text" NOT NULL,
    "tip_ar" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."growth_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_content_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "day_number" integer NOT NULL,
    "platform" "text" NOT NULL,
    "hook_en" "text" NOT NULL,
    "hook_ar" "text" NOT NULL,
    "body_en" "text" NOT NULL,
    "body_ar" "text" NOT NULL,
    "image_prompt_en" "text",
    "image_prompt_ar" "text",
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."growth_content_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homepage_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "body_en" "text",
    "body_ar" "text",
    "announcement_type" "text" DEFAULT 'news'::"text" NOT NULL,
    "image_path" "text",
    "link_url" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_dismissible" boolean DEFAULT true,
    "created_by_staff_id" "uuid",
    "updated_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ck_announcement_type" CHECK (("announcement_type" = ANY (ARRAY['news'::"text", 'offer'::"text", 'event'::"text", 'system'::"text", 'deal'::"text"])))
);


ALTER TABLE "public"."homepage_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."internal_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "related_entity_type" "text" NOT NULL,
    "related_entity_id" "uuid" NOT NULL,
    "note_type" "text" DEFAULT 'general'::"text" NOT NULL,
    "note_text" "text" NOT NULL,
    "created_by" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."internal_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_metrics_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "daily_active_contributors" integer DEFAULT 0 NOT NULL,
    "new_requests_count" integer DEFAULT 0 NOT NULL,
    "retention_rate_pct" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "daily_revenue_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "daily_net_profit_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "avg_customer_acquisition_cost_egp" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "avg_lifetime_value_egp" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "avg_margin_pct" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."investor_metrics_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_queue_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" NOT NULL,
    "team_code" "text" NOT NULL,
    "default_priority" smallint DEFAULT 5 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_queue_rules_job_type_check" CHECK (("job_type" = ANY (ARRAY['qualification'::"text", 'online_research'::"text", 'offline_sourcing'::"text", 'ranking'::"text", 'fusion'::"text", 'client_report'::"text", 'source_reveal'::"text", 'notify_customer'::"text"]))),
    CONSTRAINT "job_queue_rules_priority_check" CHECK ((("default_priority" >= 1) AND ("default_priority" <= 9))),
    CONSTRAINT "job_queue_rules_team_code_check" CHECK (("team_code" = ANY (ARRAY['leadership'::"text", 'operations'::"text", 'online_research'::"text", 'offline_sourcing'::"text", 'reporting'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."job_queue_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kill_list_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "reason_en" "text" NOT NULL,
    "reason_ar" "text" NOT NULL,
    "target_phase" "text" NOT NULL,
    "is_activated" boolean DEFAULT false,
    "activation_reason_ar" "text",
    "activation_reason_en" "text",
    "execution_plan_ar" "text",
    "execution_plan_en" "text",
    "activated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kill_list_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."link_attempt_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raw_url" "text" NOT NULL,
    "domain" "text",
    "outcome" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."link_attempt_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_health_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "specialization" "text" DEFAULT 'global'::"text" NOT NULL,
    "goal_quotes_per_request" numeric(5,2) DEFAULT 3.0,
    "goal_response_time_hours" numeric(5,2) DEFAULT 4.0,
    "goal_merchant_win_rate_pct" numeric(5,2) DEFAULT 30.0,
    "goal_active_merchants_week" integer DEFAULT 8,
    "goal_request_conversion_rate_pct" numeric(5,2) DEFAULT 25.0,
    "goal_avg_deal_value_egp" numeric(10,2) DEFAULT 5000.0,
    "shortfalls_comments" "text",
    "strength_merchants_comments" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_health_indicators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "discovered_price" numeric(10,2) NOT NULL,
    "store_name" "text" NOT NULL,
    "location_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "market_insights_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'approved_as_offer'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."market_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "deal_price_egp" numeric(10,2) NOT NULL,
    "deal_type" "text" DEFAULT 'discount'::"text" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "is_featured" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "approved_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketplace_deals_deal_type_check" CHECK (("deal_type" = ANY (ARRAY['discount'::"text", 'flash_sale'::"text", 'exclusive'::"text"]))),
    CONSTRAINT "marketplace_deals_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."marketplace_deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "category" "text" NOT NULL,
    "base_price_egp" numeric(10,2) NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[],
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketplace_products_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'out_of_stock'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."marketplace_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_category_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_category_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "contact_type" "text" NOT NULL,
    "contact_label" "text",
    "contact_value" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merchant_contacts_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['phone'::"text", 'email'::"text", 'whatsapp'::"text", 'telegram'::"text", 'other'::"text"]))),
    CONSTRAINT "merchant_contacts_contact_value_not_blank_check" CHECK (("btrim"("contact_value") <> ''::"text"))
);


ALTER TABLE "public"."merchant_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_customer_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "request_id" "uuid",
    "rating" integer,
    "comment" "text",
    "is_verified_purchase" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "merchant_customer_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."merchant_customer_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_discovery_studies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "researcher_id" "uuid",
    "specialization" "text",
    "estimated_daily_customers" integer DEFAULT 0,
    "biggest_selling_challenge" "text",
    "accepts_commission" boolean DEFAULT false,
    "accepts_bidding" boolean DEFAULT false,
    "conversion_hook" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."merchant_discovery_studies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "evaluation_source" "text" DEFAULT 'internal_review'::"text" NOT NULL,
    "overall_score" numeric(5,2),
    "reliability_score" numeric(5,2),
    "quality_score" numeric(5,2),
    "price_competitiveness_score" numeric(5,2),
    "service_score" numeric(5,2),
    "note" "text",
    "actor_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merchant_evaluations_overall_score_check" CHECK ((("overall_score" IS NULL) OR (("overall_score" >= (0)::numeric) AND ("overall_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_evaluations_price_score_check" CHECK ((("price_competitiveness_score" IS NULL) OR (("price_competitiveness_score" >= (0)::numeric) AND ("price_competitiveness_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_evaluations_quality_score_check" CHECK ((("quality_score" IS NULL) OR (("quality_score" >= (0)::numeric) AND ("quality_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_evaluations_reliability_score_check" CHECK ((("reliability_score" IS NULL) OR (("reliability_score" >= (0)::numeric) AND ("reliability_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_evaluations_service_score_check" CHECK ((("service_score" IS NULL) OR (("service_score" >= (0)::numeric) AND ("service_score" <= (100)::numeric))))
);


ALTER TABLE "public"."merchant_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_offers_legacy_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "price_offered_egp" numeric(12,2) NOT NULL,
    "notes" "text",
    "estimated_days" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merchant_offers_price_offered_egp_check" CHECK (("price_offered_egp" > (0)::numeric)),
    CONSTRAINT "merchant_offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."merchant_offers_legacy_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_performance_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."merchant_performance_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_profiles_legacy_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "business_name_en" "text" NOT NULL,
    "business_name_ar" "text" NOT NULL,
    "business_category" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "phone_verified" boolean DEFAULT false NOT NULL,
    "governorate" "text",
    "address_details" "text",
    "national_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "trust_score" integer DEFAULT 50 NOT NULL,
    "total_deals" integer DEFAULT 0 NOT NULL,
    "total_earnings_egp" numeric(14,2) DEFAULT 0 NOT NULL,
    "rating_average" numeric(3,2),
    "rating_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merchant_profiles_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'suspended'::"text", 'rejected'::"text"]))),
    CONSTRAINT "merchant_profiles_trust_score_check" CHECK ((("trust_score" >= 0) AND ("trust_score" <= 100)))
);


ALTER TABLE "public"."merchant_profiles_legacy_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "merchant_id" "uuid",
    "quoted_by_user_id" "uuid",
    "source_channel" "text" DEFAULT 'merchant'::"text" NOT NULL,
    "option_label" "text",
    "product_title" "text" NOT NULL,
    "product_brand" "text",
    "product_model" "text",
    "product_specs_summary" "text",
    "price_amount" numeric(14,2),
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "availability_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "warranty_info" "text",
    "quantity_available" integer,
    "quote_valid_until" timestamp with time zone,
    "origin_country" "text",
    "trust_score" numeric(5,2),
    "value_score" numeric(5,2),
    "fit_score" numeric(5,2),
    "final_score" numeric(5,2),
    "contact_notes" "text",
    "is_shortlisted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_match_score" integer,
    "ai_rating_stars" numeric(3,2),
    "ai_advantages_en" "text",
    "ai_advantages_ar" "text",
    "ai_verdict_en" "text",
    "ai_verdict_ar" "text",
    "ai_rank" integer,
    CONSTRAINT "merchant_quotes_ai_match_score_check" CHECK ((("ai_match_score" >= 0) AND ("ai_match_score" <= 100))),
    CONSTRAINT "merchant_quotes_availability_check" CHECK (("availability_status" = ANY (ARRAY['in_stock'::"text", 'limited'::"text", 'out_of_stock'::"text", 'preorder'::"text", 'unknown'::"text"]))),
    CONSTRAINT "merchant_quotes_final_score_check" CHECK ((("final_score" IS NULL) OR (("final_score" >= (0)::numeric) AND ("final_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_quotes_fit_score_check" CHECK ((("fit_score" IS NULL) OR (("fit_score" >= (0)::numeric) AND ("fit_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_quotes_quantity_check" CHECK ((("quantity_available" IS NULL) OR ("quantity_available" >= 0))),
    CONSTRAINT "merchant_quotes_source_channel_check" CHECK (("source_channel" = ANY (ARRAY['merchant'::"text", 'field_agent'::"text", 'phone'::"text", 'whatsapp'::"text", 'store_visit'::"text", 'other'::"text"]))),
    CONSTRAINT "merchant_quotes_trust_score_check" CHECK ((("trust_score" IS NULL) OR (("trust_score" >= (0)::numeric) AND ("trust_score" <= (100)::numeric)))),
    CONSTRAINT "merchant_quotes_value_score_check" CHECK ((("value_score" IS NULL) OR (("value_score" >= (0)::numeric) AND ("value_score" <= (100)::numeric))))
);


ALTER TABLE "public"."merchant_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_score_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "score" numeric(5,2) NOT NULL,
    "strengths" "text"[],
    "weaknesses" "text"[],
    "snapshot_data" "jsonb" NOT NULL,
    "calculated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."merchant_score_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_service_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "city" "text" NOT NULL,
    "area" "text",
    "supports_products" boolean DEFAULT true NOT NULL,
    "supports_services" boolean DEFAULT false NOT NULL,
    "supports_site_visits" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_service_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_source_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_label" "text",
    "source_url" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_source_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "merchant_type" "text" NOT NULL,
    "city" "text",
    "area" "text",
    "primary_phone" "text",
    "whatsapp" "text",
    "email" "text",
    "overall_score" numeric(5,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "website_url" "text",
    "facebook_url" "text",
    "instagram_url" "text",
    "telegram_handle" "text",
    "specialization_summary" "text",
    "supports_online" boolean DEFAULT false NOT NULL,
    "supports_offline" boolean DEFAULT true NOT NULL,
    "default_currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "reliability_score" numeric(5,2),
    "quality_score" numeric(5,2),
    "price_competitiveness_score" numeric(5,2),
    "service_score" numeric(5,2),
    "last_contacted_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    "tags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "raw_profile" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "business_name_en" "text",
    "business_name_ar" "text",
    "phone_number_primary" "text"
);


ALTER TABLE "public"."merchants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moat_competitor_threats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "moat_id" "uuid",
    "competitor_name" "text" NOT NULL,
    "threat_description_ar" "text" NOT NULL,
    "threat_description_en" "text" NOT NULL,
    "counter_strategy_ar" "text" NOT NULL,
    "counter_strategy_en" "text" NOT NULL,
    "severity_level" "text" DEFAULT 'medium'::"text",
    "logged_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."moat_competitor_threats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."north_star_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" NOT NULL,
    "value" numeric DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."north_star_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."north_star_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "month_number" integer NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "target_deals" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."north_star_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "merchant_id" "uuid",
    "source_type" "text" NOT NULL,
    "option_label" "text" NOT NULL,
    "product_title" "text" NOT NULL,
    "product_brand" "text",
    "product_model" "text",
    "product_specs_summary" "text",
    "price_amount" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "availability_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "warranty_info" "text",
    "trust_score" numeric(5,2),
    "value_score" numeric(5,2),
    "ranking_position" integer,
    "price_valid_until" timestamp with time zone,
    "source_reference_url" "text",
    "source_reference_text" "text",
    "collected_by" "text" DEFAULT 'admin'::"text" NOT NULL,
    "collected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_recommended" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offline_sourcing_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "assigned_to_user_id" "uuid",
    "merchant_id" "uuid",
    "task_status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "target_governorate" "text",
    "target_area" "text",
    "instructions" "text",
    "findings_summary" "text",
    "due_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offline_sourcing_tasks_status_check" CHECK (("task_status" = ANY (ARRAY['queued'::"text", 'assigned'::"text", 'in_progress'::"text", 'submitted'::"text", 'verified'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "offline_sourcing_tasks_time_check" CHECK ((("finished_at" IS NULL) OR ("started_at" IS NULL) OR ("finished_at" >= "started_at")))
);


ALTER TABLE "public"."offline_sourcing_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_merchant_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "source_name" "text" NOT NULL,
    "store_name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "product_url" "text",
    "availability_status" "text" DEFAULT 'In Stock'::"text",
    "raw_response" "jsonb" DEFAULT '{}'::"jsonb",
    "scraped_at" timestamp with time zone DEFAULT "now"(),
    "ai_match_score" integer,
    "ai_rating_stars" numeric(3,2),
    "ai_advantages_en" "text",
    "ai_advantages_ar" "text",
    "ai_verdict_en" "text",
    "ai_verdict_ar" "text",
    "ai_rank" integer,
    CONSTRAINT "online_merchant_quotes_ai_match_score_check" CHECK ((("ai_match_score" >= 0) AND ("ai_match_score" <= 100)))
);


ALTER TABLE "public"."online_merchant_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outbound_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "request_id" "uuid",
    "channel" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "template_code" "text",
    "rendered_subject" "text",
    "rendered_body" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "provider" "text",
    "provider_message_id" "text",
    "error_message" "text",
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."outbound_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_path" "text" NOT NULL,
    "block_id" "text" NOT NULL,
    "content_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_edited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."page_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_points_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "action_type" "text" NOT NULL,
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_points_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_intent_id" "uuid",
    "request_id" "uuid",
    "event_type" "text" NOT NULL,
    "actor_type" "text" NOT NULL,
    "actor_staff_id" "uuid",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_audit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_intents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "intent_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "provider" "text" DEFAULT 'manual'::"text" NOT NULL,
    "provider_reference" "text",
    "payment_instructions" "text",
    "expires_at" timestamp with time zone,
    "created_by_staff_id" "uuid",
    "confirmed_by_staff_id" "uuid",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "receipt_image_path" "text",
    CONSTRAINT "ck_intent_type" CHECK (("intent_type" = ANY (ARRAY['request_fee'::"text", 'report_unlock'::"text", 'procurement_fee'::"text", 'custom'::"text"]))),
    CONSTRAINT "ck_status" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_customer'::"text", 'submitted'::"text", 'confirmed'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_intents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."payments" AS
 SELECT "id",
    "request_id",
    "customer_id",
    "intent_type" AS "payment_type",
    "amount",
    "currency_code",
        CASE
            WHEN ("status" = 'confirmed'::"text") THEN 'confirmed'::"text"
            WHEN ("status" = 'rejected'::"text") THEN 'rejected'::"text"
            WHEN ("status" = 'cancelled'::"text") THEN 'cancelled'::"text"
            ELSE 'pending'::"text"
        END AS "payment_status",
        CASE
            WHEN ("status" = 'confirmed'::"text") THEN 'completed'::"text"
            ELSE "status"
        END AS "status",
    "provider" AS "payment_method",
    "provider_reference" AS "external_reference",
    "confirmed_by_staff_id" AS "confirmed_by",
    "confirmed_at",
    "amount" AS "amount_egp",
    "created_at",
    "updated_at"
   FROM "public"."payment_intents";


ALTER VIEW "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments_legacy_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "payment_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "external_reference" "text",
    "proof_attachment_url" "text",
    "confirmed_by" "text",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments_legacy_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval) NOT NULL,
    "is_used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "phone_otp_codes_purpose_check" CHECK (("purpose" = ANY (ARRAY['contributor_registration'::"text", 'merchant_registration'::"text", 'withdrawal_verification'::"text", 'vendor_auth'::"text"])))
);


ALTER TABLE "public"."phone_otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_type" "text" DEFAULT 'guest'::"text",
    "actor_id" "uuid",
    "request_id" "uuid",
    "customer_id" "uuid",
    "merchant_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_moats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "moat_number" integer NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "moat_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_moats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_type" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "required_role" "text",
    "min_level" integer DEFAULT 1 NOT NULL,
    "min_trust_score" integer DEFAULT 0 NOT NULL,
    "base_reward_egp" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "base_reward_points" integer DEFAULT 0 NOT NULL,
    "location_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "time_limit_minutes" integer DEFAULT 60 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "created_by_customer_id" "uuid",
    "created_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_request_id" "uuid",
    "is_recycled" boolean DEFAULT false,
    "customer_price_egp" numeric(10,2) DEFAULT 0.00,
    "platform_profit_egp" numeric(10,2) DEFAULT 0.00,
    "margin_percentage" numeric(5,2) DEFAULT 0.00,
    CONSTRAINT "platform_tasks_min_level_check" CHECK ((("min_level" >= 1) AND ("min_level" <= 5))),
    CONSTRAINT "platform_tasks_min_trust_score_check" CHECK ((("min_trust_score" >= 0) AND ("min_trust_score" <= 100))),
    CONSTRAINT "platform_tasks_required_role_check" CHECK (("required_role" = ANY (ARRAY['field_scout'::"text", 'store_insider'::"text", 'casual'::"text", 'expert'::"text"]))),
    CONSTRAINT "platform_tasks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'claimed'::"text", 'completed'::"text", 'cancelled'::"text", 'expired'::"text"]))),
    CONSTRAINT "platform_tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['price_quote'::"text", 'store_visit'::"text", 'market_intel'::"text", 'customer_assistance'::"text"])))
);


ALTER TABLE "public"."platform_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "target_price" numeric(12,2),
    "target_pct" numeric(6,2),
    "channels" "text"[] DEFAULT '{sms}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "triggered_count" integer DEFAULT 0 NOT NULL,
    "last_triggered" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."price_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "old_price" numeric(12,2) NOT NULL,
    "new_price" numeric(12,2) NOT NULL,
    "absolute_change" numeric(12,2) NOT NULL,
    "percentage_change" numeric(10,4) NOT NULL,
    "direction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."price_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_guarantees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "product_name" "text" NOT NULL,
    "lower_price" numeric(12,2) NOT NULL,
    "proof_details" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "price_guarantees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."price_guarantees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "source" "text",
    "captured_by" "uuid",
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."price_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_trends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "trend_7d" "text",
    "trend_30d" "text",
    "trend_90d" "text",
    "pct_change_7d" numeric(10,4),
    "pct_change_30d" numeric(10,4),
    "pct_change_90d" numeric(10,4),
    "lowest_price" numeric(12,2),
    "highest_price" numeric(12,2),
    "average_price" numeric(12,2),
    "trend_score" smallint,
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."price_trends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_event_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_type" "text" NOT NULL,
    "pricing_version_id" "uuid",
    "event_type" "text" NOT NULL,
    "description" "text",
    "old_status" "text",
    "new_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_event_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_type" "text" NOT NULL,
    "base_price_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "min_price_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "max_price_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "active_offer_percentage" numeric(5,2) DEFAULT 0.00,
    "override_by_admin" boolean DEFAULT false,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by_staff_id" "uuid"
);


ALTER TABLE "public"."pricing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_waitlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_waitlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_ar" "text" NOT NULL,
    "title_en" "text",
    "brand" "text",
    "category" "text" NOT NULL,
    "subcategory" "text",
    "current_price" numeric(12,2),
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_url" "text",
    "vendor_id" "uuid",
    "research_item_id" "uuid",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "image_url" "text",
    "popularity_score" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "phase_number" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Idea'::"text" NOT NULL,
    "notes_en" "text",
    "notes_ar" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_features_status_check" CHECK (("status" = ANY (ARRAY['Idea'::"text", 'Discovery'::"text", 'Prototype'::"text", 'Beta'::"text", 'Live'::"text", 'Deprecated'::"text"])))
);


ALTER TABLE "public"."project_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_phases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phase_number" integer NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "tip_en" "text",
    "tip_ar" "text",
    "status" "text" DEFAULT 'locked'::"text" NOT NULL,
    "tags" "text"[],
    "target_merchants" integer DEFAULT 0,
    "target_customers" integer DEFAULT 0,
    "target_deals" integer DEFAULT 0,
    "target_requests" integer DEFAULT 0,
    "progress_override" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" character varying(45) NOT NULL,
    "endpoint" character varying(255) NOT NULL,
    "request_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "target_count" integer NOT NULL,
    "current_active_count" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reward_cash_egp" numeric(12,2) DEFAULT 0.00,
    "reward_multiplier" numeric(5,2) DEFAULT 1.00,
    CONSTRAINT "referral_challenges_target_count_check" CHECK (("target_count" > 0))
);


ALTER TABLE "public"."referral_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referrer_type" "text" NOT NULL,
    "referred_email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."referral_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "source_user_id" "uuid" NOT NULL,
    "reward_stage" "text" NOT NULL,
    "points_awarded" integer DEFAULT 0 NOT NULL,
    "cash_awarded_egp" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referral_rewards_reward_stage_check" CHECK (("reward_stage" = ANY (ARRAY['signed_up'::"text", 'approved'::"text", 'first_task_completed'::"text", 'earning_started'::"text"])))
);


ALTER TABLE "public"."referral_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_option_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "shortlist_id" "uuid",
    "offer_id" "uuid",
    "display_rank" integer NOT NULL,
    "candidate_channel" "text" NOT NULL,
    "display_title" "text" NOT NULL,
    "display_brand" "text",
    "display_model" "text",
    "display_specs_summary" "text",
    "display_price_amount" numeric(14,2),
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "availability_status" "text",
    "warranty_info" "text",
    "trust_score" numeric(5,2),
    "value_score" numeric(5,2),
    "final_score" numeric(5,2),
    "highlight_summary" "text",
    "customer_summary" "text",
    "reveal_locked" boolean DEFAULT true NOT NULL,
    "reveal_kind" "text" DEFAULT 'none'::"text" NOT NULL,
    "hidden_reference_url" "text",
    "hidden_merchant_name" "text",
    "hidden_merchant_location" "text",
    "hidden_contact_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disadvantages_en" "text",
    "disadvantages_ar" "text",
    CONSTRAINT "report_option_snapshots_channel_check" CHECK (("candidate_channel" = ANY (ARRAY['online'::"text", 'offline'::"text"]))),
    CONSTRAINT "report_option_snapshots_final_score_check" CHECK ((("final_score" IS NULL) OR (("final_score" >= (0)::numeric) AND ("final_score" <= (100)::numeric)))),
    CONSTRAINT "report_option_snapshots_rank_check" CHECK (("display_rank" >= 1)),
    CONSTRAINT "report_option_snapshots_reveal_kind_check" CHECK (("reveal_kind" = ANY (ARRAY['online_url'::"text", 'merchant_contact'::"text", 'none'::"text"]))),
    CONSTRAINT "report_option_snapshots_trust_score_check" CHECK ((("trust_score" IS NULL) OR (("trust_score" >= (0)::numeric) AND ("trust_score" <= (100)::numeric)))),
    CONSTRAINT "report_option_snapshots_value_score_check" CHECK ((("value_score" IS NULL) OR (("value_score" >= (0)::numeric) AND ("value_score" <= (100)::numeric))))
);


ALTER TABLE "public"."report_option_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_option_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_option_snapshot_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "unlocked_by_user_id" "uuid",
    "unlock_type" "text" DEFAULT 'self_service'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "report_option_unlocks_unlock_type_check" CHECK (("unlock_type" = ANY (ARRAY['self_service'::"text", 'admin'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."report_option_unlocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "report_version" integer DEFAULT 1 NOT NULL,
    "report_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "executive_summary" "text",
    "recommendation_summary" "text",
    "why_not_cheapest" "text",
    "price_validity_note" "text",
    "pdf_file_url" "text",
    "generated_by" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_reason" "text",
    "actor_staff_id" "uuid",
    "before_status" "text",
    "after_status" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."request_admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "attachment_type" "text" NOT NULL,
    "file_url" "text",
    "file_name" "text",
    "mime_type" "text",
    "external_link" "text",
    "uploaded_by_type" "text" DEFAULT 'customer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."request_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_candidate_shortlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "candidate_channel" "text" NOT NULL,
    "research_item_id" "uuid",
    "merchant_quote_id" "uuid",
    "selected_by_user_id" "uuid",
    "ranking_position" integer NOT NULL,
    "option_label" "text",
    "trust_score" numeric(5,2),
    "value_score" numeric(5,2),
    "fit_score" numeric(5,2),
    "final_score" numeric(5,2),
    "reason_summary" "text" NOT NULL,
    "customer_summary" "text",
    "reveal_locked" boolean DEFAULT true NOT NULL,
    "is_recommended" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "published_offer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_candidate_shortlists_channel_check" CHECK (("candidate_channel" = ANY (ARRAY['online'::"text", 'offline'::"text"]))),
    CONSTRAINT "request_candidate_shortlists_final_score_check" CHECK ((("final_score" IS NULL) OR (("final_score" >= (0)::numeric) AND ("final_score" <= (100)::numeric)))),
    CONSTRAINT "request_candidate_shortlists_fit_score_check" CHECK ((("fit_score" IS NULL) OR (("fit_score" >= (0)::numeric) AND ("fit_score" <= (100)::numeric)))),
    CONSTRAINT "request_candidate_shortlists_ranking_check" CHECK (("ranking_position" >= 1)),
    CONSTRAINT "request_candidate_shortlists_source_ref_check" CHECK (((("candidate_channel" = 'online'::"text") AND ("research_item_id" IS NOT NULL) AND ("merchant_quote_id" IS NULL)) OR (("candidate_channel" = 'offline'::"text") AND ("merchant_quote_id" IS NOT NULL) AND ("research_item_id" IS NULL)))),
    CONSTRAINT "request_candidate_shortlists_trust_score_check" CHECK ((("trust_score" IS NULL) OR (("trust_score" >= (0)::numeric) AND ("trust_score" <= (100)::numeric)))),
    CONSTRAINT "request_candidate_shortlists_value_score_check" CHECK ((("value_score" IS NULL) OR (("value_score" >= (0)::numeric) AND ("value_score" <= (100)::numeric))))
);


ALTER TABLE "public"."request_candidate_shortlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_compliance_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "recommended_decision" "text" NOT NULL,
    "applied_decision" "text",
    "decision_reason" "text",
    "summary_text" "text",
    "actor_staff_id" "uuid",
    "action_source" "text" DEFAULT 'system'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_compliance_actions_action_source_check" CHECK (("action_source" = ANY (ARRAY['system'::"text", 'staff'::"text", 'admin'::"text", 'migration'::"text", 'test'::"text"]))),
    CONSTRAINT "request_compliance_actions_applied_check" CHECK ((("applied_decision" IS NULL) OR ("applied_decision" = ANY (ARRAY['blocked'::"text", 'manual_review'::"text", 'warning_only'::"text", 'clear'::"text"])))),
    CONSTRAINT "request_compliance_actions_recommended_check" CHECK (("recommended_decision" = ANY (ARRAY['blocked'::"text", 'manual_review'::"text", 'warning_only'::"text", 'clear'::"text"])))
);


ALTER TABLE "public"."request_compliance_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_compliance_hits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "matched_keyword" "text",
    "matched_excerpt" "text",
    "match_source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "language_code" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "confidence_score" numeric,
    "actor_staff_id" "uuid",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_compliance_hits_confidence_score_check" CHECK ((("confidence_score" IS NULL) OR (("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric)))),
    CONSTRAINT "request_compliance_hits_language_code_check" CHECK (("language_code" = ANY (ARRAY['ar'::"text", 'en'::"text", 'mixed'::"text", 'unknown'::"text"]))),
    CONSTRAINT "request_compliance_hits_match_source_check" CHECK (("match_source" = ANY (ARRAY['manual'::"text", 'keyword'::"text", 'ai'::"text", 'staff'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."request_compliance_hits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_customer_message_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "report_id" "uuid",
    "message_type" "text" NOT NULL,
    "language_code" "text" NOT NULL,
    "subject_text" "text",
    "body_text" "text",
    "delivery_channel" "text" DEFAULT 'internal'::"text" NOT NULL,
    "delivery_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_customer_message_audit_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['draft'::"text", 'queued'::"text", 'sent'::"text", 'failed'::"text", 'internal_only'::"text"]))),
    CONSTRAINT "request_customer_message_audit_language_check" CHECK (("language_code" = ANY (ARRAY['ar'::"text", 'en'::"text"])))
);


ALTER TABLE "public"."request_customer_message_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_delete_backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "request_code" "text" NOT NULL,
    "backup_json" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_staff_id" "uuid" NOT NULL,
    "delete_confirmed" boolean DEFAULT false NOT NULL,
    "delete_confirmed_at" timestamp with time zone,
    "delete_notes" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by_staff_id" "uuid"
);


ALTER TABLE "public"."request_delete_backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_deletion_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "backup_id" "uuid",
    "event_type" "text" NOT NULL,
    "actor_staff_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."request_deletion_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "dispute_reason" "text" NOT NULL,
    "details" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolution_notes" "text",
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."request_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_merchant_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "source_channel" "text" NOT NULL,
    "match_status" "text" DEFAULT 'suggested'::"text" NOT NULL,
    "match_score" numeric(5,2),
    "quote_amount" numeric(14,2),
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_merchant_matches_match_score_check" CHECK ((("match_score" IS NULL) OR (("match_score" >= (0)::numeric) AND ("match_score" <= (100)::numeric))))
);


ALTER TABLE "public"."request_merchant_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "sender_id" "uuid",
    "message" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['customer'::"text", 'staff'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."request_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_operational_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "operational_stage" "text" DEFAULT 'intake'::"text" NOT NULL,
    "stage_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_for_processing" boolean DEFAULT false NOT NULL,
    "needs_manual_review" boolean DEFAULT false NOT NULL,
    "report_ready" boolean DEFAULT false NOT NULL,
    "client_released_at" timestamp with time zone,
    "latest_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_operational_states_stage_check" CHECK (("operational_stage" = ANY (ARRAY['intake'::"text", 'qualification'::"text", 'research'::"text", 'shortlisting'::"text", 'reporting'::"text", 'report_review'::"text", 'client_ready'::"text", 'rejected'::"text", 'closed'::"text"]))),
    CONSTRAINT "request_operational_states_status_check" CHECK (("stage_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'waiting_approval'::"text", 'completed'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."request_operational_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "budget_min" numeric(14,2),
    "budget_max" numeric(14,2),
    "preferred_brands" "text",
    "preferred_models" "text",
    "preferred_specs" "text",
    "allow_alternatives" boolean DEFAULT true NOT NULL,
    "condition_preference" "text" DEFAULT 'new'::"text" NOT NULL,
    "urgency_level" "text" DEFAULT 'normal'::"text" NOT NULL,
    "knows_market_price" boolean DEFAULT false NOT NULL,
    "estimated_market_price" numeric(14,2),
    "priority_focus" "text" DEFAULT 'best_value'::"text" NOT NULL,
    "search_scope" "text" DEFAULT 'online_and_offline'::"text" NOT NULL,
    "preferred_governorate" "text",
    "preferred_area" "text",
    "delivery_needed" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_preferences_budget_check" CHECK ((("budget_min" IS NULL) OR ("budget_max" IS NULL) OR ("budget_min" <= "budget_max"))),
    CONSTRAINT "request_preferences_condition_check" CHECK (("condition_preference" = ANY (ARRAY['new'::"text", 'used'::"text", 'refurbished'::"text", 'any'::"text"]))),
    CONSTRAINT "request_preferences_priority_focus_check" CHECK (("priority_focus" = ANY (ARRAY['best_price'::"text", 'best_value'::"text", 'best_quality'::"text", 'best_trust'::"text", 'fastest_availability'::"text"]))),
    CONSTRAINT "request_preferences_search_scope_check" CHECK (("search_scope" = ANY (ARRAY['online_only'::"text", 'offline_only'::"text", 'online_and_offline'::"text"]))),
    CONSTRAINT "request_preferences_urgency_check" CHECK (("urgency_level" = ANY (ARRAY['normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."request_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_qualification_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "review_source" "text" DEFAULT 'agent'::"text" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "decision_recommendation" "text" NOT NULL,
    "seriousness_score" numeric(5,2),
    "profit_potential_score" numeric(5,2),
    "reputation_value_score" numeric(5,2),
    "fulfillment_feasibility_score" numeric(5,2),
    "clarity_score" numeric(5,2),
    "overall_score" numeric(5,2),
    "reason_summary" "text" NOT NULL,
    "internal_notes" "text",
    "is_latest" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_qualification_reviews_clarity_check" CHECK ((("clarity_score" IS NULL) OR (("clarity_score" >= (0)::numeric) AND ("clarity_score" <= (100)::numeric)))),
    CONSTRAINT "request_qualification_reviews_decision_check" CHECK (("decision_recommendation" = ANY (ARRAY['accept'::"text", 'reject'::"text", 'manual_review'::"text", 'needs_clarification'::"text", 'low_priority'::"text"]))),
    CONSTRAINT "request_qualification_reviews_fulfillment_check" CHECK ((("fulfillment_feasibility_score" IS NULL) OR (("fulfillment_feasibility_score" >= (0)::numeric) AND ("fulfillment_feasibility_score" <= (100)::numeric)))),
    CONSTRAINT "request_qualification_reviews_overall_check" CHECK ((("overall_score" IS NULL) OR (("overall_score" >= (0)::numeric) AND ("overall_score" <= (100)::numeric)))),
    CONSTRAINT "request_qualification_reviews_profit_check" CHECK ((("profit_potential_score" IS NULL) OR (("profit_potential_score" >= (0)::numeric) AND ("profit_potential_score" <= (100)::numeric)))),
    CONSTRAINT "request_qualification_reviews_reputation_check" CHECK ((("reputation_value_score" IS NULL) OR (("reputation_value_score" >= (0)::numeric) AND ("reputation_value_score" <= (100)::numeric)))),
    CONSTRAINT "request_qualification_reviews_review_source_check" CHECK (("review_source" = ANY (ARRAY['human'::"text", 'agent'::"text"]))),
    CONSTRAINT "request_qualification_reviews_seriousness_check" CHECK ((("seriousness_score" IS NULL) OR (("seriousness_score" >= (0)::numeric) AND ("seriousness_score" <= (100)::numeric))))
);


ALTER TABLE "public"."request_qualification_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "change_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "from_canonical_state" "text",
    "to_canonical_state" "text",
    "transition_name" "text",
    "changed_by_staff_id" "uuid",
    "event_source" "text" DEFAULT 'staff_action'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."request_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_workflow_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "event_type" "text" NOT NULL,
    "stage_before" "text",
    "status_before" "text",
    "stage_after" "text",
    "status_after" "text",
    "note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_workflow_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['state_initialized'::"text", 'pipeline_submitted'::"text", 'stage_changed'::"text", 'bundle_prepared'::"text", 'released_to_customer'::"text", 'manual_note'::"text"])))
);


ALTER TABLE "public"."request_workflow_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "research_run_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "source_name" "text" NOT NULL,
    "source_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "listing_url" "text",
    "option_label" "text",
    "product_title" "text" NOT NULL,
    "product_brand" "text",
    "product_model" "text",
    "product_specs_summary" "text",
    "price_amount" numeric(14,2),
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "availability_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "seller_name" "text",
    "seller_location" "text",
    "warranty_info" "text",
    "price_last_checked_at" timestamp with time zone,
    "price_change_note" "text",
    "trust_score" numeric(5,2),
    "value_score" numeric(5,2),
    "fit_score" numeric(5,2),
    "final_score" numeric(5,2),
    "is_candidate" boolean DEFAULT true NOT NULL,
    "is_shortlisted" boolean DEFAULT false NOT NULL,
    "raw_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "research_items_availability_check" CHECK (("availability_status" = ANY (ARRAY['in_stock'::"text", 'limited'::"text", 'out_of_stock'::"text", 'preorder'::"text", 'unknown'::"text"]))),
    CONSTRAINT "research_items_final_score_check" CHECK ((("final_score" IS NULL) OR (("final_score" >= (0)::numeric) AND ("final_score" <= (100)::numeric)))),
    CONSTRAINT "research_items_fit_score_check" CHECK ((("fit_score" IS NULL) OR (("fit_score" >= (0)::numeric) AND ("fit_score" <= (100)::numeric)))),
    CONSTRAINT "research_items_source_type_check" CHECK (("source_type" = ANY (ARRAY['marketplace'::"text", 'retailer'::"text", 'brand_store'::"text", 'classifieds'::"text", 'social'::"text", 'other'::"text"]))),
    CONSTRAINT "research_items_trust_score_check" CHECK ((("trust_score" IS NULL) OR (("trust_score" >= (0)::numeric) AND ("trust_score" <= (100)::numeric)))),
    CONSTRAINT "research_items_value_score_check" CHECK ((("value_score" IS NULL) OR (("value_score" >= (0)::numeric) AND ("value_score" <= (100)::numeric))))
);


ALTER TABLE "public"."research_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "run_kind" "text" DEFAULT 'online_search'::"text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "search_scope" "text" DEFAULT 'all'::"text" NOT NULL,
    "query_text" "text",
    "summary" "text",
    "results_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "research_runs_results_count_check" CHECK (("results_count" >= 0)),
    CONSTRAINT "research_runs_run_kind_check" CHECK (("run_kind" = ANY (ARRAY['online_search'::"text", 'online_refresh'::"text", 'competitor_scan'::"text"]))),
    CONSTRAINT "research_runs_search_scope_check" CHECK (("search_scope" = ANY (ARRAY['all'::"text", 'marketplaces'::"text", 'retailers'::"text", 'brand_stores'::"text", 'other'::"text"]))),
    CONSTRAINT "research_runs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "research_runs_time_check" CHECK ((("finished_at" IS NULL) OR ("started_at" IS NULL) OR ("finished_at" >= "started_at")))
);


ALTER TABLE "public"."research_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_key" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_pricing_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_key" "text",
    "version_no" integer NOT NULL,
    "original_price" numeric(12,2),
    "current_price" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text",
    "promo_label_en" "text",
    "promo_label_ar" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "service_type" "text",
    "promo_price" numeric(12,2),
    "currency" "text",
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "ck_current_price_positive" CHECK (("current_price" >= (0)::numeric)),
    CONSTRAINT "ck_original_price_valid" CHECK ((("original_price" IS NULL) OR ("original_price" >= "current_price")))
);


ALTER TABLE "public"."service_pricing_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_content_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_key" "text" NOT NULL,
    "old_snapshot" "jsonb",
    "new_snapshot" "jsonb",
    "changed_by_staff_id" "uuid",
    "change_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_content_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_content_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_key" "text" NOT NULL,
    "page_key" "text" NOT NULL,
    "section_key" "text" NOT NULL,
    "title_en" "text",
    "title_ar" "text",
    "body_en" "text",
    "body_ar" "text",
    "image_path" "text",
    "cta_label_en" "text",
    "cta_label_ar" "text",
    "cta_href" "text",
    "content_json" "jsonb" DEFAULT '{}'::"jsonb",
    "is_published" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "updated_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_content_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."source_reveals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "report_id" "uuid" NOT NULL,
    "payment_id" "uuid",
    "reveal_type" "text" NOT NULL,
    "revealed_source_text" "text",
    "revealed_source_url" "text",
    "revealed_contact_info" "text",
    "revealed_by" "text" DEFAULT 'admin'::"text" NOT NULL,
    "revealed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_intent_id" "uuid"
);


ALTER TABLE "public"."source_reveals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sourcing_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name_en" "text" NOT NULL,
    "display_name_ar" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "api_key" "text",
    "config_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sourcing_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specializations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "parent_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_beachhead" boolean DEFAULT false NOT NULL,
    "priority_stars" integer DEFAULT 1 NOT NULL,
    "description_ar" "text",
    "description_en" "text",
    "target_merchants" integer DEFAULT 10 NOT NULL,
    "target_deals" integer DEFAULT 5 NOT NULL,
    "criteria_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "specializations_priority_stars_check" CHECK ((("priority_stars" >= 1) AND ("priority_stars" <= 3)))
);


ALTER TABLE "public"."specializations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_action_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "step_number" integer NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "subtitle_en" "text",
    "subtitle_ar" "text",
    "metric_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "target_count" integer DEFAULT 0,
    "xp_reward" integer DEFAULT 100,
    "is_completed_manual" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_action_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "manager_id" "uuid",
    "strengths_en" "text",
    "strengths_ar" "text",
    "weaknesses_en" "text",
    "weaknesses_ar" "text",
    "challenges_en" "text",
    "challenges_ar" "text",
    "alert_message_en" "text",
    "alert_message_ar" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_hr_details" (
    "staff_id" "uuid" NOT NULL,
    "phone" "text",
    "email" "text",
    "base_salary" numeric(12,2) DEFAULT 0.00,
    "commission_pct" numeric(5,2) DEFAULT 0.00,
    "primary_role" "text",
    "secondary_roles" "text"[],
    "performance_rating" numeric(3,2) DEFAULT 5.00,
    "review_notes" "text",
    "department_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_hr_details_performance_rating_check" CHECK ((("performance_rating" >= 0.00) AND ("performance_rating" <= 5.00)))
);


ALTER TABLE "public"."staff_hr_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_member_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by_staff_id" "uuid",
    CONSTRAINT "ck_role_code_allowed" CHECK (("role_code" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'reviewer'::"text", 'researcher'::"text", 'field_agent'::"text", 'reporter'::"text", 'support'::"text", 'content_manager'::"text", 'deals_manager'::"text", 'news_manager'::"text", 'pricing_manager'::"text", 'quality_reviewer'::"text", 'payment_reviewer'::"text", 'vendor_relations'::"text", 'contributor_hr'::"text", 'contributor_admin'::"text", 'fraud_reviewer'::"text"])))
);


ALTER TABLE "public"."staff_member_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_performance_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "reviewer_id" "uuid",
    "review_period" "text" NOT NULL,
    "is_manager_review" boolean DEFAULT false,
    "score_leadership" numeric(3,2) DEFAULT 5.00,
    "score_execution" numeric(3,2) DEFAULT 5.00,
    "score_communication" numeric(3,2) DEFAULT 5.00,
    "score_quality" numeric(3,2) DEFAULT 5.00,
    "achievements" "text",
    "weaknesses" "text",
    "improvement_plan" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_performance_reviews_score_communication_check" CHECK ((("score_communication" >= 0.00) AND ("score_communication" <= 5.00))),
    CONSTRAINT "staff_performance_reviews_score_execution_check" CHECK ((("score_execution" >= 0.00) AND ("score_execution" <= 5.00))),
    CONSTRAINT "staff_performance_reviews_score_leadership_check" CHECK ((("score_leadership" >= 0.00) AND ("score_leadership" <= 5.00))),
    CONSTRAINT "staff_performance_reviews_score_quality_check" CHECK ((("score_quality" >= 0.00) AND ("score_quality" <= 5.00)))
);


ALTER TABLE "public"."staff_performance_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_code" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "monthly_request_limit" integer,
    "monthly_reveal_limit" integer,
    "max_visible_options" integer DEFAULT 3 NOT NULL,
    "allow_online" boolean DEFAULT true NOT NULL,
    "allow_offline" boolean DEFAULT false NOT NULL,
    "allow_concierge" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_plans_max_visible_options_check" CHECK (("max_visible_options" >= 1)),
    CONSTRAINT "subscription_plans_request_limit_check" CHECK ((("monthly_request_limit" IS NULL) OR ("monthly_request_limit" >= 0))),
    CONSTRAINT "subscription_plans_reveal_limit_check" CHECK ((("monthly_reveal_limit" IS NULL) OR ("monthly_reveal_limit" >= 0)))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "submission_data" "jsonb",
    "staff_notes" "text",
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "reviewed_by_staff_id" "uuid",
    CONSTRAINT "task_claims_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."task_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "request_id" "uuid",
    "event_type" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['request_created'::"text", 'source_revealed'::"text", 'report_generated'::"text", 'unlock_used'::"text", 'manual_adjustment'::"text"]))),
    CONSTRAINT "usage_events_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."usage_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_watchlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_watchlists" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_customer_current_cycle_usage" AS
 SELECT "customer_id",
    "count"(*) FILTER (WHERE ("event_type" = 'request_created'::"text")) AS "requests_used",
    COALESCE("sum"("quantity") FILTER (WHERE ("event_type" = ANY (ARRAY['unlock_used'::"text", 'source_revealed'::"text"]))), (0)::bigint) AS "reveals_used",
    "count"(*) FILTER (WHERE ("event_type" = 'report_generated'::"text")) AS "reports_generated",
    "max"("occurred_at") AS "last_usage_at"
   FROM "public"."usage_events" "ue"
  WHERE (("occurred_at" >= "date_trunc"('month'::"text", "now"())) AND ("occurred_at" < ("date_trunc"('month'::"text", "now"()) + '1 mon'::interval)))
  GROUP BY "customer_id";


ALTER VIEW "public"."v_customer_current_cycle_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_job_summary" AS
 SELECT "request_id",
    "count"(*) AS "total_jobs",
    "count"(*) FILTER (WHERE ("status" = 'queued'::"text")) AS "queued_jobs",
    "count"(*) FILTER (WHERE ("status" = 'running'::"text")) AS "running_jobs",
    "count"(*) FILTER (WHERE ("status" = 'waiting_approval'::"text")) AS "waiting_approval_jobs",
    "count"(*) FILTER (WHERE ("status" = 'completed'::"text")) AS "completed_jobs",
    "count"(*) FILTER (WHERE ("status" = 'failed'::"text")) AS "failed_jobs",
    "max"("created_at") AS "last_job_created_at",
    "max"("finished_at") AS "last_job_finished_at"
   FROM "public"."agent_jobs" "j"
  GROUP BY "request_id";


ALTER VIEW "public"."v_request_job_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_latest_qualification" AS
 SELECT DISTINCT ON ("request_id") "request_id",
    "id" AS "qualification_review_id",
    "review_source",
    "reviewed_by_user_id",
    "decision_recommendation",
    "seriousness_score",
    "profit_potential_score",
    "reputation_value_score",
    "fulfillment_feasibility_score",
    "clarity_score",
    "overall_score",
    "reason_summary",
    "internal_notes",
    "is_latest",
    "created_at",
    "updated_at"
   FROM "public"."request_qualification_reviews" "q"
  ORDER BY "request_id", "created_at" DESC, "id" DESC;


ALTER VIEW "public"."v_request_latest_qualification" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_offline_summary" AS
 SELECT "t"."request_id",
    "count"(DISTINCT "t"."id") AS "total_tasks",
    "count"("mq".*) AS "total_quotes",
    "count"(*) FILTER (WHERE ("mq"."is_shortlisted" = true)) AS "shortlisted_quotes",
    "max"("t"."created_at") AS "last_task_created_at",
    "max"("t"."finished_at") AS "last_task_finished_at"
   FROM ("public"."offline_sourcing_tasks" "t"
     LEFT JOIN "public"."merchant_quotes" "mq" ON (("mq"."task_id" = "t"."id")))
  GROUP BY "t"."request_id";


ALTER VIEW "public"."v_request_offline_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_overview" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "r"."current_status",
    "r"."source_channel",
    "r"."created_at" AS "request_created_at",
    "r"."updated_at" AS "request_updated_at",
    "c"."id" AS "customer_id",
    "c"."customer_code",
    "c"."full_name" AS "customer_name",
    "c"."governorate",
    "c"."preferred_language",
    "c"."preferred_contact_method",
    "cc"."contact_value" AS "primary_contact",
    ( SELECT "count"(*) AS "count"
           FROM "public"."offers" "o"
          WHERE ("o"."request_id" = "r"."id")) AS "offers_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."reports" "rep"
          WHERE ("rep"."request_id" = "r"."id")) AS "reports_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payments_legacy_archive" "p"
          WHERE ("p"."request_id" = "r"."id")) AS "payments_count"
   FROM (("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
     LEFT JOIN "public"."customer_contacts" "cc" ON ((("cc"."customer_id" = "c"."id") AND ("cc"."is_primary" = true))));


ALTER VIEW "public"."v_request_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_research_summary" AS
 SELECT "rr"."request_id",
    "count"(DISTINCT "rr"."id") AS "total_runs",
    "count"("ri".*) AS "total_items",
    "count"(*) FILTER (WHERE ("ri"."is_shortlisted" = true)) AS "shortlisted_items",
    "max"("rr"."created_at") AS "last_run_created_at",
    "max"("rr"."finished_at") AS "last_run_finished_at"
   FROM ("public"."research_runs" "rr"
     LEFT JOIN "public"."research_items" "ri" ON (("ri"."research_run_id" = "rr"."id")))
  GROUP BY "rr"."request_id";


ALTER VIEW "public"."v_request_research_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_admin_board" AS
 WITH "shortlist_counts" AS (
         SELECT "s_1"."request_id",
            "count"(*) FILTER (WHERE ("s_1"."is_active" = true)) AS "active_shortlist_count",
            "count"(*) FILTER (WHERE (("s_1"."is_active" = true) AND ("s_1"."published_offer_id" IS NOT NULL))) AS "published_shortlist_count"
           FROM "public"."request_candidate_shortlists" "s_1"
          GROUP BY "s_1"."request_id"
        ), "snapshot_counts" AS (
         SELECT "ros"."request_id",
            "count"(*) AS "snapshot_count"
           FROM "public"."report_option_snapshots" "ros"
          GROUP BY "ros"."request_id"
        ), "unlock_counts" AS (
         SELECT "ros"."request_id",
            "count"("u".*) AS "unlock_count"
           FROM ("public"."report_option_snapshots" "ros"
             LEFT JOIN "public"."report_option_unlocks" "u" ON (("u"."report_option_snapshot_id" = "ros"."id")))
          GROUP BY "ros"."request_id"
        ), "latest_report" AS (
         SELECT DISTINCT ON ("r"."request_id") "r"."request_id",
            "r"."id" AS "latest_report_id",
            "r"."report_status",
            "r"."created_at" AS "latest_report_created_at"
           FROM "public"."reports" "r"
          ORDER BY "r"."request_id", "r"."created_at" DESC, "r"."id" DESC
        )
 SELECT "vo"."request_id",
    "vo"."request_code",
    "vo"."title",
    "vo"."current_status" AS "legacy_current_status",
    "vo"."source_channel",
    "vo"."request_created_at",
    "vo"."request_updated_at",
    "vo"."customer_id",
    "vo"."customer_code",
    "vo"."customer_name",
    "vo"."governorate",
    "vo"."preferred_language",
    "vo"."preferred_contact_method",
    "vo"."primary_contact",
    "rp"."search_scope",
    "rp"."budget_min",
    "rp"."budget_max",
    "rp"."allow_alternatives",
    "rp"."priority_focus",
    "rp"."preferred_governorate",
    "rp"."preferred_area",
    "s"."operational_stage",
    "s"."stage_status",
    "s"."approved_for_processing",
    "s"."needs_manual_review",
    "s"."report_ready",
    "s"."client_released_at",
    "s"."latest_note",
    "lq"."decision_recommendation" AS "latest_qualification_decision",
    "lq"."overall_score" AS "latest_qualification_score",
    "lq"."reason_summary" AS "latest_qualification_reason",
    COALESCE("js"."total_jobs", (0)::bigint) AS "total_jobs",
    COALESCE("js"."queued_jobs", (0)::bigint) AS "queued_jobs",
    COALESCE("js"."running_jobs", (0)::bigint) AS "running_jobs",
    COALESCE("js"."waiting_approval_jobs", (0)::bigint) AS "waiting_approval_jobs",
    COALESCE("js"."completed_jobs", (0)::bigint) AS "completed_jobs",
    COALESCE("js"."failed_jobs", (0)::bigint) AS "failed_jobs",
    COALESCE("rs"."total_runs", (0)::bigint) AS "research_runs_count",
    COALESCE("rs"."total_items", (0)::bigint) AS "research_items_count",
    COALESCE("rs"."shortlisted_items", (0)::bigint) AS "research_shortlisted_items",
    COALESCE("os"."total_tasks", (0)::bigint) AS "offline_tasks_count",
    COALESCE("os"."total_quotes", (0)::bigint) AS "offline_quotes_count",
    COALESCE("os"."shortlisted_quotes", (0)::bigint) AS "offline_shortlisted_quotes",
    COALESCE("sc"."active_shortlist_count", (0)::bigint) AS "active_shortlist_count",
    COALESCE("sc"."published_shortlist_count", (0)::bigint) AS "published_shortlist_count",
    "vo"."offers_count",
    "vo"."reports_count",
    "vo"."payments_count",
    "lr"."latest_report_id",
    "lr"."report_status" AS "latest_report_status",
    "lr"."latest_report_created_at",
    COALESCE("sn"."snapshot_count", (0)::bigint) AS "snapshot_count",
    COALESCE("unl"."unlock_count", (0)::bigint) AS "unlock_count"
   FROM (((((((((("public"."v_request_overview" "vo"
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "vo"."request_id")))
     LEFT JOIN "public"."request_operational_states" "s" ON (("s"."request_id" = "vo"."request_id")))
     LEFT JOIN "public"."v_request_latest_qualification" "lq" ON (("lq"."request_id" = "vo"."request_id")))
     LEFT JOIN "public"."v_request_job_summary" "js" ON (("js"."request_id" = "vo"."request_id")))
     LEFT JOIN "public"."v_request_research_summary" "rs" ON (("rs"."request_id" = "vo"."request_id")))
     LEFT JOIN "public"."v_request_offline_summary" "os" ON (("os"."request_id" = "vo"."request_id")))
     LEFT JOIN "shortlist_counts" "sc" ON (("sc"."request_id" = "vo"."request_id")))
     LEFT JOIN "snapshot_counts" "sn" ON (("sn"."request_id" = "vo"."request_id")))
     LEFT JOIN "unlock_counts" "unl" ON (("unl"."request_id" = "vo"."request_id")))
     LEFT JOIN "latest_report" "lr" ON (("lr"."request_id" = "vo"."request_id")));


ALTER VIEW "public"."v_request_admin_board" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_pipeline_progress" AS
 SELECT "request_id",
    "request_code",
    "customer_name",
    "operational_stage",
    "stage_status",
    "latest_qualification_decision",
    "latest_qualification_score",
    "active_shortlist_count",
    "snapshot_count",
    "total_jobs",
    "queued_jobs",
    "running_jobs",
    "waiting_approval_jobs",
    "completed_jobs",
    "failed_jobs",
        CASE
            WHEN (("operational_stage" = 'client_ready'::"text") AND ("stage_status" = 'completed'::"text")) THEN 100.00
            WHEN ((COALESCE("report_ready", false) = true) AND (COALESCE("snapshot_count", (0)::bigint) > 0)) THEN 90.00
            WHEN ((COALESCE("latest_report_status", ''::"text") = 'approved'::"text") AND (COALESCE("snapshot_count", (0)::bigint) > 0)) THEN 90.00
            WHEN (COALESCE("active_shortlist_count", (0)::bigint) > 0) THEN 75.00
            WHEN ((COALESCE("offline_quotes_count", (0)::bigint) > 0) OR (COALESCE("research_shortlisted_items", (0)::bigint) > 0)) THEN 65.00
            WHEN (COALESCE("research_items_count", (0)::bigint) > 0) THEN 50.00
            WHEN (COALESCE("research_runs_count", (0)::bigint) > 0) THEN 35.00
            WHEN (COALESCE("approved_for_processing", false) = true) THEN 20.00
            WHEN (COALESCE("latest_qualification_decision", ''::"text") = ANY (ARRAY['accept'::"text", 'approve'::"text", 'APPROVE'::"text"])) THEN 15.00
            ELSE
            CASE
                WHEN (COALESCE("total_jobs", (0)::bigint) > 0) THEN "round"(((((COALESCE("completed_jobs", (0)::bigint) + COALESCE("failed_jobs", (0)::bigint)))::numeric / (NULLIF("total_jobs", 0))::numeric) * (100)::numeric), 2)
                ELSE 0.00
            END
        END AS "pipeline_completion_pct",
    "request_created_at",
    "request_updated_at"
   FROM "public"."v_request_admin_board" "ab";


ALTER VIEW "public"."v_request_pipeline_progress" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_ui_status" AS
 SELECT "ab"."request_id",
    "ab"."request_code",
    "ab"."customer_id",
    "ab"."title",
    "r"."raw_description",
    "ab"."legacy_current_status" AS "current_status",
    "ab"."source_channel",
    "ab"."request_created_at",
    "ab"."request_updated_at",
    "ab"."customer_code",
    "ab"."customer_name",
    "ab"."governorate",
    "ab"."preferred_language",
    "ab"."preferred_contact_method",
    "ab"."primary_contact",
    "ab"."search_scope",
    "ab"."budget_min",
    "ab"."budget_max",
    "ab"."allow_alternatives",
    "ab"."priority_focus",
    "ab"."preferred_governorate",
    "ab"."preferred_area",
    "ab"."operational_stage",
    "ab"."stage_status",
    "pp"."pipeline_completion_pct",
    "ab"."approved_for_processing",
    "ab"."needs_manual_review",
    "ab"."report_ready",
    "ab"."client_released_at",
    "ab"."latest_note",
    "ab"."latest_qualification_decision",
    "ab"."latest_qualification_score",
    "ab"."latest_qualification_reason",
    "ab"."total_jobs",
    "ab"."queued_jobs",
    "ab"."running_jobs",
    "ab"."waiting_approval_jobs",
    "ab"."completed_jobs",
    "ab"."failed_jobs",
    "ab"."research_runs_count",
    "ab"."research_items_count",
    "ab"."research_shortlisted_items",
    "ab"."offline_tasks_count",
    "ab"."offline_quotes_count",
    "ab"."offline_shortlisted_quotes",
    "ab"."active_shortlist_count",
    "ab"."published_shortlist_count",
    "ab"."offers_count",
    "ab"."reports_count",
    "ab"."payments_count",
    "ab"."latest_report_id",
    "ab"."latest_report_status",
    "ab"."latest_report_created_at",
    "ab"."snapshot_count",
    "ab"."unlock_count",
        CASE
            WHEN (COALESCE("ab"."snapshot_count", (0)::bigint) <= 0) THEN 0.00
            ELSE "round"(((LEAST((COALESCE("ab"."unlock_count", (0)::bigint))::numeric, (COALESCE("ab"."snapshot_count", (0)::bigint))::numeric) / (NULLIF(COALESCE("ab"."snapshot_count", (0)::bigint), 0))::numeric) * (100)::numeric), 2)
        END AS "customer_reveal_completion_pct",
        CASE
            WHEN ("ab"."legacy_current_status" = 'needs_clarification'::"text") THEN 'needs_clarification'::"text"
            WHEN ("ab"."legacy_current_status" = 'rejected'::"text") THEN 'rejected'::"text"
            WHEN ("ab"."legacy_current_status" = 'closed'::"text") THEN 'closed'::"text"
            WHEN (("ab"."operational_stage" = 'client_ready'::"text") AND ("ab"."stage_status" = 'completed'::"text") AND (COALESCE("ab"."snapshot_count", (0)::bigint) > 0) AND (COALESCE("ab"."unlock_count", (0)::bigint) = 0)) THEN 'report_ready'::"text"
            WHEN (("ab"."operational_stage" = 'client_ready'::"text") AND ("ab"."stage_status" = 'completed'::"text") AND (COALESCE("ab"."snapshot_count", (0)::bigint) > 0) AND (COALESCE("ab"."unlock_count", (0)::bigint) > 0) AND (COALESCE("ab"."unlock_count", (0)::bigint) < COALESCE("ab"."snapshot_count", (0)::bigint))) THEN 'partially_revealed'::"text"
            WHEN (("ab"."operational_stage" = 'client_ready'::"text") AND ("ab"."stage_status" = 'completed'::"text") AND (COALESCE("ab"."snapshot_count", (0)::bigint) > 0) AND (COALESCE("ab"."unlock_count", (0)::bigint) >= COALESCE("ab"."snapshot_count", (0)::bigint))) THEN 'fully_revealed'::"text"
            WHEN (("ab"."operational_stage" = 'research'::"text") AND ("ab"."stage_status" = 'in_progress'::"text")) THEN 'research_in_progress'::"text"
            WHEN (("ab"."legacy_current_status" = 'accepted'::"text") AND (COALESCE("ab"."latest_report_status", ''::"text") = 'approved'::"text") AND (COALESCE("ab"."snapshot_count", (0)::bigint) > 0)) THEN 'report_ready'::"text"
            ELSE COALESCE("ab"."legacy_current_status", 'unknown'::"text")
        END AS "customer_visible_status"
   FROM (("public"."v_request_admin_board" "ab"
     LEFT JOIN "public"."requests" "r" ON (("r"."id" = "ab"."request_id")))
     LEFT JOIN "public"."v_request_pipeline_progress" "pp" ON (("pp"."request_id" = "ab"."request_id")));


ALTER VIEW "public"."v_request_ui_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_customer_request_portal_overview" AS
 SELECT "ui"."request_id",
    "ui"."request_code",
    "ui"."customer_id",
    "c"."auth_user_id" AS "customer_auth_user_id",
    "c"."full_name" AS "customer_name",
    "ui"."title",
    "ui"."raw_description",
    "ui"."current_status",
    "ui"."customer_visible_status",
    "ui"."source_channel",
    "ui"."preferred_language",
    "ui"."search_scope",
    "ui"."operational_stage",
    "ui"."stage_status",
    "ui"."pipeline_completion_pct",
    "ui"."customer_reveal_completion_pct",
    "rp"."budget_min",
    "rp"."budget_max",
    "rp"."preferred_brands",
    "rp"."preferred_models",
    "rp"."preferred_specs",
    "rp"."condition_preference",
    "rp"."priority_focus",
    "rp"."search_scope" AS "requested_search_scope",
    "rp"."preferred_governorate",
    "rp"."preferred_area",
    "rp"."delivery_needed",
    "rp"."notes",
    "ui"."reports_count",
    "ui"."latest_report_id",
    "ui"."latest_report_status",
    "ui"."latest_report_created_at",
    "ui"."snapshot_count",
    "ui"."unlock_count",
    "ui"."client_released_at",
    "ui"."request_created_at",
    "ui"."request_updated_at"
   FROM (("public"."v_request_ui_status" "ui"
     JOIN "public"."customers" "c" ON (("c"."id" = "ui"."customer_id")))
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "ui"."request_id")));


ALTER VIEW "public"."v_customer_request_portal_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_guest_request_tracking_overview" AS
 SELECT "request_id",
    "request_code",
    "customer_id",
    "customer_name",
    "title",
    "raw_description",
    "current_status",
    "customer_visible_status",
    "source_channel",
    "preferred_language",
    "search_scope",
    "operational_stage",
    "stage_status",
    "pipeline_completion_pct",
    "customer_reveal_completion_pct",
    "reports_count",
    "latest_report_id",
    "latest_report_status",
    "latest_report_created_at",
    "snapshot_count",
    "unlock_count",
    "client_released_at",
    "request_created_at",
    "request_updated_at"
   FROM "public"."v_customer_request_portal_overview" "v";


ALTER VIEW "public"."v_guest_request_tracking_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_intake_request_queue" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "r"."raw_description",
    "r"."reference_image_path",
    (("r"."reference_image_path" IS NOT NULL) AND ("btrim"("r"."reference_image_path") <> ''::"text")) AS "has_reference_image",
    "r"."request_kind",
    "r"."current_status",
    "r"."source_channel",
    "r"."intake_mode",
    "r"."execution_requested",
    "r"."followup_requested",
    "r"."site_visit_requested",
    "r"."pricing_decision",
    "r"."service_fee_amount",
    "r"."created_at" AS "request_created_at",
    "r"."updated_at" AS "request_updated_at",
    "c"."id" AS "customer_id",
    "c"."customer_code",
    "c"."full_name" AS "customer_name",
    "c"."email" AS "customer_email",
    "c"."phone_number_raw",
    "c"."phone_number_normalized",
    "rp"."budget_min",
    "rp"."budget_max",
    "rp"."urgency_level",
    "rp"."priority_focus",
    "rp"."search_scope",
    "rp"."preferred_governorate",
    "rp"."preferred_area",
    "rp"."delivery_needed",
    "r"."intake_ai_decision",
    "r"."intake_ai_confidence",
    "r"."intake_reason_code",
    "r"."intake_summary",
    "r"."reviewer_decision",
    "r"."reviewer_decided_at",
        CASE
            WHEN ("r"."reviewer_decision" IS NOT NULL) THEN 'staff_reviewed'::"text"
            WHEN ("r"."intake_ai_decision" IS NOT NULL) THEN 'pending_staff_review'::"text"
            ELSE 'pending_ai_review'::"text"
        END AS "intake_stage"
   FROM (("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "r"."id")))
  WHERE ((COALESCE("r"."is_cancelled", false) = false) AND (COALESCE("r"."is_archived", false) = false) AND (COALESCE("r"."is_soft_deleted", false) = false));


ALTER VIEW "public"."v_intake_request_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_intake_request_workspace" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."customer_id",
    "c"."customer_code",
    "c"."full_name" AS "customer_name",
    "c"."email" AS "customer_email",
    "c"."phone_number_raw",
    "c"."phone_number_normalized",
    "r"."title",
    "r"."raw_description",
    "r"."reference_image_path",
    "r"."request_kind",
    "r"."current_status",
    "r"."source_channel",
    "r"."intake_mode",
    "r"."execution_requested",
    "r"."followup_requested",
    "r"."site_visit_requested",
    "r"."pricing_decision",
    "r"."service_fee_amount",
    "r"."pricing_notes",
    "r"."intake_ai_decision",
    "r"."intake_ai_confidence",
    "r"."intake_reason_code",
    "r"."intake_summary",
    "r"."intake_internal_reasoning",
    "r"."intake_clarification_questions",
    "r"."intake_reviewer_note",
    "r"."reviewer_decision",
    "r"."reviewer_decided_by_staff_id",
    "r"."reviewer_decided_at",
    "r"."reviewer_notes",
    "r"."created_at" AS "request_created_at",
    "r"."updated_at" AS "request_updated_at",
    "rp"."id" AS "preference_id",
    "rp"."budget_min",
    "rp"."budget_max",
    "rp"."preferred_brands",
    "rp"."preferred_models",
    "rp"."preferred_specs",
    "rp"."allow_alternatives",
    "rp"."condition_preference",
    "rp"."urgency_level",
    "rp"."knows_market_price",
    "rp"."estimated_market_price",
    "rp"."priority_focus",
    "rp"."search_scope",
    "rp"."preferred_governorate",
    "rp"."preferred_area",
    "rp"."delivery_needed",
    "rp"."notes" AS "preference_notes",
    "rp"."created_at" AS "preference_created_at",
    "rp"."updated_at" AS "preference_updated_at",
        CASE
            WHEN ("r"."reviewer_decision" IS NOT NULL) THEN 'staff_reviewed'::"text"
            WHEN ("r"."intake_ai_decision" IS NOT NULL) THEN 'pending_staff_review'::"text"
            ELSE 'pending_ai_review'::"text"
        END AS "intake_stage"
   FROM (("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "r"."id")))
  WHERE ((COALESCE("r"."is_cancelled", false) = false) AND (COALESCE("r"."is_archived", false) = false) AND (COALESCE("r"."is_soft_deleted", false) = false));


ALTER VIEW "public"."v_intake_request_workspace" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_merchant_directory" AS
 SELECT "m"."id" AS "merchant_id",
    "m"."merchant_code",
    "m"."name",
    "m"."merchant_type",
    "m"."city",
    "m"."area",
    "m"."primary_phone",
    "m"."whatsapp",
    "m"."email",
    "m"."website_url",
    "m"."supports_online",
    "m"."supports_offline",
    "m"."overall_score",
    "m"."reliability_score",
    "m"."quality_score",
    "m"."price_competitiveness_score",
    "m"."service_score",
    "m"."is_active",
    "m"."last_contacted_at",
    "m"."last_active_at",
    "string_agg"(DISTINCT "mc"."name_en", ', '::"text") FILTER (WHERE ("mc"."name_en" IS NOT NULL)) AS "category_names_en",
    "string_agg"(DISTINCT "mc"."name_ar", ', '::"text") FILTER (WHERE ("mc"."name_ar" IS NOT NULL)) AS "category_names_ar"
   FROM (("public"."merchants" "m"
     LEFT JOIN "public"."merchant_category_map" "mcm" ON (("mcm"."merchant_id" = "m"."id")))
     LEFT JOIN "public"."merchant_categories" "mc" ON (("mc"."id" = "mcm"."category_id")))
  GROUP BY "m"."id", "m"."merchant_code", "m"."name", "m"."merchant_type", "m"."city", "m"."area", "m"."primary_phone", "m"."whatsapp", "m"."email", "m"."website_url", "m"."supports_online", "m"."supports_offline", "m"."overall_score", "m"."reliability_score", "m"."quality_score", "m"."price_competitiveness_score", "m"."service_score", "m"."is_active", "m"."last_contacted_at", "m"."last_active_at";


ALTER VIEW "public"."v_merchant_directory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_merchant_profile_summary" AS
 WITH "contact_rollup" AS (
         SELECT "mc"."merchant_id",
            "count"(*) AS "contact_rows_count",
            "max"(
                CASE
                    WHEN (("mc"."contact_type" = 'phone'::"text") AND "mc"."is_primary") THEN "mc"."contact_value"
                    ELSE NULL::"text"
                END) AS "primary_phone_contact",
            "max"(
                CASE
                    WHEN (("mc"."contact_type" = 'whatsapp'::"text") AND "mc"."is_primary") THEN "mc"."contact_value"
                    ELSE NULL::"text"
                END) AS "primary_whatsapp_contact",
            "max"(
                CASE
                    WHEN (("mc"."contact_type" = 'email'::"text") AND "mc"."is_primary") THEN "mc"."contact_value"
                    ELSE NULL::"text"
                END) AS "primary_email_contact",
            "bool_or"(("mc"."contact_type" = 'phone'::"text")) AS "has_phone_contact",
            "bool_or"(("mc"."contact_type" = 'whatsapp'::"text")) AS "has_whatsapp_contact",
            "bool_or"(("mc"."contact_type" = 'email'::"text")) AS "has_email_contact",
            "max"("mc"."created_at") AS "latest_contact_at"
           FROM "public"."merchant_contacts" "mc"
          GROUP BY "mc"."merchant_id"
        ), "evaluation_rollup" AS (
         SELECT "me"."merchant_id",
            "count"(*) AS "evaluations_count",
            "round"("avg"("me"."overall_score"), 2) AS "avg_overall_score",
            "round"("avg"("me"."reliability_score"), 2) AS "avg_reliability_score",
            "round"("avg"("me"."quality_score"), 2) AS "avg_quality_score",
            "round"("avg"("me"."price_competitiveness_score"), 2) AS "avg_price_score",
            "round"("avg"("me"."service_score"), 2) AS "avg_service_score",
            "max"("me"."created_at") AS "latest_evaluation_at"
           FROM "public"."merchant_evaluations" "me"
          GROUP BY "me"."merchant_id"
        ), "quote_rollup" AS (
         SELECT "mq"."merchant_id",
            "count"(*) AS "quotes_count",
            "count"(*) FILTER (WHERE ("mq"."is_shortlisted" = true)) AS "shortlisted_quotes_count",
            "max"("mq"."created_at") AS "latest_quote_at"
           FROM "public"."merchant_quotes" "mq"
          WHERE ("mq"."merchant_id" IS NOT NULL)
          GROUP BY "mq"."merchant_id"
        ), "match_rollup" AS (
         SELECT "rmm"."merchant_id",
            "count"(*) AS "matches_count",
            "count"(DISTINCT "rmm"."request_id") AS "matched_requests_count"
           FROM "public"."request_merchant_matches" "rmm"
          GROUP BY "rmm"."merchant_id"
        ), "offer_rollup" AS (
         SELECT "o"."merchant_id",
            "count"(*) AS "offers_count",
            "count"(DISTINCT "o"."request_id") AS "offer_requests_count"
           FROM "public"."offers" "o"
          WHERE ("o"."merchant_id" IS NOT NULL)
          GROUP BY "o"."merchant_id"
        ), "category_rollup" AS (
         SELECT "mcm"."merchant_id",
            "count"(*) AS "categories_count",
            "count"(*) FILTER (WHERE ("mcm"."is_primary" = true)) AS "primary_categories_count"
           FROM "public"."merchant_category_map" "mcm"
          GROUP BY "mcm"."merchant_id"
        ), "service_area_rollup" AS (
         SELECT "msa"."merchant_id",
            "count"(*) AS "service_areas_count",
            "count"(*) FILTER (WHERE ("msa"."supports_products" = true)) AS "product_service_areas_count",
            "count"(*) FILTER (WHERE ("msa"."supports_services" = true)) AS "service_service_areas_count",
            "count"(*) FILTER (WHERE ("msa"."supports_site_visits" = true)) AS "visit_service_areas_count"
           FROM "public"."merchant_service_areas" "msa"
          GROUP BY "msa"."merchant_id"
        ), "source_link_rollup" AS (
         SELECT "msl"."merchant_id",
            "count"(*) AS "source_links_count",
            "count"(*) FILTER (WHERE ("msl"."is_active" = true)) AS "active_source_links_count",
            "max"("msl"."created_at") AS "latest_source_link_at"
           FROM "public"."merchant_source_links" "msl"
          GROUP BY "msl"."merchant_id"
        )
 SELECT "m"."id" AS "merchant_id",
    "m"."merchant_code",
    "m"."name",
    "m"."merchant_type",
    "m"."city",
    "m"."area",
    "m"."primary_phone",
    "m"."whatsapp",
    "m"."email",
    "m"."website_url",
    "m"."facebook_url",
    "m"."instagram_url",
    "m"."telegram_handle",
    "m"."specialization_summary",
    "m"."supports_online",
    "m"."supports_offline",
    "m"."default_currency_code",
    "m"."is_active",
    "m"."notes",
    "m"."overall_score" AS "stored_overall_score",
    "m"."reliability_score" AS "stored_reliability_score",
    COALESCE("cr"."contact_rows_count", (0)::bigint) AS "contact_rows_count",
    COALESCE("cr"."has_phone_contact", false) AS "has_phone_contact",
    COALESCE("cr"."has_whatsapp_contact", false) AS "has_whatsapp_contact",
    COALESCE("cr"."has_email_contact", false) AS "has_email_contact",
    "cr"."primary_phone_contact",
    "cr"."primary_whatsapp_contact",
    "cr"."primary_email_contact",
    COALESCE("er"."evaluations_count", (0)::bigint) AS "evaluations_count",
    "er"."avg_overall_score",
    "er"."avg_reliability_score",
    "er"."avg_quality_score",
    "er"."avg_price_score",
    "er"."avg_service_score",
    COALESCE("qr"."quotes_count", (0)::bigint) AS "quotes_count",
    COALESCE("qr"."shortlisted_quotes_count", (0)::bigint) AS "shortlisted_quotes_count",
    COALESCE("mr"."matches_count", (0)::bigint) AS "matches_count",
    COALESCE("mr"."matched_requests_count", (0)::bigint) AS "matched_requests_count",
    COALESCE("orw"."offers_count", (0)::bigint) AS "offers_count",
    COALESCE("orw"."offer_requests_count", (0)::bigint) AS "offer_requests_count",
    COALESCE("cat"."categories_count", (0)::bigint) AS "categories_count",
    COALESCE("cat"."primary_categories_count", (0)::bigint) AS "primary_categories_count",
    COALESCE("sa"."service_areas_count", (0)::bigint) AS "service_areas_count",
    COALESCE("sa"."product_service_areas_count", (0)::bigint) AS "product_service_areas_count",
    COALESCE("sa"."service_service_areas_count", (0)::bigint) AS "service_service_areas_count",
    COALESCE("sa"."visit_service_areas_count", (0)::bigint) AS "visit_service_areas_count",
    COALESCE("sl"."source_links_count", (0)::bigint) AS "source_links_count",
    COALESCE("sl"."active_source_links_count", (0)::bigint) AS "active_source_links_count",
    COALESCE("er"."avg_overall_score", "m"."overall_score") AS "effective_overall_score",
    COALESCE("er"."avg_reliability_score", "m"."reliability_score") AS "effective_reliability_score",
    GREATEST(COALESCE("m"."updated_at", '-infinity'::timestamp with time zone), COALESCE("cr"."latest_contact_at", '-infinity'::timestamp with time zone), COALESCE("er"."latest_evaluation_at", '-infinity'::timestamp with time zone), COALESCE("qr"."latest_quote_at", '-infinity'::timestamp with time zone), COALESCE("sl"."latest_source_link_at", '-infinity'::timestamp with time zone)) AS "latest_activity_at",
    "m"."created_at",
    "m"."updated_at"
   FROM (((((((("public"."merchants" "m"
     LEFT JOIN "contact_rollup" "cr" ON (("cr"."merchant_id" = "m"."id")))
     LEFT JOIN "evaluation_rollup" "er" ON (("er"."merchant_id" = "m"."id")))
     LEFT JOIN "quote_rollup" "qr" ON (("qr"."merchant_id" = "m"."id")))
     LEFT JOIN "match_rollup" "mr" ON (("mr"."merchant_id" = "m"."id")))
     LEFT JOIN "offer_rollup" "orw" ON (("orw"."merchant_id" = "m"."id")))
     LEFT JOIN "category_rollup" "cat" ON (("cat"."merchant_id" = "m"."id")))
     LEFT JOIN "service_area_rollup" "sa" ON (("sa"."merchant_id" = "m"."id")))
     LEFT JOIN "source_link_rollup" "sl" ON (("sl"."merchant_id" = "m"."id")));


ALTER VIEW "public"."v_merchant_profile_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_stage_clock" AS
 WITH "stage_entry" AS (
         SELECT "r"."id" AS "request_id",
            "r"."request_code",
            "r"."current_status",
            "r"."reviewer_decision",
            "r"."is_archived",
            "r"."created_at",
            "r"."operations_entered_at",
            "r"."reporting_entered_at",
            "r"."ready_entered_at",
            "r"."clarification_requested_at",
            "r"."rejected_at",
            "v"."client_released_at",
            "public"."fn_resolve_canonical_state"("r"."is_archived", "r"."current_status", "r"."reviewer_decision", "v"."client_released_at") AS "canonical_state"
           FROM ("public"."requests" "r"
             LEFT JOIN "public"."v_request_ui_status" "v" ON (("v"."request_id" = "r"."id")))
        ), "stage_mapping" AS (
         SELECT "se"."request_id",
            "se"."request_code",
            "se"."current_status",
            "se"."reviewer_decision",
            "se"."is_archived",
            "se"."created_at",
            "se"."operations_entered_at",
            "se"."reporting_entered_at",
            "se"."ready_entered_at",
            "se"."clarification_requested_at",
            "se"."rejected_at",
            "se"."client_released_at",
            "se"."canonical_state",
                CASE
                    WHEN ("se"."canonical_state" = 'INTAKE'::"text") THEN 'intake'::"text"
                    WHEN ("se"."canonical_state" = 'ISSUES'::"text") THEN 'issues'::"text"
                    WHEN (("se"."canonical_state" = 'OPERATIONS'::"text") AND ("se"."current_status" = 'in_progress'::"text")) THEN 'in_progress'::"text"
                    WHEN (("se"."canonical_state" = 'OPERATIONS'::"text") AND ("se"."current_status" = 'research'::"text")) THEN 'research'::"text"
                    WHEN (("se"."canonical_state" = 'OPERATIONS'::"text") AND ("se"."current_status" = 'reporting'::"text")) THEN 'reporting'::"text"
                    WHEN ("se"."canonical_state" = 'READY'::"text") THEN 'ready'::"text"
                    WHEN ("se"."canonical_state" = 'COMPLETED'::"text") THEN 'completed'::"text"
                    WHEN ("se"."canonical_state" = 'ARCHIVED'::"text") THEN 'archived'::"text"
                    ELSE 'unknown'::"text"
                END AS "current_stage_code"
           FROM "stage_entry" "se"
        ), "clock_calculation" AS (
         SELECT "sm"."request_id",
            "sm"."request_code",
            "sm"."current_status",
            "sm"."reviewer_decision",
            "sm"."is_archived",
            "sm"."created_at",
            "sm"."operations_entered_at",
            "sm"."reporting_entered_at",
            "sm"."ready_entered_at",
            "sm"."clarification_requested_at",
            "sm"."rejected_at",
            "sm"."client_released_at",
            "sm"."canonical_state",
            "sm"."current_stage_code",
                CASE
                    WHEN ("sm"."current_stage_code" = 'intake'::"text") THEN COALESCE(( SELECT "max"("h_in"."created_at") AS "max"
                       FROM "public"."request_status_history" "h_in"
                      WHERE (("h_in"."request_id" = "sm"."request_id") AND ("h_in"."to_canonical_state" = 'INTAKE'::"text"))), "sm"."created_at")
                    WHEN ("sm"."current_stage_code" = 'issues'::"text") THEN COALESCE(
                    CASE
                        WHEN ("sm"."reviewer_decision" = 'needs_clarification'::"text") THEN "sm"."clarification_requested_at"
                        WHEN ("sm"."reviewer_decision" = 'reject'::"text") THEN "sm"."rejected_at"
                        ELSE NULL::timestamp with time zone
                    END, ( SELECT "max"("h_iss"."created_at") AS "max"
                       FROM "public"."request_status_history" "h_iss"
                      WHERE (("h_iss"."request_id" = "sm"."request_id") AND ("h_iss"."to_canonical_state" = 'ISSUES'::"text"))))
                    WHEN ("sm"."current_stage_code" = 'in_progress'::"text") THEN "sm"."operations_entered_at"
                    WHEN ("sm"."current_stage_code" = 'research'::"text") THEN ( SELECT "max"("h_res"."created_at") AS "max"
                       FROM "public"."request_status_history" "h_res"
                      WHERE (("h_res"."request_id" = "sm"."request_id") AND ("h_res"."to_status" = 'research'::"text")))
                    WHEN ("sm"."current_stage_code" = 'reporting'::"text") THEN "sm"."reporting_entered_at"
                    WHEN ("sm"."current_stage_code" = 'ready'::"text") THEN "sm"."ready_entered_at"
                    WHEN ("sm"."current_stage_code" = 'completed'::"text") THEN "sm"."client_released_at"
                    ELSE NULL::timestamp with time zone
                END AS "current_stage_entered_at",
            ( SELECT "max"("h_last"."created_at") AS "max"
                   FROM "public"."request_status_history" "h_last"
                  WHERE ("h_last"."request_id" = "sm"."request_id")) AS "last_transition_at"
           FROM "stage_mapping" "sm"
        )
 SELECT "request_id",
    "request_code",
    "canonical_state",
    "current_status",
    "current_stage_code",
    "current_stage_entered_at",
    "last_transition_at",
        CASE
            WHEN (("canonical_state" = ANY (ARRAY['COMPLETED'::"text", 'ARCHIVED'::"text"])) OR ("current_stage_entered_at" IS NULL)) THEN NULL::numeric
            ELSE (EXTRACT(epoch FROM ("now"() - "current_stage_entered_at")) / (60)::numeric)
        END AS "stage_age_minutes",
        CASE
            WHEN (("canonical_state" = ANY (ARRAY['COMPLETED'::"text", 'ARCHIVED'::"text"])) OR ("current_stage_entered_at" IS NULL)) THEN NULL::numeric
            ELSE (EXTRACT(epoch FROM ("now"() - "current_stage_entered_at")) / (3600)::numeric)
        END AS "stage_age_hours",
        CASE
            WHEN ("canonical_state" = ANY (ARRAY['INTAKE'::"text", 'ISSUES'::"text", 'OPERATIONS'::"text", 'READY'::"text"])) THEN true
            ELSE false
        END AS "is_active_work"
   FROM "clock_calculation";


ALTER VIEW "public"."v_request_stage_clock" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_sla_monitoring" AS
 WITH "active_clocks" AS (
         SELECT "c"."request_id",
            "c"."request_code",
            "c"."canonical_state",
            "c"."current_status",
            "c"."current_stage_code",
            "c"."current_stage_entered_at",
            "c"."last_transition_at",
            "c"."stage_age_minutes",
            "c"."stage_age_hours",
            "c"."is_active_work",
            COALESCE("p"."urgency_level", 'normal'::"text") AS "urgency_level"
           FROM ("public"."v_request_stage_clock" "c"
             LEFT JOIN "public"."request_preferences" "p" ON (("p"."request_id" = "c"."request_id")))
          WHERE (("c"."is_active_work" = true) AND ("c"."current_stage_entered_at" IS NOT NULL))
        ), "threshold_policy" AS (
         SELECT "active_clocks"."request_id",
            "active_clocks"."request_code",
            "active_clocks"."canonical_state",
            "active_clocks"."current_status",
            "active_clocks"."current_stage_code",
            "active_clocks"."current_stage_entered_at",
            "active_clocks"."last_transition_at",
            "active_clocks"."stage_age_minutes",
            "active_clocks"."stage_age_hours",
            "active_clocks"."is_active_work",
            "active_clocks"."urgency_level",
                CASE
                    WHEN ("active_clocks"."urgency_level" = 'urgent'::"text") THEN 12.0
                    ELSE 24.0
                END AS "sla_warning_threshold_hours",
                CASE
                    WHEN ("active_clocks"."urgency_level" = 'urgent'::"text") THEN 24.0
                    ELSE 48.0
                END AS "sla_breach_threshold_hours"
           FROM "active_clocks"
        )
 SELECT "request_id",
    "request_code",
    "canonical_state",
    "current_status",
    "current_stage_code",
    "current_stage_entered_at",
    "last_transition_at",
    "stage_age_minutes",
    "stage_age_hours",
    "is_active_work",
    "urgency_level",
    "sla_warning_threshold_hours",
    "sla_breach_threshold_hours",
    ("sla_breach_threshold_hours" - "stage_age_hours") AS "time_to_breach_hours",
        CASE
            WHEN ("stage_age_hours" >= "sla_breach_threshold_hours") THEN 'breached'::"text"
            WHEN ("stage_age_hours" >= "sla_warning_threshold_hours") THEN 'warning'::"text"
            ELSE 'on_time'::"text"
        END AS "sla_status"
   FROM "threshold_policy";


ALTER VIEW "public"."v_request_sla_monitoring" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_queue_performance_metrics" AS
 SELECT "current_stage_code",
    "sla_status",
    "count"(*) AS "request_count",
    "avg"("stage_age_hours") AS "avg_stage_age_hours"
   FROM "public"."v_request_sla_monitoring"
  GROUP BY "current_stage_code", "sla_status";


ALTER VIEW "public"."v_queue_performance_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_candidate_pool" AS
 SELECT 'online'::"text" AS "candidate_channel",
    "ri"."id" AS "candidate_id",
    "ri"."request_id",
    "ri"."option_label",
    "ri"."source_name",
    "ri"."source_type",
    NULL::"uuid" AS "merchant_id",
    NULL::"text" AS "merchant_name",
    "ri"."product_title",
    "ri"."product_brand",
    "ri"."product_model",
    "ri"."product_specs_summary",
    "ri"."price_amount",
    "ri"."currency_code",
    "ri"."availability_status",
    "ri"."warranty_info",
    "ri"."trust_score",
    "ri"."value_score",
    "ri"."fit_score",
    "ri"."final_score",
    "ri"."listing_url" AS "reference_url",
    "ri"."is_shortlisted",
    "ri"."created_at"
   FROM "public"."research_items" "ri"
UNION ALL
 SELECT 'offline'::"text" AS "candidate_channel",
    "mq"."id" AS "candidate_id",
    "mq"."request_id",
    "mq"."option_label",
    COALESCE("m"."name", 'offline_quote'::"text") AS "source_name",
    'merchant'::"text" AS "source_type",
    "mq"."merchant_id",
    "m"."name" AS "merchant_name",
    "mq"."product_title",
    "mq"."product_brand",
    "mq"."product_model",
    "mq"."product_specs_summary",
    "mq"."price_amount",
    "mq"."currency_code",
    "mq"."availability_status",
    "mq"."warranty_info",
    "mq"."trust_score",
    "mq"."value_score",
    "mq"."fit_score",
    "mq"."final_score",
    NULL::"text" AS "reference_url",
    "mq"."is_shortlisted",
    "mq"."created_at"
   FROM ("public"."merchant_quotes" "mq"
     LEFT JOIN "public"."merchants" "m" ON (("m"."id" = "mq"."merchant_id")));


ALTER VIEW "public"."v_request_candidate_pool" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_compliance_overview" AS
 WITH "hit_rollup" AS (
         SELECT "h"."request_id",
            ("count"(*))::integer AS "total_hits",
            ("count"(*) FILTER (WHERE ("cr"."decision_mode" = 'blocked'::"text")))::integer AS "blocked_hits",
            ("count"(*) FILTER (WHERE ("cr"."decision_mode" = 'manual_review'::"text")))::integer AS "manual_review_hits",
            ("count"(*) FILTER (WHERE ("cr"."decision_mode" = 'warning_only'::"text")))::integer AS "warning_hits",
            "array_agg"(DISTINCT "cr"."rule_code" ORDER BY "cr"."rule_code") AS "matched_rule_codes",
            "max"("h"."created_at") AS "latest_hit_at"
           FROM ("public"."request_compliance_hits" "h"
             JOIN "public"."compliance_rules" "cr" ON (("cr"."id" = "h"."rule_id")))
          WHERE ("cr"."is_active" = true)
          GROUP BY "h"."request_id"
        ), "latest_action" AS (
         SELECT "x"."id",
            "x"."request_id",
            "x"."recommended_decision",
            "x"."applied_decision",
            "x"."decision_reason",
            "x"."summary_text",
            "x"."actor_staff_id",
            "x"."action_source",
            "x"."metadata",
            "x"."created_at",
            "x"."rn"
           FROM ( SELECT "a"."id",
                    "a"."request_id",
                    "a"."recommended_decision",
                    "a"."applied_decision",
                    "a"."decision_reason",
                    "a"."summary_text",
                    "a"."actor_staff_id",
                    "a"."action_source",
                    "a"."metadata",
                    "a"."created_at",
                    "row_number"() OVER (PARTITION BY "a"."request_id" ORDER BY "a"."created_at" DESC, "a"."id" DESC) AS "rn"
                   FROM "public"."request_compliance_actions" "a") "x"
          WHERE ("x"."rn" = 1)
        )
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."customer_id",
    "r"."title",
    "r"."current_status",
    COALESCE("hr"."total_hits", 0) AS "total_hits",
    COALESCE("hr"."blocked_hits", 0) AS "blocked_hits",
    COALESCE("hr"."manual_review_hits", 0) AS "manual_review_hits",
    COALESCE("hr"."warning_hits", 0) AS "warning_hits",
    COALESCE("hr"."matched_rule_codes", '{}'::"text"[]) AS "matched_rule_codes",
        CASE
            WHEN ("la"."recommended_decision" IS NOT NULL) THEN "la"."recommended_decision"
            WHEN (COALESCE("hr"."blocked_hits", 0) > 0) THEN 'blocked'::"text"
            WHEN (COALESCE("hr"."manual_review_hits", 0) > 0) THEN 'manual_review'::"text"
            WHEN (COALESCE("hr"."warning_hits", 0) > 0) THEN 'warning_only'::"text"
            ELSE 'clear'::"text"
        END AS "latest_recommended_decision",
    "la"."applied_decision" AS "latest_applied_decision",
    "la"."decision_reason" AS "latest_decision_reason",
    "la"."summary_text" AS "latest_summary_text",
    "la"."action_source" AS "latest_action_source",
    "la"."actor_staff_id" AS "latest_actor_staff_id",
    "hr"."latest_hit_at",
    "la"."created_at" AS "latest_action_at",
    "r"."created_at" AS "request_created_at",
    "r"."updated_at" AS "request_updated_at"
   FROM (("public"."requests" "r"
     LEFT JOIN "hit_rollup" "hr" ON (("hr"."request_id" = "r"."id")))
     LEFT JOIN "latest_action" "la" ON (("la"."request_id" = "r"."id")));


ALTER VIEW "public"."v_request_compliance_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_delivery_overview" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "r"."current_status",
    "count"(DISTINCT "rep"."id") AS "reports_count",
    "max"("rep"."report_version") AS "latest_report_version",
    "max"("rep"."report_status") FILTER (WHERE ("rep"."report_version" = ( SELECT "max"("rep2"."report_version") AS "max"
           FROM "public"."reports" "rep2"
          WHERE ("rep2"."request_id" = "r"."id")))) AS "latest_report_status",
    "count"(DISTINCT "ros"."id") AS "snapshots_count",
    "count"(DISTINCT "rou"."id") AS "unlocks_count",
    "max"("rep"."approved_at") AS "latest_report_approved_at",
    "max"("rou"."created_at") AS "latest_unlock_at"
   FROM ((("public"."requests" "r"
     LEFT JOIN "public"."reports" "rep" ON (("rep"."request_id" = "r"."id")))
     LEFT JOIN "public"."report_option_snapshots" "ros" ON (("ros"."request_id" = "r"."id")))
     LEFT JOIN "public"."report_option_unlocks" "rou" ON (("rou"."request_id" = "r"."id")))
  GROUP BY "r"."id", "r"."request_code", "r"."title", "r"."current_status";


ALTER VIEW "public"."v_request_delivery_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_merchant_match_overview" AS
 SELECT "rmm"."id",
    "rmm"."request_id",
    "r"."request_code",
    "r"."title" AS "request_title",
    "rmm"."merchant_id",
    "m"."name" AS "merchant_name",
    "m"."merchant_type",
    "m"."city" AS "merchant_city",
    "m"."area" AS "merchant_area",
    "rmm"."source_channel",
    "rmm"."match_status",
    "rmm"."match_score",
    "rmm"."quote_amount",
    "rmm"."currency_code",
    "rmm"."note",
    "rmm"."created_at",
    "rmm"."updated_at"
   FROM (("public"."request_merchant_matches" "rmm"
     JOIN "public"."requests" "r" ON (("r"."id" = "rmm"."request_id")))
     JOIN "public"."merchants" "m" ON (("m"."id" = "rmm"."merchant_id")));


ALTER VIEW "public"."v_request_merchant_match_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_offers_comparison" AS
 SELECT "r"."request_code",
    "o"."id" AS "offer_id",
    "o"."option_label",
    "o"."source_type",
    "o"."product_title",
    "o"."product_brand",
    "o"."product_model",
    "o"."product_specs_summary",
    "o"."price_amount",
    "o"."currency_code",
    "o"."availability_status",
    "o"."warranty_info",
    "o"."trust_score",
    "o"."value_score",
    "o"."ranking_position",
    "o"."is_recommended",
    "m"."name" AS "merchant_name",
    "m"."merchant_type",
    "m"."city",
    "m"."area"
   FROM (("public"."offers" "o"
     JOIN "public"."requests" "r" ON (("r"."id" = "o"."request_id")))
     LEFT JOIN "public"."merchants" "m" ON (("m"."id" = "o"."merchant_id")));


ALTER VIEW "public"."v_request_offers_comparison" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_release_readiness" AS
 WITH "latest_report" AS (
         SELECT DISTINCT ON ("r_1"."request_id") "r_1"."request_id",
            "r_1"."id" AS "latest_report_id",
            "r_1"."report_status"
           FROM "public"."reports" "r_1"
          ORDER BY "r_1"."request_id", "r_1"."created_at" DESC, "r_1"."id" DESC
        ), "candidate_counts" AS (
         SELECT "cp"."request_id",
            "count"(*) AS "total_candidates"
           FROM "public"."v_request_candidate_pool" "cp"
          GROUP BY "cp"."request_id"
        ), "shortlist_counts" AS (
         SELECT "s"."request_id",
            "count"(*) FILTER (WHERE ("s"."is_active" = true)) AS "active_shortlist_count",
            "count"(*) FILTER (WHERE (("s"."is_active" = true) AND ("s"."published_offer_id" IS NOT NULL))) AS "published_shortlist_count"
           FROM "public"."request_candidate_shortlists" "s"
          GROUP BY "s"."request_id"
        ), "snapshot_counts" AS (
         SELECT "ros"."request_id",
            "count"(*) AS "snapshot_count"
           FROM "public"."report_option_snapshots" "ros"
          GROUP BY "ros"."request_id"
        )
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    COALESCE("cc"."total_candidates", (0)::bigint) AS "total_candidates",
    COALESCE("sc"."active_shortlist_count", (0)::bigint) AS "active_shortlist_count",
    COALESCE("sc"."published_shortlist_count", (0)::bigint) AS "published_shortlist_count",
    COALESCE("sn"."snapshot_count", (0)::bigint) AS "snapshot_count",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."offers" "o"
          WHERE ("o"."request_id" = "r"."id")), (0)::bigint) AS "offers_count",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."reports" "rep"
          WHERE ("rep"."request_id" = "r"."id")), (0)::bigint) AS "reports_count",
    "lr"."latest_report_id",
    "lr"."report_status" AS "latest_report_status",
    (COALESCE("cc"."total_candidates", (0)::bigint) > 0) AS "has_candidates",
    (COALESCE("sc"."active_shortlist_count", (0)::bigint) > 0) AS "has_shortlist",
    (COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."reports" "rep"
          WHERE ("rep"."request_id" = "r"."id")), (0)::bigint) > 0) AS "has_report",
    ((COALESCE("sc"."active_shortlist_count", (0)::bigint) > 0) AND ("lr"."latest_report_id" IS NOT NULL)) AS "ready_to_prepare_bundle",
    (COALESCE("sn"."snapshot_count", (0)::bigint) > 0) AS "ready_to_release_to_customer"
   FROM (((("public"."requests" "r"
     LEFT JOIN "latest_report" "lr" ON (("lr"."request_id" = "r"."id")))
     LEFT JOIN "candidate_counts" "cc" ON (("cc"."request_id" = "r"."id")))
     LEFT JOIN "shortlist_counts" "sc" ON (("sc"."request_id" = "r"."id")))
     LEFT JOIN "snapshot_counts" "sn" ON (("sn"."request_id" = "r"."id")));


ALTER VIEW "public"."v_request_release_readiness" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_research_overview" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "count"(DISTINCT "rr"."id") AS "research_runs_count",
    "count"("ri"."id") AS "research_items_count",
    "max"("rr"."created_at") AS "latest_research_run_at",
    "max"("rr"."finished_at") AS "latest_research_finished_at",
    "max"("rr"."status") FILTER (WHERE ("rr"."created_at" = ( SELECT "max"("rr2"."created_at") AS "max"
           FROM "public"."research_runs" "rr2"
          WHERE ("rr2"."request_id" = "r"."id")))) AS "latest_research_status"
   FROM (("public"."requests" "r"
     LEFT JOIN "public"."research_runs" "rr" ON (("rr"."request_id" = "r"."id")))
     LEFT JOIN "public"."research_items" "ri" ON (("ri"."request_id" = "r"."id")))
  GROUP BY "r"."id", "r"."request_code", "r"."title";


ALTER VIEW "public"."v_request_research_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_shortlist_detailed" AS
 SELECT "s"."id" AS "shortlist_id",
    "s"."request_id",
    "s"."candidate_channel",
    "s"."ranking_position",
    "s"."option_label",
    "s"."trust_score" AS "shortlist_trust_score",
    "s"."value_score" AS "shortlist_value_score",
    "s"."fit_score" AS "shortlist_fit_score",
    "s"."final_score" AS "shortlist_final_score",
    "s"."reason_summary",
    "s"."customer_summary",
    "s"."reveal_locked",
    "s"."is_recommended",
    "s"."is_active",
    "s"."published_offer_id",
    "s"."created_at" AS "shortlist_created_at",
    "ri"."id" AS "research_item_id",
    "mq"."id" AS "merchant_quote_id",
    COALESCE("s"."option_label", "ri"."option_label", "mq"."option_label", ('Option #'::"text" || ("s"."ranking_position")::"text")) AS "effective_option_label",
    COALESCE("ri"."source_name", "m"."name", 'offline_quote'::"text") AS "source_name",
        CASE
            WHEN ("s"."candidate_channel" = 'offline'::"text") THEN 'merchant'::"text"
            ELSE "ri"."source_type"
        END AS "source_type",
        CASE
            WHEN ("s"."candidate_channel" = 'online'::"text") THEN "ri"."listing_url"
            ELSE NULL::"text"
        END AS "reference_url",
    COALESCE("ri"."product_title", "mq"."product_title") AS "product_title",
    COALESCE("ri"."product_brand", "mq"."product_brand") AS "product_brand",
    COALESCE("ri"."product_model", "mq"."product_model") AS "product_model",
    COALESCE("ri"."product_specs_summary", "mq"."product_specs_summary") AS "product_specs_summary",
    COALESCE("ri"."price_amount", "mq"."price_amount") AS "price_amount",
    COALESCE("ri"."currency_code", "mq"."currency_code", 'EGP'::"text") AS "currency_code",
    COALESCE("ri"."availability_status", "mq"."availability_status", 'unknown'::"text") AS "availability_status",
    COALESCE("ri"."warranty_info", "mq"."warranty_info") AS "warranty_info",
    COALESCE("s"."trust_score", "ri"."trust_score", "mq"."trust_score") AS "effective_trust_score",
    COALESCE("s"."value_score", "ri"."value_score", "mq"."value_score") AS "effective_value_score",
    COALESCE("s"."fit_score", "ri"."fit_score", "mq"."fit_score") AS "effective_fit_score",
    COALESCE("s"."final_score", "ri"."final_score", "mq"."final_score") AS "effective_final_score",
    "mq"."merchant_id",
    "m"."name" AS "merchant_name",
    "m"."city" AS "merchant_city",
    "m"."area" AS "merchant_area",
    "mq"."contact_notes",
    "mq"."quote_valid_until"
   FROM ((("public"."request_candidate_shortlists" "s"
     LEFT JOIN "public"."research_items" "ri" ON (("ri"."id" = "s"."research_item_id")))
     LEFT JOIN "public"."merchant_quotes" "mq" ON (("mq"."id" = "s"."merchant_quote_id")))
     LEFT JOIN "public"."merchants" "m" ON (("m"."id" = "mq"."merchant_id")));


ALTER VIEW "public"."v_request_shortlist_detailed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_shortlist_overview" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "count"("s"."id") FILTER (WHERE ("s"."is_active" = true)) AS "active_shortlist_count",
    "min"("s"."ranking_position") FILTER (WHERE ("s"."is_active" = true)) AS "best_rank_position",
    "max"("s"."created_at") FILTER (WHERE ("s"."is_active" = true)) AS "latest_shortlist_at"
   FROM ("public"."requests" "r"
     LEFT JOIN "public"."request_candidate_shortlists" "s" ON (("s"."request_id" = "r"."id")))
  GROUP BY "r"."id", "r"."request_code", "r"."title";


ALTER VIEW "public"."v_request_shortlist_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_request_timeline" AS
 WITH "unified_events" AS (
         SELECT "request_status_history"."id" AS "event_id",
            "request_status_history"."request_id",
            "request_status_history"."transition_name",
            "request_status_history"."from_canonical_state",
            "request_status_history"."to_canonical_state",
            "request_status_history"."change_reason" AS "notes",
            "request_status_history"."created_at" AS "event_at",
            "request_status_history"."event_source",
            ( SELECT "staff_members"."full_name"
                   FROM "public"."staff_members"
                  WHERE ("staff_members"."id" = "request_status_history"."changed_by_staff_id")) AS "actor_name",
            "request_status_history"."metadata"
           FROM "public"."request_status_history"
        UNION ALL
         SELECT "research_runs"."id" AS "event_id",
            "research_runs"."request_id",
            'RESEARCH_RUN_START'::"text" AS "transition_name",
            NULL::"text" AS "from_canonical_state",
            NULL::"text" AS "to_canonical_state",
            "research_runs"."run_kind" AS "notes",
            "research_runs"."started_at" AS "event_at",
            'system'::"text" AS "event_source",
            NULL::"text" AS "actor_name",
            "jsonb_build_object"('run_id', "research_runs"."id") AS "metadata"
           FROM "public"."research_runs"
          WHERE ("research_runs"."started_at" IS NOT NULL)
        UNION ALL
         SELECT "research_runs"."id" AS "event_id",
            "research_runs"."request_id",
            'RESEARCH_RUN_FINISH'::"text" AS "transition_name",
            NULL::"text" AS "from_canonical_state",
            NULL::"text" AS "to_canonical_state",
            "research_runs"."status" AS "notes",
            "research_runs"."finished_at" AS "event_at",
            'system'::"text" AS "event_source",
            NULL::"text" AS "actor_name",
            "jsonb_build_object"('run_id', "research_runs"."id", 'results', "research_runs"."results_count") AS "metadata"
           FROM "public"."research_runs"
          WHERE ("research_runs"."finished_at" IS NOT NULL)
        )
 SELECT "event_id",
    "request_id",
    "transition_name",
    "from_canonical_state",
    "to_canonical_state",
    "notes",
    "event_at",
    "event_source",
    "actor_name",
    "metadata"
   FROM "unified_events"
  ORDER BY "event_at", "event_source", "event_id";


ALTER VIEW "public"."v_request_timeline" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_requests_active" AS
 SELECT "id",
    "request_code",
    "customer_id",
    "title",
    "raw_description",
    "interpreted_summary",
    "current_status",
    "source_channel",
    "turnaround_deadline",
    "created_at",
    "updated_at",
    "intake_ai_decision",
    "intake_ai_confidence",
    "intake_reason_code",
    "intake_summary",
    "intake_internal_reasoning",
    "intake_clarification_questions",
    "intake_reviewer_note",
    "reviewer_decision",
    "reviewer_decided_by_staff_id",
    "reviewer_decided_at",
    "reviewer_notes",
    "accepted_at",
    "rejected_at",
    "clarification_requested_at",
    "is_cancelled",
    "cancelled_at",
    "cancelled_by_staff_id",
    "cancellation_reason",
    "is_archived",
    "archived_at",
    "archived_by_staff_id",
    "archive_reason",
    "is_soft_deleted",
    "soft_deleted_at",
    "soft_deleted_by_staff_id",
    "soft_delete_reason",
    "request_kind",
    "intake_mode",
    "pricing_decision",
    "service_fee_amount",
    "execution_requested",
    "followup_requested",
    "site_visit_requested",
    "pricing_notes",
    "reference_image_path",
    "assigned_reviewer_staff_id",
    "reviewer_assignment_status",
    "reviewer_assigned_at",
    "reviewer_assigned_by_staff_id",
    "archived_by_user_id"
   FROM "public"."requests"
  WHERE (COALESCE("is_archived", false) = false);


ALTER VIEW "public"."v_requests_active" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_requests_archived_admin" AS
 SELECT "id",
    "request_code",
    "customer_id",
    "title",
    "raw_description",
    "interpreted_summary",
    "current_status",
    "source_channel",
    "turnaround_deadline",
    "created_at",
    "updated_at",
    "intake_ai_decision",
    "intake_ai_confidence",
    "intake_reason_code",
    "intake_summary",
    "intake_internal_reasoning",
    "intake_clarification_questions",
    "intake_reviewer_note",
    "reviewer_decision",
    "reviewer_decided_by_staff_id",
    "reviewer_decided_at",
    "reviewer_notes",
    "accepted_at",
    "rejected_at",
    "clarification_requested_at",
    "is_cancelled",
    "cancelled_at",
    "cancelled_by_staff_id",
    "cancellation_reason",
    "is_archived",
    "archived_at",
    "archived_by_staff_id",
    "archive_reason",
    "is_soft_deleted",
    "soft_deleted_at",
    "soft_deleted_by_staff_id",
    "soft_delete_reason",
    "request_kind",
    "intake_mode",
    "pricing_decision",
    "service_fee_amount",
    "execution_requested",
    "followup_requested",
    "site_visit_requested",
    "pricing_notes",
    "reference_image_path",
    "assigned_reviewer_staff_id",
    "reviewer_assignment_status",
    "reviewer_assigned_at",
    "reviewer_assigned_by_staff_id",
    "archived_by_user_id"
   FROM "public"."requests"
  WHERE (COALESCE("is_archived", false) = true);


ALTER VIEW "public"."v_requests_archived_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_requests_ready_for_processing" AS
 SELECT "r"."id" AS "request_id",
    "r"."request_code",
    "r"."title",
    "r"."current_status",
    "r"."reviewer_decision",
    "r"."accepted_at",
    "r"."is_cancelled",
    "r"."is_archived",
    "r"."is_soft_deleted",
    "c"."full_name" AS "customer_name",
    "c"."auth_user_id" AS "customer_auth_user_id",
    "rp"."search_scope",
    COALESCE("j"."total_jobs", (0)::bigint) AS "existing_jobs"
   FROM ((("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "r"."id")))
     LEFT JOIN ( SELECT "agent_jobs"."request_id",
            "count"(*) AS "total_jobs"
           FROM "public"."agent_jobs"
          GROUP BY "agent_jobs"."request_id") "j" ON (("j"."request_id" = "r"."id")))
  WHERE (("r"."current_status" = 'accepted'::"text") AND (COALESCE("r"."is_cancelled", false) = false) AND (COALESCE("r"."is_archived", false) = false) AND (COALESCE("r"."is_soft_deleted", false) = false));


ALTER VIEW "public"."v_requests_ready_for_processing" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_job_queue" AS
 SELECT "j"."id" AS "job_id",
    "j"."request_id",
    "r"."request_code",
    "r"."title" AS "request_title",
    "j"."job_type",
    "j"."status",
    "j"."priority",
    "j"."assigned_to_user_id",
    "sm"."full_name" AS "assigned_to_name",
    "jq"."team_code" AS "target_team",
    "j"."output_summary",
    "j"."error_message",
    "j"."started_at",
    "j"."finished_at",
    "j"."created_at",
    "j"."updated_at"
   FROM ((("public"."agent_jobs" "j"
     JOIN "public"."requests" "r" ON (("r"."id" = "j"."request_id")))
     LEFT JOIN "public"."staff_members" "sm" ON (("sm"."auth_user_id" = "j"."assigned_to_user_id")))
     LEFT JOIN "public"."job_queue_rules" "jq" ON ((("jq"."job_type" = "j"."job_type") AND ("jq"."is_active" = true))));


ALTER VIEW "public"."v_staff_job_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_my_jobs" AS
 SELECT "job_id",
    "request_id",
    "request_code",
    "request_title",
    "job_type",
    "status",
    "priority",
    "assigned_to_user_id",
    "assigned_to_name",
    "target_team",
    "output_summary",
    "error_message",
    "started_at",
    "finished_at",
    "created_at",
    "updated_at"
   FROM "public"."v_staff_job_queue" "q"
  WHERE (("assigned_to_user_id" = "auth"."uid"()) OR (("assigned_to_user_id" IS NULL) AND ("status" = 'queued'::"text")));


ALTER VIEW "public"."v_staff_my_jobs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_request_workspace_overview" AS
 WITH "merchant_counts" AS (
         SELECT "rmm"."request_id",
            ("count"(*))::integer AS "merchant_matches_count"
           FROM "public"."request_merchant_matches" "rmm"
          GROUP BY "rmm"."request_id"
        ), "message_counts" AS (
         SELECT "m"."request_id",
            ("count"(*))::integer AS "message_audit_count",
            "max"("m"."created_at") AS "latest_message_at"
           FROM "public"."request_customer_message_audit" "m"
          GROUP BY "m"."request_id"
        )
 SELECT "ui"."request_id",
    "ui"."request_code",
    "ui"."customer_id",
    "c"."auth_user_id" AS "customer_auth_user_id",
    "c"."full_name" AS "customer_name",
    "ui"."title",
    "ui"."raw_description",
    "ui"."current_status",
    "ui"."customer_visible_status",
    "ui"."source_channel",
    "ui"."preferred_language",
    "ui"."search_scope",
    "ui"."operational_stage",
    "ui"."stage_status",
    "ui"."pipeline_completion_pct",
    "ui"."customer_reveal_completion_pct",
    "rp"."budget_min",
    "rp"."budget_max",
    "rp"."preferred_brands",
    "rp"."preferred_models",
    "rp"."preferred_specs",
    "rp"."condition_preference",
    "rp"."priority_focus",
    "rp"."preferred_governorate",
    "rp"."preferred_area",
    "rp"."delivery_needed",
    "rp"."notes",
    "ui"."latest_qualification_decision",
    "ui"."latest_qualification_score",
    "ui"."latest_qualification_reason",
    "ui"."latest_note",
    "ui"."total_jobs",
    "ui"."queued_jobs",
    "ui"."running_jobs",
    "ui"."waiting_approval_jobs",
    "ui"."completed_jobs",
    "ui"."failed_jobs",
    "ui"."research_runs_count",
    "ui"."research_items_count",
    "ui"."research_shortlisted_items",
    "ro"."latest_research_run_at",
    "ro"."latest_research_finished_at",
    "ro"."latest_research_status",
    "ui"."offline_tasks_count",
    "ui"."offline_quotes_count",
    "ui"."offline_shortlisted_quotes",
    "ui"."active_shortlist_count",
    "so"."best_rank_position",
    "so"."latest_shortlist_at",
    "ui"."published_shortlist_count",
    "ui"."reports_count",
    "ui"."latest_report_id",
    "ui"."latest_report_status",
    "ui"."latest_report_created_at",
    "ui"."snapshot_count",
    "ui"."unlock_count",
    "ui"."client_released_at",
    COALESCE("mc"."merchant_matches_count", 0) AS "merchant_matches_count",
    COALESCE("msg"."message_audit_count", 0) AS "message_audit_count",
    "msg"."latest_message_at",
    "ui"."request_created_at",
    "ui"."request_updated_at"
   FROM (((((("public"."v_request_ui_status" "ui"
     JOIN "public"."customers" "c" ON (("c"."id" = "ui"."customer_id")))
     LEFT JOIN "public"."request_preferences" "rp" ON (("rp"."request_id" = "ui"."request_id")))
     LEFT JOIN "public"."v_request_research_overview" "ro" ON (("ro"."request_id" = "ui"."request_id")))
     LEFT JOIN "public"."v_request_shortlist_overview" "so" ON (("so"."request_id" = "ui"."request_id")))
     LEFT JOIN "merchant_counts" "mc" ON (("mc"."request_id" = "ui"."request_id")))
     LEFT JOIN "message_counts" "msg" ON (("msg"."request_id" = "ui"."request_id")));


ALTER VIEW "public"."v_staff_request_workspace_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "event_name" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_automation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "direction" "text",
    "message_type" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error_msg" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vendor_automation_logs_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "vendor_automation_logs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text", 'received'::"text"])))
);


ALTER TABLE "public"."vendor_automation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "price_amount" numeric(12,2) NOT NULL,
    "currency_code" "text" DEFAULT 'EGP'::"text" NOT NULL,
    "delivery_days" integer NOT NULL,
    "warranty_months" integer DEFAULT 0 NOT NULL,
    "product_condition" "text" DEFAULT 'new'::"text" NOT NULL,
    "installation_included" boolean DEFAULT false NOT NULL,
    "after_sales_service" "text",
    "freebies" "text",
    "deal_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_categories" (
    "vendor_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "specialization_id" "uuid",
    CONSTRAINT "vendor_categories_category_check" CHECK (("category" = ANY (ARRAY['home_appliances'::"text", 'screens'::"text", 'smart_electronics'::"text"])))
);


ALTER TABLE "public"."vendor_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_fee_phases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phase_name" "text" NOT NULL,
    "phase_order" integer NOT NULL,
    "is_current_phase" boolean DEFAULT false NOT NULL,
    "commission_rate" numeric,
    "min_fee_egp" numeric,
    "subscription_monthly_egp" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_fee_phases" OWNER TO "postgres";


COMMENT ON TABLE "public"."vendor_fee_phases" IS 'Vendor transaction fee phases. Future expansion may introduce tier/rating-based custom commission package tables linked to vendor ratings.';



CREATE TABLE IF NOT EXISTS "public"."vendor_portal_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "portal_email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."vendor_portal_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_profile_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "business_name_ar" "text" NOT NULL,
    "business_name_en" "text",
    "merchant_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "city" "text",
    "address" "text",
    "secondary_phone" "text",
    "email" "text",
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_profile_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "customer_id" "uuid",
    "platform_rating" integer,
    "platform_comment" "text",
    "vendor_rating" integer,
    "vendor_availability" integer,
    "vendor_price_accuracy" integer,
    "vendor_communication" integer,
    "review_token" "text",
    "token_expires_at" timestamp with time zone,
    "is_published" boolean DEFAULT false NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recommend" boolean DEFAULT true,
    "price_rating" integer,
    "response_rating" integer,
    "commitment_rating" integer,
    "quality_rating" integer,
    "review_tags" "text"[],
    "image_url" "text",
    "video_url" "text",
    "is_verified_purchase" boolean DEFAULT false,
    CONSTRAINT "vendor_reviews_platform_rating_check" CHECK ((("platform_rating" >= 1) AND ("platform_rating" <= 5))),
    CONSTRAINT "vendor_reviews_vendor_availability_check" CHECK ((("vendor_availability" >= 1) AND ("vendor_availability" <= 5))),
    CONSTRAINT "vendor_reviews_vendor_communication_check" CHECK ((("vendor_communication" >= 1) AND ("vendor_communication" <= 5))),
    CONSTRAINT "vendor_reviews_vendor_price_accuracy_check" CHECK ((("vendor_price_accuracy" >= 1) AND ("vendor_price_accuracy" <= 5))),
    CONSTRAINT "vendor_reviews_vendor_rating_check" CHECK ((("vendor_rating" >= 1) AND ("vendor_rating" <= 5)))
);


ALTER TABLE "public"."vendor_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_system_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "sent_by" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_system_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text" NOT NULL,
    "commercial_reg_number" "text",
    "tax_card_number" "text",
    "whatsapp_number" "text",
    "governorate" "text",
    "area" "text",
    "trust_score" integer DEFAULT 100 NOT NULL,
    "total_successful_deals" integer DEFAULT 0 NOT NULL,
    "reported_issues" integer DEFAULT 0 NOT NULL,
    "account_tier" "text" DEFAULT 'Bronze'::"text" NOT NULL,
    "system_status" "text" DEFAULT 'Pending Verification'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "portal_enabled" boolean DEFAULT false NOT NULL,
    "portal_email" "text",
    "response_speed_hours" numeric DEFAULT 24,
    "bid_win_rate" numeric DEFAULT 0,
    "customer_satisfaction_rate" numeric DEFAULT 85,
    "price_reliability_rate" numeric DEFAULT 95,
    "trusted_score" numeric(5,2) DEFAULT 85,
    "auth_user_id" "uuid",
    "merchant_access_level" "text" DEFAULT 'basic'::"text" NOT NULL,
    "is_phone_verified" boolean DEFAULT false NOT NULL,
    CONSTRAINT "vendors_account_tier_check" CHECK (("account_tier" = ANY (ARRAY['Bronze'::"text", 'Silver'::"text", 'Gold'::"text"]))),
    CONSTRAINT "vendors_merchant_access_level_check" CHECK (("merchant_access_level" = ANY (ARRAY['basic'::"text", 'advanced'::"text"]))),
    CONSTRAINT "vendors_system_status_check" CHECK (("system_status" = ANY (ARRAY['Active'::"text", 'Suspended'::"text", 'Pending Verification'::"text"]))),
    CONSTRAINT "vendors_trust_score_check" CHECK ((("trust_score" >= 0) AND ("trust_score" <= 100)))
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vision_future_ideas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "target_phase" "text" NOT NULL,
    "icon" "text" DEFAULT '💡'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vision_future_ideas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vision_pillars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "subtitle_en" "text" NOT NULL,
    "subtitle_ar" "text" NOT NULL,
    "icon" "text" DEFAULT '🎯'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vision_pillars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vision_timeline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "milestone_year" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vision_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "tx_type" "text" NOT NULL,
    "amount_egp" numeric(12,2) NOT NULL,
    "amount_points" integer DEFAULT 0 NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "fraud_audit_id" "uuid",
    "description_en" "text",
    "description_ar" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "currency" "text" DEFAULT 'EGP'::"text",
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "ip_address" "text",
    "device_fingerprint" "text",
    "idempotency_key" "text",
    CONSTRAINT "wallet_transactions_currency_check" CHECK (("currency" = ANY (ARRAY['EGP'::"text", 'points'::"text", 'credit'::"text"]))),
    CONSTRAINT "wallet_transactions_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['task'::"text", 'referral'::"text", 'withdrawal_request'::"text", 'admin_adjustment'::"text"]))),
    CONSTRAINT "wallet_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'pending_review'::"text"]))),
    CONSTRAINT "wallet_transactions_tx_type_check" CHECK (("tx_type" = ANY (ARRAY['task_reward'::"text", 'referral_reward'::"text", 'streak_bonus'::"text", 'network_revenue_share'::"text", 'withdrawal'::"text", 'withdrawal_hold'::"text", 'manual_adjustment'::"text", 'fraud_clawback'::"text"])))
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "ai_summary_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "email_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "dispatch_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_error" "text",
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_ai_summary_status" CHECK (("ai_summary_status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "ck_dispatch_status" CHECK (("dispatch_status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "ck_email_status" CHECK (("email_status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."workflow_runs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_job_logs"
    ADD CONSTRAINT "agent_job_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_configs"
    ADD CONSTRAINT "ai_agent_configs_agent_code_key" UNIQUE ("agent_code");



ALTER TABLE ONLY "public"."ai_agent_configs"
    ADD CONSTRAINT "ai_agent_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_copilot_runs"
    ADD CONSTRAINT "ai_copilot_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_response_cache"
    ADD CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("cache_key");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allowed_link_domains"
    ADD CONSTRAINT "allowed_link_domains_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."allowed_link_domains"
    ADD CONSTRAINT "allowed_link_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bonus_campaigns"
    ADD CONSTRAINT "bonus_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buyer_qa"
    ADD CONSTRAINT "buyer_qa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_preferences"
    ADD CONSTRAINT "communication_preferences_customer_id_key" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."communication_preferences"
    ADD CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_templates"
    ADD CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_templates"
    ADD CONSTRAINT "communication_templates_template_code_channel_language_code_key" UNIQUE ("template_code", "channel", "language_code");



ALTER TABLE ONLY "public"."company_experiments"
    ADD CONSTRAINT "company_experiments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competitor_feature_comparisons"
    ADD CONSTRAINT "competitor_feature_comparisons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_name_ar_key" UNIQUE ("name_ar");



ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_name_en_key" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_rules"
    ADD CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_rules"
    ADD CONSTRAINT "compliance_rules_rule_code_key" UNIQUE ("rule_code");



ALTER TABLE ONLY "public"."contributor_alerts"
    ADD CONSTRAINT "contributor_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_badges"
    ADD CONSTRAINT "contributor_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_device_fingerprints"
    ADD CONSTRAINT "contributor_device_fingerprints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_hr_reviews"
    ADD CONSTRAINT "contributor_hr_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_levels"
    ADD CONSTRAINT "contributor_levels_level_number_key" UNIQUE ("level_number");



ALTER TABLE ONLY "public"."contributor_levels"
    ADD CONSTRAINT "contributor_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_notifications"
    ADD CONSTRAINT "contributor_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_referrals"
    ADD CONSTRAINT "contributor_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_referrals"
    ADD CONSTRAINT "contributor_referrals_referred_id_key" UNIQUE ("referred_id");



ALTER TABLE ONLY "public"."contributor_reviews"
    ADD CONSTRAINT "contributor_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_risk_scores"
    ADD CONSTRAINT "contributor_risk_scores_pkey" PRIMARY KEY ("contributor_id");



ALTER TABLE ONLY "public"."contributor_scarcity_limits"
    ADD CONSTRAINT "contributor_scarcity_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_streaks"
    ADD CONSTRAINT "contributor_streaks_pkey" PRIMARY KEY ("contributor_id");



ALTER TABLE ONLY "public"."contributor_submissions"
    ADD CONSTRAINT "contributor_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_verification_requests"
    ADD CONSTRAINT "contributor_verification_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_wallets"
    ADD CONSTRAINT "contributor_wallets_contributor_id_key" UNIQUE ("contributor_id");



ALTER TABLE ONLY "public"."contributor_wallets"
    ADD CONSTRAINT "contributor_wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_withdrawals"
    ADD CONSTRAINT "contributor_withdrawals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."crm_ads_performances"
    ADD CONSTRAINT "crm_ads_performances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_ads_performances"
    ADD CONSTRAINT "crm_ads_performances_platform_key" UNIQUE ("platform");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_discovery_interviews"
    ADD CONSTRAINT "customer_discovery_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_disputes"
    ADD CONSTRAINT "customer_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_fee_phases"
    ADD CONSTRAINT "customer_fee_phases_phase_name_key" UNIQUE ("phase_name");



ALTER TABLE ONLY "public"."customer_fee_phases"
    ADD CONSTRAINT "customer_fee_phases_phase_order_key" UNIQUE ("phase_order");



ALTER TABLE ONLY "public"."customer_fee_phases"
    ADD CONSTRAINT "customer_fee_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_intelligence_events"
    ADD CONSTRAINT "customer_intelligence_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_points_ledger"
    ADD CONSTRAINT "customer_points_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_requests"
    ADD CONSTRAINT "customer_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_score_snapshots"
    ADD CONSTRAINT "customer_score_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_customer_id_segment_code_key" UNIQUE ("customer_id", "segment_code");



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_verification_events"
    ADD CONSTRAINT "customer_verification_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_customer_code_key" UNIQUE ("customer_code");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_moat_weekly_metrics"
    ADD CONSTRAINT "data_moat_weekly_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_moat_weekly_metrics"
    ADD CONSTRAINT "data_moat_weekly_metrics_recorded_date_key" UNIQUE ("recorded_date");



ALTER TABLE ONLY "public"."economy_config"
    ADD CONSTRAINT "economy_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."economy_config"
    ADD CONSTRAINT "economy_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economy_stabilizer_events"
    ADD CONSTRAINT "economy_stabilizer_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economy_stabilizer_snapshots"
    ADD CONSTRAINT "economy_stabilizer_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags_audit"
    ADD CONSTRAINT "feature_flags_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_categories"
    ADD CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."findora_deal_inquiries"
    ADD CONSTRAINT "findora_deal_inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."findora_deals"
    ADD CONSTRAINT "findora_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."findora_deals"
    ADD CONSTRAINT "findora_deals_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."flywheel_stages"
    ADD CONSTRAINT "flywheel_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flywheel_stages"
    ADD CONSTRAINT "flywheel_stages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."founder_accountability_items"
    ADD CONSTRAINT "founder_accountability_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founder_accountability_items"
    ADD CONSTRAINT "founder_accountability_items_title_en_key" UNIQUE ("title_en");



ALTER TABLE ONLY "public"."founder_weekly_logs"
    ADD CONSTRAINT "founder_weekly_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_alerts"
    ADD CONSTRAINT "fraud_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_audit_log"
    ADD CONSTRAINT "fraud_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_buying_members"
    ADD CONSTRAINT "group_buying_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_buying_members"
    ADD CONSTRAINT "group_buying_members_pool_id_customer_id_key" UNIQUE ("pool_id", "customer_id");



ALTER TABLE ONLY "public"."group_buying_pools"
    ADD CONSTRAINT "group_buying_pools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_channels"
    ADD CONSTRAINT "growth_channels_name_ar_key" UNIQUE ("name_ar");



ALTER TABLE ONLY "public"."growth_channels"
    ADD CONSTRAINT "growth_channels_name_en_key" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."growth_channels"
    ADD CONSTRAINT "growth_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_content_plan"
    ADD CONSTRAINT "growth_content_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_announcements"
    ADD CONSTRAINT "homepage_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_announcements"
    ADD CONSTRAINT "homepage_announcements_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."internal_notes"
    ADD CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_metrics_snapshots"
    ADD CONSTRAINT "investor_metrics_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_metrics_snapshots"
    ADD CONSTRAINT "investor_metrics_snapshots_snapshot_date_key" UNIQUE ("snapshot_date");



ALTER TABLE ONLY "public"."job_queue_rules"
    ADD CONSTRAINT "job_queue_rules_job_type_team_code_key" UNIQUE ("job_type", "team_code");



ALTER TABLE ONLY "public"."job_queue_rules"
    ADD CONSTRAINT "job_queue_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kill_list_items"
    ADD CONSTRAINT "kill_list_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kill_list_items"
    ADD CONSTRAINT "kill_list_items_title_en_key" UNIQUE ("title_en");



ALTER TABLE ONLY "public"."link_attempt_logs"
    ADD CONSTRAINT "link_attempt_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_health_indicators"
    ADD CONSTRAINT "market_health_indicators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_health_indicators"
    ADD CONSTRAINT "market_health_indicators_specialization_key" UNIQUE ("specialization");



ALTER TABLE ONLY "public"."market_insights"
    ADD CONSTRAINT "market_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_products"
    ADD CONSTRAINT "marketplace_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_categories"
    ADD CONSTRAINT "merchant_categories_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."merchant_categories"
    ADD CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_category_map"
    ADD CONSTRAINT "merchant_category_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_contacts"
    ADD CONSTRAINT "merchant_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_customer_feedback"
    ADD CONSTRAINT "merchant_customer_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_discovery_studies"
    ADD CONSTRAINT "merchant_discovery_studies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_evaluations"
    ADD CONSTRAINT "merchant_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_offers_legacy_archive"
    ADD CONSTRAINT "merchant_offers_merchant_id_request_id_key" UNIQUE ("merchant_id", "request_id");



ALTER TABLE ONLY "public"."merchant_offers_legacy_archive"
    ADD CONSTRAINT "merchant_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_performance_events"
    ADD CONSTRAINT "merchant_performance_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_profiles_legacy_archive"
    ADD CONSTRAINT "merchant_profiles_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."merchant_profiles_legacy_archive"
    ADD CONSTRAINT "merchant_profiles_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."merchant_profiles_legacy_archive"
    ADD CONSTRAINT "merchant_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_quotes"
    ADD CONSTRAINT "merchant_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_score_snapshots"
    ADD CONSTRAINT "merchant_score_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_service_areas"
    ADD CONSTRAINT "merchant_service_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_source_links"
    ADD CONSTRAINT "merchant_source_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_merchant_code_key" UNIQUE ("merchant_code");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moat_competitor_threats"
    ADD CONSTRAINT "moat_competitor_threats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."north_star_config"
    ADD CONSTRAINT "north_star_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."north_star_config"
    ADD CONSTRAINT "north_star_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."north_star_goals"
    ADD CONSTRAINT "north_star_goals_month_number_key" UNIQUE ("month_number");



ALTER TABLE ONLY "public"."north_star_goals"
    ADD CONSTRAINT "north_star_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_sourcing_tasks"
    ADD CONSTRAINT "offline_sourcing_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_merchant_quotes"
    ADD CONSTRAINT "online_merchant_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outbound_messages"
    ADD CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_content"
    ADD CONSTRAINT "page_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_content"
    ADD CONSTRAINT "page_content_route_path_block_id_key" UNIQUE ("route_path", "block_id");



ALTER TABLE ONLY "public"."partner_points_ledger"
    ADD CONSTRAINT "partner_points_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_audit_events"
    ADD CONSTRAINT "payment_audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_intents"
    ADD CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments_legacy_archive"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_otp_codes"
    ADD CONSTRAINT "phone_otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_events"
    ADD CONSTRAINT "platform_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_moats"
    ADD CONSTRAINT "platform_moats_moat_number_key" UNIQUE ("moat_number");



ALTER TABLE ONLY "public"."platform_moats"
    ADD CONSTRAINT "platform_moats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_tasks"
    ADD CONSTRAINT "platform_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_customer_id_product_id_alert_type_key" UNIQUE ("customer_id", "product_id", "alert_type");



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_events"
    ADD CONSTRAINT "price_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_guarantees"
    ADD CONSTRAINT "price_guarantees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_trends"
    ADD CONSTRAINT "price_trends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_trends"
    ADD CONSTRAINT "price_trends_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."pricing_event_logs"
    ADD CONSTRAINT "pricing_event_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_service_type_key" UNIQUE ("service_type");



ALTER TABLE ONLY "public"."product_waitlists"
    ADD CONSTRAINT "product_waitlists_customer_id_product_name_key" UNIQUE ("customer_id", "product_name");



ALTER TABLE ONLY "public"."product_waitlists"
    ADD CONSTRAINT "product_waitlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_features"
    ADD CONSTRAINT "project_features_name_ar_key" UNIQUE ("name_ar");



ALTER TABLE ONLY "public"."project_features"
    ADD CONSTRAINT "project_features_name_en_key" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."project_features"
    ADD CONSTRAINT "project_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_phases"
    ADD CONSTRAINT "project_phases_phase_number_key" UNIQUE ("phase_number");



ALTER TABLE ONLY "public"."project_phases"
    ADD CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_logs"
    ADD CONSTRAINT "rate_limit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_challenges"
    ADD CONSTRAINT "referral_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_logs"
    ADD CONSTRAINT "referral_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_logs"
    ADD CONSTRAINT "referral_logs_referrer_id_referred_email_key" UNIQUE ("referrer_id", "referred_email");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_option_snapshots"
    ADD CONSTRAINT "report_option_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_admin_actions"
    ADD CONSTRAINT "request_admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_attachments"
    ADD CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_compliance_actions"
    ADD CONSTRAINT "request_compliance_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_compliance_hits"
    ADD CONSTRAINT "request_compliance_hits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_customer_message_audit"
    ADD CONSTRAINT "request_customer_message_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_delete_backups"
    ADD CONSTRAINT "request_delete_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_deletion_audit"
    ADD CONSTRAINT "request_deletion_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_disputes"
    ADD CONSTRAINT "request_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_merchant_matches"
    ADD CONSTRAINT "request_merchant_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_messages"
    ADD CONSTRAINT "request_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_operational_states"
    ADD CONSTRAINT "request_operational_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_operational_states"
    ADD CONSTRAINT "request_operational_states_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."request_preferences"
    ADD CONSTRAINT "request_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_preferences"
    ADD CONSTRAINT "request_preferences_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."request_qualification_reviews"
    ADD CONSTRAINT "request_qualification_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_status_history"
    ADD CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_workflow_events"
    ADD CONSTRAINT "request_workflow_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_request_code_key" UNIQUE ("request_code");



ALTER TABLE ONLY "public"."research_items"
    ADD CONSTRAINT "research_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_runs"
    ADD CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_service_key_key" UNIQUE ("service_key");



ALTER TABLE ONLY "public"."service_pricing_versions"
    ADD CONSTRAINT "service_pricing_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_pricing_versions"
    ADD CONSTRAINT "service_pricing_versions_service_key_version_no_key" UNIQUE ("service_key", "version_no");



ALTER TABLE ONLY "public"."site_content_audit"
    ADD CONSTRAINT "site_content_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_content_blocks"
    ADD CONSTRAINT "site_content_blocks_block_key_key" UNIQUE ("block_key");



ALTER TABLE ONLY "public"."site_content_blocks"
    ADD CONSTRAINT "site_content_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."source_reveals"
    ADD CONSTRAINT "source_reveals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sourcing_sources"
    ADD CONSTRAINT "sourcing_sources_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sourcing_sources"
    ADD CONSTRAINT "sourcing_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specializations"
    ADD CONSTRAINT "specializations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specializations"
    ADD CONSTRAINT "specializations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."staff_action_steps"
    ADD CONSTRAINT "staff_action_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_action_steps"
    ADD CONSTRAINT "staff_action_steps_step_number_key" UNIQUE ("step_number");



ALTER TABLE ONLY "public"."staff_departments"
    ADD CONSTRAINT "staff_departments_name_ar_key" UNIQUE ("name_ar");



ALTER TABLE ONLY "public"."staff_departments"
    ADD CONSTRAINT "staff_departments_name_en_key" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."staff_departments"
    ADD CONSTRAINT "staff_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_hr_details"
    ADD CONSTRAINT "staff_hr_details_pkey" PRIMARY KEY ("staff_id");



ALTER TABLE ONLY "public"."staff_member_roles"
    ADD CONSTRAINT "staff_member_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_member_roles"
    ADD CONSTRAINT "staff_member_roles_staff_member_id_role_code_key" UNIQUE ("staff_member_id", "role_code");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_performance_reviews"
    ADD CONSTRAINT "staff_performance_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_plan_code_key" UNIQUE ("plan_code");



ALTER TABLE ONLY "public"."task_claims"
    ADD CONSTRAINT "task_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributor_badges"
    ADD CONSTRAINT "uq_contributor_badge" UNIQUE ("contributor_id", "badge_type");



ALTER TABLE ONLY "public"."merchant_category_map"
    ADD CONSTRAINT "uq_merchant_category_map" UNIQUE ("merchant_id", "category_id");



ALTER TABLE ONLY "public"."merchant_service_areas"
    ADD CONSTRAINT "uq_merchant_service_area" UNIQUE ("merchant_id", "city", "area");



ALTER TABLE ONLY "public"."merchant_source_links"
    ADD CONSTRAINT "uq_merchant_source_links" UNIQUE ("merchant_id", "source_url");



ALTER TABLE ONLY "public"."request_merchant_matches"
    ADD CONSTRAINT "uq_request_merchant_match" UNIQUE ("request_id", "merchant_id", "source_channel");



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "uq_workflow_runs_request_id" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_watchlists"
    ADD CONSTRAINT "user_watchlists_customer_id_product_id_key" UNIQUE ("customer_id", "product_id");



ALTER TABLE ONLY "public"."user_watchlists"
    ADD CONSTRAINT "user_watchlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_audit_log"
    ADD CONSTRAINT "vendor_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_automation_logs"
    ADD CONSTRAINT "vendor_automation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_bids"
    ADD CONSTRAINT "vendor_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_bids"
    ADD CONSTRAINT "vendor_bids_request_id_vendor_id_key" UNIQUE ("request_id", "vendor_id");



ALTER TABLE ONLY "public"."vendor_categories"
    ADD CONSTRAINT "vendor_categories_pkey" PRIMARY KEY ("vendor_id", "category");



ALTER TABLE ONLY "public"."vendor_fee_phases"
    ADD CONSTRAINT "vendor_fee_phases_phase_name_key" UNIQUE ("phase_name");



ALTER TABLE ONLY "public"."vendor_fee_phases"
    ADD CONSTRAINT "vendor_fee_phases_phase_order_key" UNIQUE ("phase_order");



ALTER TABLE ONLY "public"."vendor_fee_phases"
    ADD CONSTRAINT "vendor_fee_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_portal_tokens"
    ADD CONSTRAINT "vendor_portal_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_portal_tokens"
    ADD CONSTRAINT "vendor_portal_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."vendor_profile_details"
    ADD CONSTRAINT "vendor_profile_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_profile_details"
    ADD CONSTRAINT "vendor_profile_details_vendor_id_key" UNIQUE ("vendor_id");



ALTER TABLE ONLY "public"."vendor_reviews"
    ADD CONSTRAINT "vendor_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_reviews"
    ADD CONSTRAINT "vendor_reviews_review_token_key" UNIQUE ("review_token");



ALTER TABLE ONLY "public"."vendor_system_messages"
    ADD CONSTRAINT "vendor_system_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vision_future_ideas"
    ADD CONSTRAINT "vision_future_ideas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vision_future_ideas"
    ADD CONSTRAINT "vision_future_ideas_title_ar_key" UNIQUE ("title_ar");



ALTER TABLE ONLY "public"."vision_future_ideas"
    ADD CONSTRAINT "vision_future_ideas_title_en_key" UNIQUE ("title_en");



ALTER TABLE ONLY "public"."vision_pillars"
    ADD CONSTRAINT "vision_pillars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vision_pillars"
    ADD CONSTRAINT "vision_pillars_title_ar_key" UNIQUE ("title_ar");



ALTER TABLE ONLY "public"."vision_pillars"
    ADD CONSTRAINT "vision_pillars_title_en_key" UNIQUE ("title_en");



ALTER TABLE ONLY "public"."vision_timeline"
    ADD CONSTRAINT "vision_timeline_milestone_year_key" UNIQUE ("milestone_year");



ALTER TABLE ONLY "public"."vision_timeline"
    ADD CONSTRAINT "vision_timeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_agent_job_logs_job_id" ON "public"."agent_job_logs" USING "btree" ("job_id", "created_at");



CREATE INDEX "idx_agent_jobs_job_type" ON "public"."agent_jobs" USING "btree" ("job_type");



CREATE INDEX "idx_agent_jobs_request_id" ON "public"."agent_jobs" USING "btree" ("request_id");



CREATE INDEX "idx_agent_jobs_status_priority" ON "public"."agent_jobs" USING "btree" ("status", "priority", "created_at");



CREATE INDEX "idx_ai_agent_config_code" ON "public"."ai_agent_configs" USING "btree" ("agent_code");



CREATE INDEX "idx_ai_copilot_runs_agent_code" ON "public"."ai_copilot_runs" USING "btree" ("agent_code");



CREATE INDEX "idx_ai_copilot_runs_created_at" ON "public"."ai_copilot_runs" USING "btree" ("created_at");



CREATE INDEX "idx_ai_copilot_runs_request_id" ON "public"."ai_copilot_runs" USING "btree" ("request_id");



CREATE INDEX "idx_ai_copilot_runs_staff_id" ON "public"."ai_copilot_runs" USING "btree" ("staff_id");



CREATE INDEX "idx_ai_response_cache_expires_at" ON "public"."ai_response_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_ai_usage_log_feature_key" ON "public"."ai_usage_log" USING "btree" ("feature_key");



CREATE INDEX "idx_ai_usage_log_timestamp" ON "public"."ai_usage_log" USING "btree" ("timestamp");



CREATE INDEX "idx_alert_events_customer" ON "public"."alert_events" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_alert_events_pending" ON "public"."alert_events" USING "btree" ("status", "created_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_alerts_active" ON "public"."price_alerts" USING "btree" ("product_id") WHERE ("is_active" = true);



CREATE INDEX "idx_alerts_customer" ON "public"."price_alerts" USING "btree" ("customer_id");



CREATE INDEX "idx_allowed_link_domains_domain" ON "public"."allowed_link_domains" USING "btree" ("domain");



CREATE INDEX "idx_allowed_link_domains_enabled" ON "public"."allowed_link_domains" USING "btree" ("enabled");



CREATE INDEX "idx_approvals_approved_by_user_id" ON "public"."approvals" USING "btree" ("approved_by_user_id");



CREATE INDEX "idx_bonus_campaigns_dates" ON "public"."bonus_campaigns" USING "btree" ("start_date", "end_date") WHERE ("is_active" = true);



CREATE INDEX "idx_buyer_qa_product" ON "public"."buyer_qa" USING "btree" ("product_name");



CREATE INDEX "idx_compliance_rules_category" ON "public"."compliance_rules" USING "btree" ("rule_category");



CREATE INDEX "idx_compliance_rules_decision_mode" ON "public"."compliance_rules" USING "btree" ("decision_mode");



CREATE INDEX "idx_compliance_rules_is_active" ON "public"."compliance_rules" USING "btree" ("is_active");



CREATE INDEX "idx_cust_discovery_customer_id" ON "public"."customer_discovery_interviews" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_contacts_contact_type" ON "public"."customer_contacts" USING "btree" ("contact_type");



CREATE INDEX "idx_customer_contacts_contact_value" ON "public"."customer_contacts" USING "btree" ("contact_value");



CREATE INDEX "idx_customer_contacts_customer_id" ON "public"."customer_contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_contacts_track_phone" ON "public"."customer_contacts" USING "btree" ("customer_id", "contact_type", "public"."fn_normalize_phone_eg"("contact_value")) WHERE ("contact_type" = ANY (ARRAY['phone'::"text", 'whatsapp'::"text"]));



CREATE INDEX "idx_customer_intel_customer_id" ON "public"."customer_intelligence_events" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_intel_event_type" ON "public"."customer_intelligence_events" USING "btree" ("event_type");



CREATE INDEX "idx_customer_intel_occurred_at" ON "public"."customer_intelligence_events" USING "btree" ("occurred_at");



CREATE INDEX "idx_customer_intel_request_id" ON "public"."customer_intelligence_events" USING "btree" ("request_id");



CREATE INDEX "idx_customer_points_cust" ON "public"."customer_points_ledger" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_requests_phone" ON "public"."customer_requests" USING "btree" ("customer_phone");



CREATE INDEX "idx_customer_requests_trend" ON "public"."customer_requests" USING "btree" ("created_at", "target_location", "category");



CREATE INDEX "idx_customer_scores_customer_id" ON "public"."customer_score_snapshots" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_segments_customer_id" ON "public"."customer_segments" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_subscriptions_customer_id" ON "public"."customer_subscriptions" USING "btree" ("customer_id", "status", "started_at" DESC);



CREATE INDEX "idx_customer_verification_events_created_at" ON "public"."customer_verification_events" USING "btree" ("created_at");



CREATE INDEX "idx_customer_verification_events_customer_id" ON "public"."customer_verification_events" USING "btree" ("customer_id");



CREATE INDEX "idx_customers_phone_verified_at" ON "public"."customers" USING "btree" ("phone_verified_at");



CREATE INDEX "idx_feature_flags_audit_changed_by" ON "public"."feature_flags_audit" USING "btree" ("changed_by");



CREATE INDEX "idx_feature_flags_audit_created_at" ON "public"."feature_flags_audit" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feature_flags_audit_key" ON "public"."feature_flags_audit" USING "btree" ("flag_key");



CREATE INDEX "idx_findora_deals_vendor" ON "public"."findora_deals" USING "btree" ("vendor_id");



CREATE INDEX "idx_fraud_alerts_status" ON "public"."fraud_alerts" USING "btree" ("status") WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_investor_snapshots_date" ON "public"."investor_metrics_snapshots" USING "btree" ("snapshot_date" DESC);



CREATE INDEX "idx_job_queue_rules_active" ON "public"."job_queue_rules" USING "btree" ("is_active", "job_type", "team_code");



CREATE INDEX "idx_link_attempts_created" ON "public"."link_attempt_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_link_attempts_domain" ON "public"."link_attempt_logs" USING "btree" ("domain");



CREATE INDEX "idx_link_attempts_hot" ON "public"."link_attempt_logs" USING "btree" ("outcome", "domain", "created_at" DESC);



CREATE INDEX "idx_link_attempts_outcome" ON "public"."link_attempt_logs" USING "btree" ("outcome");



CREATE INDEX "idx_merchant_category_map_category" ON "public"."merchant_category_map" USING "btree" ("category_id");



CREATE INDEX "idx_merchant_category_map_merchant" ON "public"."merchant_category_map" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_category_map_merchant_id" ON "public"."merchant_category_map" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_contacts_contact_type" ON "public"."merchant_contacts" USING "btree" ("contact_type");



CREATE INDEX "idx_merchant_contacts_merchant" ON "public"."merchant_contacts" USING "btree" ("merchant_id", "is_primary" DESC, "created_at" DESC);



CREATE INDEX "idx_merchant_contacts_merchant_id" ON "public"."merchant_contacts" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_discovery_merchant_id" ON "public"."merchant_discovery_studies" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_evaluations_merchant" ON "public"."merchant_evaluations" USING "btree" ("merchant_id", "created_at" DESC);



CREATE INDEX "idx_merchant_evaluations_merchant_id" ON "public"."merchant_evaluations" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_feedback_customer_id" ON "public"."merchant_customer_feedback" USING "btree" ("customer_id");



CREATE INDEX "idx_merchant_feedback_merchant_id" ON "public"."merchant_customer_feedback" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_feedback_request_id" ON "public"."merchant_customer_feedback" USING "btree" ("request_id");



CREATE INDEX "idx_merchant_offers_merchant" ON "public"."merchant_offers_legacy_archive" USING "btree" ("merchant_id", "status");



CREATE INDEX "idx_merchant_offers_request" ON "public"."merchant_offers_legacy_archive" USING "btree" ("request_id", "status");



CREATE INDEX "idx_merchant_perf_event_type" ON "public"."merchant_performance_events" USING "btree" ("event_type");



CREATE INDEX "idx_merchant_perf_merchant_id" ON "public"."merchant_performance_events" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_perf_occurred_at" ON "public"."merchant_performance_events" USING "btree" ("occurred_at");



CREATE INDEX "idx_merchant_perf_request_id" ON "public"."merchant_performance_events" USING "btree" ("request_id");



CREATE INDEX "idx_merchant_quotes_is_shortlisted" ON "public"."merchant_quotes" USING "btree" ("is_shortlisted");



CREATE INDEX "idx_merchant_quotes_merchant_id" ON "public"."merchant_quotes" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_quotes_request_id" ON "public"."merchant_quotes" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_merchant_quotes_shortlisted" ON "public"."merchant_quotes" USING "btree" ("request_id", "is_shortlisted", "final_score" DESC);



CREATE INDEX "idx_merchant_quotes_task_id" ON "public"."merchant_quotes" USING "btree" ("task_id");



CREATE INDEX "idx_merchant_scores_merchant_id" ON "public"."merchant_score_snapshots" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_service_areas_lookup" ON "public"."merchant_service_areas" USING "btree" ("city", "area", "merchant_id");



CREATE INDEX "idx_merchant_service_areas_merchant_id" ON "public"."merchant_service_areas" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchant_source_links_merchant" ON "public"."merchant_source_links" USING "btree" ("merchant_id", "is_active", "created_at" DESC);



CREATE INDEX "idx_merchant_source_links_merchant_id" ON "public"."merchant_source_links" USING "btree" ("merchant_id");



CREATE INDEX "idx_merchants_city_area" ON "public"."merchants" USING "btree" ("city", "area");



CREATE INDEX "idx_merchants_is_active" ON "public"."merchants" USING "btree" ("is_active");



CREATE INDEX "idx_merchants_merchant_type" ON "public"."merchants" USING "btree" ("merchant_type");



CREATE INDEX "idx_merchants_scores" ON "public"."merchants" USING "btree" ("overall_score" DESC, "reliability_score" DESC);



CREATE INDEX "idx_merchants_type_active" ON "public"."merchants" USING "btree" ("merchant_type", "is_active");



CREATE INDEX "idx_offers_merchant_id" ON "public"."offers" USING "btree" ("merchant_id");



CREATE INDEX "idx_offline_sourcing_tasks_assigned_to" ON "public"."offline_sourcing_tasks" USING "btree" ("assigned_to_user_id", "task_status");



CREATE INDEX "idx_offline_sourcing_tasks_request_id" ON "public"."offline_sourcing_tasks" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_offline_sourcing_tasks_status" ON "public"."offline_sourcing_tasks" USING "btree" ("task_status", "created_at");



CREATE UNIQUE INDEX "idx_one_active_task" ON "public"."task_claims" USING "btree" ("contributor_id") WHERE ("status" = 'in_progress'::"text");



CREATE INDEX "idx_otp_phone_purpose" ON "public"."phone_otp_codes" USING "btree" ("phone_number", "purpose", "is_used");



CREATE INDEX "idx_outbound_messages_customer_id" ON "public"."outbound_messages" USING "btree" ("customer_id");



CREATE INDEX "idx_outbound_messages_request_id" ON "public"."outbound_messages" USING "btree" ("request_id");



CREATE INDEX "idx_outbound_messages_scheduled_at" ON "public"."outbound_messages" USING "btree" ("scheduled_at");



CREATE INDEX "idx_outbound_messages_status" ON "public"."outbound_messages" USING "btree" ("status");



CREATE INDEX "idx_partner_points_partner" ON "public"."partner_points_ledger" USING "btree" ("partner_id");



CREATE INDEX "idx_platform_events_customer_id" ON "public"."platform_events" USING "btree" ("customer_id");



CREATE INDEX "idx_platform_events_event_type" ON "public"."platform_events" USING "btree" ("event_type");



CREATE INDEX "idx_platform_events_merchant_id" ON "public"."platform_events" USING "btree" ("merchant_id");



CREATE INDEX "idx_platform_events_occurred_at" ON "public"."platform_events" USING "btree" ("occurred_at");



CREATE INDEX "idx_platform_events_request_id" ON "public"."platform_events" USING "btree" ("request_id");



CREATE INDEX "idx_platform_tasks_discovery" ON "public"."platform_tasks" USING "btree" ("status", "min_level", "min_trust_score", "priority" DESC) WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_price_events_product" ON "public"."price_events" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "idx_price_guarantees_cust" ON "public"."price_guarantees" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "idx_price_history_dedup" ON "public"."price_history" USING "btree" ("product_id", "price", "date_trunc"('hour'::"text", ("captured_at" AT TIME ZONE 'UTC'::"text")));



CREATE INDEX "idx_price_history_product_time" ON "public"."price_history" USING "btree" ("product_id", "captured_at" DESC);



CREATE INDEX "idx_product_waitlists_name" ON "public"."product_waitlists" USING "btree" ("product_name");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_brand" ON "public"."products" USING "btree" ("brand");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_price" ON "public"."products" USING "btree" ("current_price");



CREATE INDEX "idx_products_source" ON "public"."products" USING "btree" ("source");



CREATE INDEX "idx_products_specs" ON "public"."products" USING "gin" ("specifications");



CREATE INDEX "idx_products_subcategory" ON "public"."products" USING "btree" ("subcategory");



CREATE INDEX "idx_products_vendor" ON "public"."products" USING "btree" ("vendor_id");



CREATE INDEX "idx_rate_limit_ip_endpoint_timestamp" ON "public"."rate_limit_logs" USING "btree" ("ip_address", "endpoint", "request_timestamp");



CREATE INDEX "idx_report_option_snapshots_report_id" ON "public"."report_option_snapshots" USING "btree" ("report_id", "display_rank");



CREATE INDEX "idx_report_option_snapshots_request_id" ON "public"."report_option_snapshots" USING "btree" ("request_id", "display_rank");



CREATE INDEX "idx_report_option_unlocks_customer_id" ON "public"."report_option_unlocks" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_request_admin_actions_request_created" ON "public"."request_admin_actions" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_request_admin_actions_type" ON "public"."request_admin_actions" USING "btree" ("action_type");



CREATE INDEX "idx_request_candidate_shortlists_published_offer_id" ON "public"."request_candidate_shortlists" USING "btree" ("published_offer_id");



CREATE INDEX "idx_request_candidate_shortlists_request_active" ON "public"."request_candidate_shortlists" USING "btree" ("request_id", "is_active", "ranking_position");



CREATE INDEX "idx_request_candidate_shortlists_request_id" ON "public"."request_candidate_shortlists" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_request_candidate_shortlists_research_item" ON "public"."request_candidate_shortlists" USING "btree" ("research_item_id");



CREATE INDEX "idx_request_compliance_actions_created_at" ON "public"."request_compliance_actions" USING "btree" ("created_at");



CREATE INDEX "idx_request_compliance_actions_request_id" ON "public"."request_compliance_actions" USING "btree" ("request_id");



CREATE INDEX "idx_request_compliance_hits_created_at" ON "public"."request_compliance_hits" USING "btree" ("created_at");



CREATE INDEX "idx_request_compliance_hits_request_id" ON "public"."request_compliance_hits" USING "btree" ("request_id");



CREATE INDEX "idx_request_compliance_hits_rule_id" ON "public"."request_compliance_hits" USING "btree" ("rule_id");



CREATE INDEX "idx_request_customer_message_audit_request" ON "public"."request_customer_message_audit" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_request_disputes_request" ON "public"."request_disputes" USING "btree" ("request_id");



CREATE INDEX "idx_request_history_deterministic_v7" ON "public"."request_status_history" USING "btree" ("request_id", "created_at", "event_source", "id");



CREATE INDEX "idx_request_merchant_matches_merchant" ON "public"."request_merchant_matches" USING "btree" ("merchant_id", "match_status", "created_at" DESC);



CREATE INDEX "idx_request_merchant_matches_merchant_id" ON "public"."request_merchant_matches" USING "btree" ("merchant_id");



CREATE INDEX "idx_request_merchant_matches_request" ON "public"."request_merchant_matches" USING "btree" ("request_id", "match_status", "created_at" DESC);



CREATE INDEX "idx_request_merchant_matches_request_id" ON "public"."request_merchant_matches" USING "btree" ("request_id");



CREATE INDEX "idx_request_messages_request_id" ON "public"."request_messages" USING "btree" ("request_id", "created_at");



CREATE INDEX "idx_request_messages_unread" ON "public"."request_messages" USING "btree" ("request_id", "sender_type", "read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_request_operational_states_stage" ON "public"."request_operational_states" USING "btree" ("operational_stage", "stage_status", "updated_at" DESC);



CREATE INDEX "idx_request_preferences_request_id" ON "public"."request_preferences" USING "btree" ("request_id");



CREATE INDEX "idx_request_qualification_reviews_latest" ON "public"."request_qualification_reviews" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_request_qualification_reviews_request_id" ON "public"."request_qualification_reviews" USING "btree" ("request_id");



CREATE INDEX "idx_request_workflow_events_request_id" ON "public"."request_workflow_events" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_requests_active_created_at" ON "public"."requests" USING "btree" ("created_at" DESC) WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_requests_admin_flags" ON "public"."requests" USING "btree" ("is_cancelled", "is_archived", "is_soft_deleted");



CREATE INDEX "idx_requests_archived_at" ON "public"."requests" USING "btree" ("archived_at");



CREATE INDEX "idx_requests_assigned_reviewer" ON "public"."requests" USING "btree" ("assigned_reviewer_staff_id");



CREATE INDEX "idx_requests_assignment_composite" ON "public"."requests" USING "btree" ("reviewer_assignment_status", "assigned_reviewer_staff_id");



CREATE INDEX "idx_requests_assignment_status" ON "public"."requests" USING "btree" ("reviewer_assignment_status");



CREATE INDEX "idx_requests_canonical_state" ON "public"."requests" USING "btree" ("canonical_state");



CREATE INDEX "idx_requests_current_status" ON "public"."requests" USING "btree" ("current_status");



CREATE INDEX "idx_requests_customer_id" ON "public"."requests" USING "btree" ("customer_id");



CREATE INDEX "idx_requests_is_archived" ON "public"."requests" USING "btree" ("is_archived");



CREATE INDEX "idx_requests_pricing_decision" ON "public"."requests" USING "btree" ("pricing_decision");



CREATE INDEX "idx_requests_request_kind" ON "public"."requests" USING "btree" ("request_kind");



CREATE INDEX "idx_requests_reviewer_decision" ON "public"."requests" USING "btree" ("reviewer_decision");



CREATE INDEX "idx_research_items_candidate" ON "public"."research_items" USING "btree" ("request_id", "is_candidate", "is_shortlisted");



CREATE INDEX "idx_research_items_request" ON "public"."research_items" USING "btree" ("request_id");



CREATE INDEX "idx_research_items_request_id" ON "public"."research_items" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_research_items_run" ON "public"."research_items" USING "btree" ("research_run_id");



CREATE INDEX "idx_research_items_run_id" ON "public"."research_items" USING "btree" ("research_run_id");



CREATE INDEX "idx_research_items_shortlisted" ON "public"."research_items" USING "btree" ("request_id", "is_shortlisted", "final_score" DESC);



CREATE INDEX "idx_research_runs_job" ON "public"."research_runs" USING "btree" ("job_id");



CREATE INDEX "idx_research_runs_request_created" ON "public"."research_runs" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_research_runs_request_id" ON "public"."research_runs" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_research_runs_status" ON "public"."research_runs" USING "btree" ("status", "created_at");



CREATE INDEX "idx_specializations_active" ON "public"."specializations" USING "btree" ("is_active");



CREATE INDEX "idx_specializations_beachhead" ON "public"."specializations" USING "btree" ("is_beachhead");



CREATE INDEX "idx_specializations_order" ON "public"."specializations" USING "btree" ("display_order");



CREATE INDEX "idx_specializations_parent" ON "public"."specializations" USING "btree" ("parent_id");



CREATE INDEX "idx_staff_members_active_role" ON "public"."staff_members" USING "btree" ("is_active", "staff_role", "team_code");



CREATE INDEX "idx_staff_roles_lookup" ON "public"."staff_member_roles" USING "btree" ("role_code", "is_active");



CREATE INDEX "idx_staff_roles_member" ON "public"."staff_member_roles" USING "btree" ("staff_member_id");



CREATE INDEX "idx_task_claims_contributor" ON "public"."task_claims" USING "btree" ("contributor_id", "status");



CREATE INDEX "idx_usage_events_customer_id" ON "public"."usage_events" USING "btree" ("customer_id", "occurred_at" DESC);



CREATE INDEX "idx_usage_events_request_id" ON "public"."usage_events" USING "btree" ("request_id");



CREATE INDEX "idx_vendor_auto_logs" ON "public"."vendor_automation_logs" USING "btree" ("vendor_id", "created_at" DESC);



CREATE INDEX "idx_vendor_bids_request" ON "public"."vendor_bids" USING "btree" ("request_id");



CREATE INDEX "idx_vendor_bids_score" ON "public"."vendor_bids" USING "btree" ("deal_score" DESC);



CREATE INDEX "idx_vendor_bids_vendor" ON "public"."vendor_bids" USING "btree" ("vendor_id");



CREATE INDEX "idx_vendor_cats_spec" ON "public"."vendor_categories" USING "btree" ("specialization_id");



CREATE INDEX "idx_vendor_portal_tokens_token" ON "public"."vendor_portal_tokens" USING "btree" ("token");



CREATE INDEX "idx_vendor_portal_tokens_vendor" ON "public"."vendor_portal_tokens" USING "btree" ("vendor_id");



CREATE INDEX "idx_vendor_reviews_pub" ON "public"."vendor_reviews" USING "btree" ("is_published", "is_archived");



CREATE INDEX "idx_vendor_reviews_token" ON "public"."vendor_reviews" USING "btree" ("review_token");



CREATE INDEX "idx_vendor_reviews_vendor" ON "public"."vendor_reviews" USING "btree" ("vendor_id");



CREATE INDEX "idx_vendor_sys_msgs" ON "public"."vendor_system_messages" USING "btree" ("vendor_id", "created_at" DESC);



CREATE INDEX "idx_vendors_auth_user" ON "public"."vendors" USING "btree" ("auth_user_id");



CREATE INDEX "idx_vendors_governorate" ON "public"."vendors" USING "btree" ("governorate");



CREATE INDEX "idx_vendors_status" ON "public"."vendors" USING "btree" ("system_status");



CREATE INDEX "idx_vendors_tier" ON "public"."vendors" USING "btree" ("account_tier");



CREATE INDEX "idx_vendors_trust" ON "public"."vendors" USING "btree" ("trust_score");



CREATE UNIQUE INDEX "idx_wallet_transactions_idempotency" ON "public"."wallet_transactions" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_wallet_transactions_wallet_id" ON "public"."wallet_transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_watchlists_customer" ON "public"."user_watchlists" USING "btree" ("customer_id");



CREATE INDEX "idx_watchlists_product" ON "public"."user_watchlists" USING "btree" ("product_id");



CREATE UNIQUE INDEX "ux_agent_jobs_one_active_type_per_request" ON "public"."agent_jobs" USING "btree" ("request_id", "job_type") WHERE ("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'waiting_approval'::"text"]));



CREATE UNIQUE INDEX "ux_customer_contacts_primary_per_type" ON "public"."customer_contacts" USING "btree" ("customer_id", "contact_type") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "ux_customer_contacts_unique_value" ON "public"."customer_contacts" USING "btree" ("customer_id", "contact_type", "contact_value");



CREATE UNIQUE INDEX "ux_customer_subscriptions_one_active" ON "public"."customer_subscriptions" USING "btree" ("customer_id") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "ux_customers_auth_user_id_not_null" ON "public"."customers" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_customers_phone_number_normalized" ON "public"."customers" USING "btree" ("phone_number_normalized") WHERE ("phone_number_normalized" IS NOT NULL);



CREATE UNIQUE INDEX "ux_merchant_contacts_primary_per_type" ON "public"."merchant_contacts" USING "btree" ("merchant_id", "contact_type") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "ux_merchant_contacts_unique_value" ON "public"."merchant_contacts" USING "btree" ("merchant_id", "contact_type", "contact_value");



CREATE UNIQUE INDEX "ux_report_option_snapshots_report_rank" ON "public"."report_option_snapshots" USING "btree" ("report_id", "display_rank");



CREATE UNIQUE INDEX "ux_report_option_unlocks_snapshot_customer" ON "public"."report_option_unlocks" USING "btree" ("report_option_snapshot_id", "customer_id");



CREATE UNIQUE INDEX "ux_request_candidate_shortlists_active_merchant_quote" ON "public"."request_candidate_shortlists" USING "btree" ("merchant_quote_id") WHERE (("merchant_quote_id" IS NOT NULL) AND ("is_active" = true));



CREATE UNIQUE INDEX "ux_request_candidate_shortlists_active_rank" ON "public"."request_candidate_shortlists" USING "btree" ("request_id", "ranking_position") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "ux_request_candidate_shortlists_active_research_item" ON "public"."request_candidate_shortlists" USING "btree" ("research_item_id") WHERE (("research_item_id" IS NOT NULL) AND ("is_active" = true));



CREATE UNIQUE INDEX "ux_request_qualification_reviews_latest" ON "public"."request_qualification_reviews" USING "btree" ("request_id") WHERE ("is_latest" = true);



CREATE UNIQUE INDEX "ux_research_items_run_listing_url" ON "public"."research_items" USING "btree" ("research_run_id", "listing_url") WHERE ("listing_url" IS NOT NULL);



CREATE OR REPLACE TRIGGER "tr_block_delete_ai_agent_configs" BEFORE DELETE ON "public"."ai_agent_configs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_communication_templates" BEFORE DELETE ON "public"."communication_templates" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_findora_deals" BEFORE DELETE ON "public"."findora_deals" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_homepage_announcements" BEFORE DELETE ON "public"."homepage_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_service_catalog" BEFORE DELETE ON "public"."service_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_service_pricing_versions" BEFORE DELETE ON "public"."service_pricing_versions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_site_content_blocks" BEFORE DELETE ON "public"."site_content_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_staff_member_roles" BEFORE DELETE ON "public"."staff_member_roles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_delete_staff_members" BEFORE DELETE ON "public"."staff_members" FOR EACH ROW EXECUTE FUNCTION "public"."fn_block_protected_delete"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_ai_agent_configs" BEFORE TRUNCATE ON "public"."ai_agent_configs" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_communication_templates" BEFORE TRUNCATE ON "public"."communication_templates" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_findora_deals" BEFORE TRUNCATE ON "public"."findora_deals" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_homepage_announcements" BEFORE TRUNCATE ON "public"."homepage_announcements" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_service_catalog" BEFORE TRUNCATE ON "public"."service_catalog" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_service_pricing_versions" BEFORE TRUNCATE ON "public"."service_pricing_versions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_site_content_blocks" BEFORE TRUNCATE ON "public"."site_content_blocks" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_staff_member_roles" BEFORE TRUNCATE ON "public"."staff_member_roles" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_block_truncate_staff_members" BEFORE TRUNCATE ON "public"."staff_members" FOR EACH STATEMENT EXECUTE FUNCTION "public"."fn_block_protected_truncate"();



CREATE OR REPLACE TRIGGER "tr_guard_ai_agent_configs_immutable" BEFORE UPDATE ON "public"."ai_agent_configs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_guard_ai_agent_configs_immutable"();



CREATE OR REPLACE TRIGGER "tr_guard_comm_templates_immutable" BEFORE UPDATE ON "public"."communication_templates" FOR EACH ROW EXECUTE FUNCTION "public"."fn_guard_comm_templates_immutable"();



CREATE OR REPLACE TRIGGER "tr_guard_staff_members_immutable" BEFORE UPDATE ON "public"."staff_members" FOR EACH ROW EXECUTE FUNCTION "public"."fn_guard_staff_members_immutable"();



CREATE OR REPLACE TRIGGER "tr_operational_states_canonical_state" AFTER INSERT OR UPDATE OF "client_released_at" ON "public"."request_operational_states" FOR EACH ROW EXECUTE FUNCTION "public"."fn_operational_states_canonical_state_trigger"();



CREATE OR REPLACE TRIGGER "tr_pricing_lifecycle_state_machine" BEFORE INSERT OR UPDATE ON "public"."service_pricing_versions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_pricing_lifecycle_state_machine"();



CREATE OR REPLACE TRIGGER "tr_requests_canonical_state" BEFORE INSERT OR UPDATE OF "is_archived", "current_status", "reviewer_decision" ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."fn_requests_canonical_state_trigger"();



CREATE OR REPLACE TRIGGER "tr_single_active_pricing_rule_v2" BEFORE INSERT OR UPDATE ON "public"."service_pricing_versions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_single_active_pricing_rule_v2"();



CREATE OR REPLACE TRIGGER "tr_soft_delete_pricing" BEFORE DELETE ON "public"."service_pricing_versions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_soft_delete_pricing"();



CREATE OR REPLACE TRIGGER "tr_sync_pricing_columns" BEFORE INSERT OR UPDATE ON "public"."service_pricing_versions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_pricing_columns"();



CREATE OR REPLACE TRIGGER "tr_workflow_runs_set_updated_at" BEFORE UPDATE ON "public"."workflow_runs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contributors_auto_referral_code" BEFORE INSERT ON "public"."contributors" FOR EACH ROW EXECUTE FUNCTION "public"."fn_contributors_auto_referral_code"();



CREATE OR REPLACE TRIGGER "trg_distribute_network_revenue" AFTER INSERT ON "public"."wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_distribute_network_revenue"();



CREATE OR REPLACE TRIGGER "trg_ensure_default_request_preferences" AFTER INSERT ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."fn_ensure_default_request_preferences"();



CREATE OR REPLACE TRIGGER "trg_feature_flags_updated_at" BEFORE UPDATE ON "public"."feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."fn_feature_flags_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_init_contributor_wallet" AFTER INSERT ON "public"."contributors" FOR EACH ROW EXECUTE FUNCTION "public"."fn_init_contributor_wallet"();



CREATE OR REPLACE TRIGGER "trg_link_referral" AFTER INSERT ON "public"."contributors" FOR EACH ROW EXECUTE FUNCTION "public"."fn_link_referral"();



CREATE OR REPLACE TRIGGER "trg_process_referral_reward" AFTER UPDATE OF "status" ON "public"."contributor_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."fn_process_referral_reward"();



CREATE OR REPLACE TRIGGER "trg_process_wallet_transaction" AFTER INSERT ON "public"."wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_process_wallet_transaction"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_request_candidate_shortlists_updated_at" BEFORE UPDATE ON "public"."request_candidate_shortlists" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_request_customer_message_audit_updated_at" BEFORE UPDATE ON "public"."request_customer_message_audit" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_request_merchant_matches_updated_at" BEFORE UPDATE ON "public"."request_merchant_matches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_research_items_updated_at" BEFORE UPDATE ON "public"."research_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_research_runs_updated_at" BEFORE UPDATE ON "public"."research_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_agent_jobs" BEFORE UPDATE ON "public"."agent_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_approvals" BEFORE UPDATE ON "public"."approvals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_compliance_rules" BEFORE UPDATE ON "public"."compliance_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_customer_contacts" BEFORE UPDATE ON "public"."customer_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_customer_subscriptions" BEFORE UPDATE ON "public"."customer_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_customers" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_job_queue_rules" BEFORE UPDATE ON "public"."job_queue_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_merchant_contacts" BEFORE UPDATE ON "public"."merchant_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_merchant_quotes" BEFORE UPDATE ON "public"."merchant_quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_merchant_service_areas" BEFORE UPDATE ON "public"."merchant_service_areas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_merchant_source_links" BEFORE UPDATE ON "public"."merchant_source_links" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_merchants" BEFORE UPDATE ON "public"."merchants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_offline_sourcing_tasks" BEFORE UPDATE ON "public"."offline_sourcing_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_payments" BEFORE UPDATE ON "public"."payments_legacy_archive" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_report_option_snapshots" BEFORE UPDATE ON "public"."report_option_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_reports" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_request_candidate_shortlists" BEFORE UPDATE ON "public"."request_candidate_shortlists" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_request_operational_states" BEFORE UPDATE ON "public"."request_operational_states" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_request_preferences" BEFORE UPDATE ON "public"."request_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_request_qualification_reviews" BEFORE UPDATE ON "public"."request_qualification_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_requests" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_research_items" BEFORE UPDATE ON "public"."research_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_research_runs" BEFORE UPDATE ON "public"."research_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_staff_members" BEFORE UPDATE ON "public"."staff_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_subscription_plans" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_specializations_updated_at" BEFORE UPDATE ON "public"."specializations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_specializations_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_customer_contacts_from_customer" AFTER INSERT OR UPDATE OF "phone_number_raw", "phone_number_normalized", "phone_verified_at", "email" ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_customer_contacts_from_customer"();



CREATE OR REPLACE TRIGGER "trg_sync_customer_phone_verified" BEFORE INSERT OR UPDATE OF "phone_verified_at", "phone_verified" ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_customer_phone_verified"();



CREATE OR REPLACE TRIGGER "trg_sync_merchant_contacts_from_merchant" AFTER INSERT OR UPDATE OF "primary_phone", "whatsapp", "email" ON "public"."merchants" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"();



CREATE OR REPLACE TRIGGER "trg_sync_merchant_source_links_from_merchant" AFTER INSERT OR UPDATE OF "website_url", "facebook_url", "instagram_url" ON "public"."merchants" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"();



CREATE OR REPLACE TRIGGER "trg_sync_request_status_to_customer" AFTER INSERT OR UPDATE OF "canonical_state" ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_request_status_to_customer"();



CREATE OR REPLACE TRIGGER "trg_update_contributor_trust_score" AFTER INSERT ON "public"."contributor_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_contributor_trust_score"();



CREATE OR REPLACE TRIGGER "trg_vendors_calc_tier" BEFORE INSERT OR UPDATE OF "trust_score" ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."fn_vendors_calc_tier"();



CREATE OR REPLACE TRIGGER "trg_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."fn_vendors_set_updated_at"();



ALTER TABLE ONLY "public"."agent_job_logs"
    ADD CONSTRAINT "agent_job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_depends_on_job_id_fkey" FOREIGN KEY ("depends_on_job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_copilot_runs"
    ADD CONSTRAINT "ai_copilot_runs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_copilot_runs"
    ADD CONSTRAINT "ai_copilot_runs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."alert_events"
    ADD CONSTRAINT "alert_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."allowed_link_domains"
    ADD CONSTRAINT "allowed_link_domains_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bonus_campaigns"
    ADD CONSTRAINT "bonus_campaigns_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."buyer_qa"
    ADD CONSTRAINT "buyer_qa_answerer_id_fkey" FOREIGN KEY ("answerer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."buyer_qa"
    ADD CONSTRAINT "buyer_qa_asker_id_fkey" FOREIGN KEY ("asker_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_preferences"
    ADD CONSTRAINT "communication_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_experiments"
    ADD CONSTRAINT "company_experiments_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."competitor_feature_comparisons"
    ADD CONSTRAINT "competitor_feature_comparisons_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_alerts"
    ADD CONSTRAINT "contributor_alerts_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_badges"
    ADD CONSTRAINT "contributor_badges_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_device_fingerprints"
    ADD CONSTRAINT "contributor_device_fingerprints_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_hr_reviews"
    ADD CONSTRAINT "contributor_hr_reviews_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_hr_reviews"
    ADD CONSTRAINT "contributor_hr_reviews_fraud_audit_id_fkey" FOREIGN KEY ("fraud_audit_id") REFERENCES "public"."fraud_audit_log"("id");



ALTER TABLE ONLY "public"."contributor_hr_reviews"
    ADD CONSTRAINT "contributor_hr_reviews_staff_reviewer_id_fkey" FOREIGN KEY ("staff_reviewer_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."contributor_notifications"
    ADD CONSTRAINT "contributor_notifications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_referrals"
    ADD CONSTRAINT "contributor_referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_referrals"
    ADD CONSTRAINT "contributor_referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_reviews"
    ADD CONSTRAINT "contributor_reviews_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_risk_scores"
    ADD CONSTRAINT "contributor_risk_scores_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_streaks"
    ADD CONSTRAINT "contributor_streaks_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_submissions"
    ADD CONSTRAINT "contributor_submissions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributor_verification_requests"
    ADD CONSTRAINT "contributor_verification_requests_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributor_verification_requests"
    ADD CONSTRAINT "contributor_verification_requests_hr_reviewer_staff_id_fkey" FOREIGN KEY ("hr_reviewer_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."contributor_wallets"
    ADD CONSTRAINT "contributor_wallets_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributor_withdrawals"
    ADD CONSTRAINT "contributor_withdrawals_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributor_withdrawals"
    ADD CONSTRAINT "contributor_withdrawals_fraud_audit_id_fkey" FOREIGN KEY ("fraud_audit_id") REFERENCES "public"."fraud_audit_log"("id");



ALTER TABLE ONLY "public"."contributor_withdrawals"
    ADD CONSTRAINT "contributor_withdrawals_staff_reviewer_id_fkey" FOREIGN KEY ("staff_reviewer_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."contributor_withdrawals"
    ADD CONSTRAINT "contributor_withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."contributor_wallets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contributors"
    ADD CONSTRAINT "contributors_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "public"."contributors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_discovery_interviews"
    ADD CONSTRAINT "customer_discovery_interviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_discovery_interviews"
    ADD CONSTRAINT "customer_discovery_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_disputes"
    ADD CONSTRAINT "customer_disputes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id");



ALTER TABLE ONLY "public"."customer_disputes"
    ADD CONSTRAINT "customer_disputes_staff_reviewer_id_fkey" FOREIGN KEY ("staff_reviewer_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."customer_intelligence_events"
    ADD CONSTRAINT "customer_intelligence_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_intelligence_events"
    ADD CONSTRAINT "customer_intelligence_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_points_ledger"
    ADD CONSTRAINT "customer_points_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_requests"
    ADD CONSTRAINT "customer_requests_source_deal_id_fkey" FOREIGN KEY ("source_deal_id") REFERENCES "public"."marketplace_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_score_snapshots"
    ADD CONSTRAINT "customer_score_snapshots_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_verification_events"
    ADD CONSTRAINT "customer_verification_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_verification_events"
    ADD CONSTRAINT "customer_verification_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."economy_config"
    ADD CONSTRAINT "economy_config_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."economy_stabilizer_events"
    ADD CONSTRAINT "economy_stabilizer_events_staff_override_id_fkey" FOREIGN KEY ("staff_override_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."feature_flags_audit"
    ADD CONSTRAINT "feature_flags_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."financial_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."findora_deal_inquiries"
    ADD CONSTRAINT "findora_deal_inquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."findora_deal_inquiries"
    ADD CONSTRAINT "findora_deal_inquiries_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."findora_deals"("id");



ALTER TABLE ONLY "public"."findora_deals"
    ADD CONSTRAINT "findora_deals_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."findora_deals"
    ADD CONSTRAINT "findora_deals_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."findora_deals"
    ADD CONSTRAINT "findora_deals_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "fk_requests_assigned_reviewer" FOREIGN KEY ("assigned_reviewer_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "fk_requests_reviewer_assigned_by" FOREIGN KEY ("reviewer_assigned_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."founder_weekly_logs"
    ADD CONSTRAINT "founder_weekly_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fraud_alerts"
    ADD CONSTRAINT "fraud_alerts_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fraud_alerts"
    ADD CONSTRAINT "fraud_alerts_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fraud_alerts"
    ADD CONSTRAINT "fraud_alerts_resolved_by_staff_id_fkey" FOREIGN KEY ("resolved_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."fraud_audit_log"
    ADD CONSTRAINT "fraud_audit_log_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_buying_members"
    ADD CONSTRAINT "group_buying_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_buying_members"
    ADD CONSTRAINT "group_buying_members_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "public"."group_buying_pools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_buying_members"
    ADD CONSTRAINT "group_buying_members_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."homepage_announcements"
    ADD CONSTRAINT "homepage_announcements_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."homepage_announcements"
    ADD CONSTRAINT "homepage_announcements_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."market_insights"
    ADD CONSTRAINT "market_insights_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_approved_by_staff_id_fkey" FOREIGN KEY ("approved_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_products"
    ADD CONSTRAINT "marketplace_products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_category_map"
    ADD CONSTRAINT "merchant_category_map_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."merchant_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_category_map"
    ADD CONSTRAINT "merchant_category_map_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_contacts"
    ADD CONSTRAINT "merchant_contacts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_customer_feedback"
    ADD CONSTRAINT "merchant_customer_feedback_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_customer_feedback"
    ADD CONSTRAINT "merchant_customer_feedback_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."merchant_customer_feedback"
    ADD CONSTRAINT "merchant_customer_feedback_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_discovery_studies"
    ADD CONSTRAINT "merchant_discovery_studies_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_discovery_studies"
    ADD CONSTRAINT "merchant_discovery_studies_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_evaluations"
    ADD CONSTRAINT "merchant_evaluations_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_evaluations"
    ADD CONSTRAINT "merchant_evaluations_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_evaluations"
    ADD CONSTRAINT "merchant_evaluations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_offers_legacy_archive"
    ADD CONSTRAINT "merchant_offers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_profiles_legacy_archive"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_offers_legacy_archive"
    ADD CONSTRAINT "merchant_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_performance_events"
    ADD CONSTRAINT "merchant_performance_events_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."merchant_performance_events"
    ADD CONSTRAINT "merchant_performance_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_profiles_legacy_archive"
    ADD CONSTRAINT "merchant_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_quotes"
    ADD CONSTRAINT "merchant_quotes_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_quotes"
    ADD CONSTRAINT "merchant_quotes_quoted_by_user_id_fkey" FOREIGN KEY ("quoted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_quotes"
    ADD CONSTRAINT "merchant_quotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_quotes"
    ADD CONSTRAINT "merchant_quotes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."offline_sourcing_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."merchant_score_snapshots"
    ADD CONSTRAINT "merchant_score_snapshots_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."merchant_service_areas"
    ADD CONSTRAINT "merchant_service_areas_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_source_links"
    ADD CONSTRAINT "merchant_source_links_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moat_competitor_threats"
    ADD CONSTRAINT "moat_competitor_threats_moat_id_fkey" FOREIGN KEY ("moat_id") REFERENCES "public"."platform_moats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_sourcing_tasks"
    ADD CONSTRAINT "offline_sourcing_tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offline_sourcing_tasks"
    ADD CONSTRAINT "offline_sourcing_tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offline_sourcing_tasks"
    ADD CONSTRAINT "offline_sourcing_tasks_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offline_sourcing_tasks"
    ADD CONSTRAINT "offline_sourcing_tasks_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_merchant_quotes"
    ADD CONSTRAINT "online_merchant_quotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outbound_messages"
    ADD CONSTRAINT "outbound_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outbound_messages"
    ADD CONSTRAINT "outbound_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."page_content"
    ADD CONSTRAINT "page_content_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partner_points_ledger"
    ADD CONSTRAINT "partner_points_ledger_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_audit_events"
    ADD CONSTRAINT "payment_audit_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."payment_audit_events"
    ADD CONSTRAINT "payment_audit_events_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_intents"
    ADD CONSTRAINT "payment_intents_confirmed_by_staff_id_fkey" FOREIGN KEY ("confirmed_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."payment_intents"
    ADD CONSTRAINT "payment_intents_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."payment_intents"
    ADD CONSTRAINT "payment_intents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."payment_intents"
    ADD CONSTRAINT "payment_intents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id");



ALTER TABLE ONLY "public"."payments_legacy_archive"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments_legacy_archive"
    ADD CONSTRAINT "payments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_events"
    ADD CONSTRAINT "platform_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_events"
    ADD CONSTRAINT "platform_events_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_events"
    ADD CONSTRAINT "platform_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_tasks"
    ADD CONSTRAINT "platform_tasks_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."platform_tasks"
    ADD CONSTRAINT "platform_tasks_parent_request_id_fkey" FOREIGN KEY ("parent_request_id") REFERENCES "public"."customer_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_alerts"
    ADD CONSTRAINT "price_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_events"
    ADD CONSTRAINT "price_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_guarantees"
    ADD CONSTRAINT "price_guarantees_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_guarantees"
    ADD CONSTRAINT "price_guarantees_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_trends"
    ADD CONSTRAINT "price_trends_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."product_waitlists"
    ADD CONSTRAINT "product_waitlists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referral_challenges"
    ADD CONSTRAINT "referral_challenges_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "public"."contributors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_snapshots"
    ADD CONSTRAINT "report_option_snapshots_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_option_snapshots"
    ADD CONSTRAINT "report_option_snapshots_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_snapshots"
    ADD CONSTRAINT "report_option_snapshots_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_snapshots"
    ADD CONSTRAINT "report_option_snapshots_shortlist_id_fkey" FOREIGN KEY ("shortlist_id") REFERENCES "public"."request_candidate_shortlists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_snapshot_id_fkey" FOREIGN KEY ("report_option_snapshot_id") REFERENCES "public"."report_option_snapshots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."customer_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_option_unlocks"
    ADD CONSTRAINT "report_option_unlocks_unlocked_by_user_id_fkey" FOREIGN KEY ("unlocked_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_admin_actions"
    ADD CONSTRAINT "request_admin_actions_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_admin_actions"
    ADD CONSTRAINT "request_admin_actions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_attachments"
    ADD CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_merchant_quote_id_fkey" FOREIGN KEY ("merchant_quote_id") REFERENCES "public"."merchant_quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_published_offer_id_fkey" FOREIGN KEY ("published_offer_id") REFERENCES "public"."offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_research_item_id_fkey" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_candidate_shortlists"
    ADD CONSTRAINT "request_candidate_shortlists_selected_by_user_id_fkey" FOREIGN KEY ("selected_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_compliance_actions"
    ADD CONSTRAINT "request_compliance_actions_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_compliance_actions"
    ADD CONSTRAINT "request_compliance_actions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_compliance_hits"
    ADD CONSTRAINT "request_compliance_hits_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_compliance_hits"
    ADD CONSTRAINT "request_compliance_hits_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_compliance_hits"
    ADD CONSTRAINT "request_compliance_hits_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."compliance_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_customer_message_audit"
    ADD CONSTRAINT "request_customer_message_audit_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_customer_message_audit"
    ADD CONSTRAINT "request_customer_message_audit_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_customer_message_audit"
    ADD CONSTRAINT "request_customer_message_audit_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_delete_backups"
    ADD CONSTRAINT "request_delete_backups_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."request_delete_backups"
    ADD CONSTRAINT "request_delete_backups_deleted_by_staff_id_fkey" FOREIGN KEY ("deleted_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."request_deletion_audit"
    ADD CONSTRAINT "request_deletion_audit_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."request_deletion_audit"
    ADD CONSTRAINT "request_deletion_audit_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "public"."request_delete_backups"("id");



ALTER TABLE ONLY "public"."request_disputes"
    ADD CONSTRAINT "request_disputes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_disputes"
    ADD CONSTRAINT "request_disputes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_disputes"
    ADD CONSTRAINT "request_disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_disputes"
    ADD CONSTRAINT "request_disputes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_merchant_matches"
    ADD CONSTRAINT "request_merchant_matches_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_merchant_matches"
    ADD CONSTRAINT "request_merchant_matches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_messages"
    ADD CONSTRAINT "request_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_operational_states"
    ADD CONSTRAINT "request_operational_states_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_preferences"
    ADD CONSTRAINT "request_preferences_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_qualification_reviews"
    ADD CONSTRAINT "request_qualification_reviews_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_qualification_reviews"
    ADD CONSTRAINT "request_qualification_reviews_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_status_history"
    ADD CONSTRAINT "request_status_history_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."request_status_history"
    ADD CONSTRAINT "request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_workflow_events"
    ADD CONSTRAINT "request_workflow_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_workflow_events"
    ADD CONSTRAINT "request_workflow_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_archived_by_staff_id_fkey" FOREIGN KEY ("archived_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_cancelled_by_staff_id_fkey" FOREIGN KEY ("cancelled_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_reviewer_decided_by_staff_id_fkey" FOREIGN KEY ("reviewer_decided_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_selected_bid_id_fkey" FOREIGN KEY ("selected_bid_id") REFERENCES "public"."vendor_bids"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_soft_deleted_by_staff_id_fkey" FOREIGN KEY ("soft_deleted_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."research_items"
    ADD CONSTRAINT "research_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."research_items"
    ADD CONSTRAINT "research_items_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."research_runs"
    ADD CONSTRAINT "research_runs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."research_runs"
    ADD CONSTRAINT "research_runs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_pricing_versions"
    ADD CONSTRAINT "service_pricing_versions_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."service_pricing_versions"
    ADD CONSTRAINT "service_pricing_versions_service_key_fkey" FOREIGN KEY ("service_key") REFERENCES "public"."service_catalog"("service_key");



ALTER TABLE ONLY "public"."site_content_audit"
    ADD CONSTRAINT "site_content_audit_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."site_content_blocks"
    ADD CONSTRAINT "site_content_blocks_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."source_reveals"
    ADD CONSTRAINT "source_reveals_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id");



ALTER TABLE ONLY "public"."source_reveals"
    ADD CONSTRAINT "source_reveals_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."source_reveals"
    ADD CONSTRAINT "source_reveals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specializations"
    ADD CONSTRAINT "specializations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."specializations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_departments"
    ADD CONSTRAINT "staff_departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_hr_details"
    ADD CONSTRAINT "staff_hr_details_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."staff_departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_hr_details"
    ADD CONSTRAINT "staff_hr_details_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_member_roles"
    ADD CONSTRAINT "staff_member_roles_granted_by_staff_id_fkey" FOREIGN KEY ("granted_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."staff_member_roles"
    ADD CONSTRAINT "staff_member_roles_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_performance_reviews"
    ADD CONSTRAINT "staff_performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_performance_reviews"
    ADD CONSTRAINT "staff_performance_reviews_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_claims"
    ADD CONSTRAINT "task_claims_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."task_claims"
    ADD CONSTRAINT "task_claims_reviewed_by_staff_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."task_claims"
    ADD CONSTRAINT "task_claims_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."platform_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."customer_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_watchlists"
    ADD CONSTRAINT "user_watchlists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_watchlists"
    ADD CONSTRAINT "user_watchlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_audit_log"
    ADD CONSTRAINT "vendor_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."vendor_audit_log"
    ADD CONSTRAINT "vendor_audit_log_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_automation_logs"
    ADD CONSTRAINT "vendor_automation_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_bids"
    ADD CONSTRAINT "vendor_bids_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_bids"
    ADD CONSTRAINT "vendor_bids_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_categories"
    ADD CONSTRAINT "vendor_categories_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id");



ALTER TABLE ONLY "public"."vendor_categories"
    ADD CONSTRAINT "vendor_categories_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_portal_tokens"
    ADD CONSTRAINT "vendor_portal_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."vendor_portal_tokens"
    ADD CONSTRAINT "vendor_portal_tokens_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_profile_details"
    ADD CONSTRAINT "vendor_profile_details_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_reviews"
    ADD CONSTRAINT "vendor_reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_system_messages"
    ADD CONSTRAINT "vendor_system_messages_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."staff_members"("id");



ALTER TABLE ONLY "public"."vendor_system_messages"
    ADD CONSTRAINT "vendor_system_messages_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_fraud_audit_id_fkey" FOREIGN KEY ("fraud_audit_id") REFERENCES "public"."fraud_audit_log"("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."contributor_wallets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



CREATE POLICY "Active staff full access on workflow runs" ON "public"."workflow_runs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "s"
  WHERE (("s"."auth_user_id" = "auth"."uid"()) AND ("s"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "s"
  WHERE (("s"."auth_user_id" = "auth"."uid"()) AND ("s"."is_active" = true)))));



CREATE POLICY "Admin manage services" ON "public"."service_catalog" USING ("public"."fn_is_staff_manager"());



CREATE POLICY "Admin/Owner Full Access Audit" ON "public"."request_deletion_audit" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff_members" "sm"
     LEFT JOIN "public"."staff_member_roles" "smr" ON (("sm"."id" = "smr"."staff_member_id")))
  WHERE (("sm"."auth_user_id" = "auth"."uid"()) AND (("sm"."staff_role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])) OR ("smr"."role_code" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))) AND ("sm"."is_active" = true)))));



CREATE POLICY "Admin/Owner Full Access Backups" ON "public"."request_delete_backups" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff_members" "sm"
     LEFT JOIN "public"."staff_member_roles" "smr" ON (("sm"."id" = "smr"."staff_member_id")))
  WHERE (("sm"."auth_user_id" = "auth"."uid"()) AND (("sm"."staff_role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])) OR ("smr"."role_code" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))) AND ("sm"."is_active" = true)))));



CREATE POLICY "Admins manage content plans" ON "public"."growth_content_plan" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage crm ads" ON "public"."crm_ads_performances" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage departments" ON "public"."staff_departments" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage founder items" ON "public"."founder_accountability_items" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage founder logs" ON "public"."founder_weekly_logs" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage growth channels" ON "public"."growth_channels" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage hr details" ON "public"."staff_hr_details" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage north star config" ON "public"."north_star_config" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage north star goals" ON "public"."north_star_goals" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Admins manage reviews" ON "public"."staff_performance_reviews" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Allow public read of customer_fee_phases" ON "public"."customer_fee_phases" FOR SELECT USING (true);



CREATE POLICY "Allow public read of vendor_fee_phases" ON "public"."vendor_fee_phases" FOR SELECT USING (true);



CREATE POLICY "Allow public read of vendor_profile_details" ON "public"."vendor_profile_details" FOR SELECT USING (true);



CREATE POLICY "Allow staff to manage merchant_quotes" ON "public"."merchant_quotes" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Allow staff write of customer_fee_phases" ON "public"."customer_fee_phases" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "s"
  WHERE ("s"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Allow staff write of vendor_fee_phases" ON "public"."vendor_fee_phases" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "s"
  WHERE ("s"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Allow staff write of vendor_profile_details" ON "public"."vendor_profile_details" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "s"
  WHERE ("s"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Anyone authenticated can view answered QA" ON "public"."buyer_qa" FOR SELECT TO "authenticated" USING ((("status" = 'answered'::"text") OR ("asker_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1))));



CREATE POLICY "Categories are viewable by staff" ON "public"."financial_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Categories can be managed by admins and accountants" ON "public"."financial_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff_member_roles" "r"
     JOIN "public"."staff_members" "s" ON (("s"."id" = "r"."staff_member_id")))
  WHERE (("s"."auth_user_id" = "auth"."uid"()) AND ("r"."role_code" = ANY (ARRAY['admin'::"text", 'accountant'::"text", 'owner'::"text", 'finance_manager'::"text"])) AND ("r"."is_active" = true)))));



CREATE POLICY "Contributors can update their own notifications (read status)" ON "public"."contributor_notifications" FOR UPDATE USING (("contributor_id" IN ( SELECT "contributors"."id"
   FROM "public"."contributors"
  WHERE ("contributors"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Contributors can view their own notifications" ON "public"."contributor_notifications" FOR SELECT USING (("contributor_id" IN ( SELECT "contributors"."id"
   FROM "public"."contributors"
  WHERE ("contributors"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Customers Read Own Payment Intents" ON "public"."payment_intents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."auth_user_id" = "auth"."uid"()) AND ("c"."id" = "payment_intents"."customer_id")))));



CREATE POLICY "Customers can view bids on their requests" ON "public"."vendor_bids" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "vendor_bids"."request_id") AND ("r"."customer_id" = ( SELECT "customers"."id"
           FROM "public"."customers"
          WHERE ("customers"."email" = "auth"."email"())
         LIMIT 1))))));



CREATE POLICY "Customers manage own feedback" ON "public"."merchant_customer_feedback" USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Customers manage own prefs" ON "public"."communication_preferences" USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Customers view own messages" ON "public"."outbound_messages" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view their own points ledger" ON "public"."partner_points_ledger" FOR SELECT TO "authenticated" USING (("partner_id" = ( SELECT "staff_members"."id"
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Previous buyers can answer questions" ON "public"."buyer_qa" FOR UPDATE TO "authenticated" USING (("status" = 'pending'::"text"));



CREATE POLICY "Public can insert inquiries" ON "public"."findora_deal_inquiries" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can view page content" ON "public"."page_content" FOR SELECT USING (true);



CREATE POLICY "Public read active announcements" ON "public"."homepage_announcements" FOR SELECT USING ((("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



CREATE POLICY "Public read active deals" ON "public"."findora_deals" FOR SELECT USING ((("is_active" = true) AND ("deal_status" = 'active'::"text") AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



CREATE POLICY "Public read active pricing" ON "public"."service_pricing_versions" FOR SELECT USING ((("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



CREATE POLICY "Public read active services" ON "public"."service_catalog" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public read published content" ON "public"."site_content_blocks" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Staff Full Access Payment Audit" ON "public"."payment_audit_events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "sm"
  WHERE (("sm"."auth_user_id" = "auth"."uid"()) AND ("sm"."is_active" = true)))));



CREATE POLICY "Staff Full Access Payment Intents" ON "public"."payment_intents" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members" "sm"
  WHERE (("sm"."auth_user_id" = "auth"."uid"()) AND ("sm"."is_active" = true)))));



CREATE POLICY "Staff can manage all bids" ON "public"."vendor_bids" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Staff can manage all disputes" ON "public"."request_disputes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Staff can manage all market insights" ON "public"."market_insights" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Staff can manage all price guarantees" ON "public"."price_guarantees" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE ("staff_members"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Staff can manage page content" ON "public"."page_content" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE (("staff_members"."auth_user_id" = "auth"."uid"()) AND ("staff_members"."is_active" = true) AND ("staff_members"."staff_role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'content_manager'::"text", 'developer'::"text"]))))));



CREATE POLICY "Staff insert audit" ON "public"."site_content_audit" FOR INSERT WITH CHECK (("public"."fn_staff_has_role"('content_manager'::"text") OR "public"."fn_is_staff_manager"()));



CREATE POLICY "Staff manage action steps" ON "public"."staff_action_steps" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage ai configs" ON "public"."ai_agent_configs" USING ("public"."fn_is_active_staff_7b"());



CREATE POLICY "Staff manage ai copilot runs" ON "public"."ai_copilot_runs" USING ("public"."fn_is_active_staff_7b"());



CREATE POLICY "Staff manage allowed link domains" ON "public"."allowed_link_domains" TO "authenticated" USING ("public"."fn_is_active_staff_7b"()) WITH CHECK ("public"."fn_is_active_staff_7b"());



CREATE POLICY "Staff manage communications" ON "public"."communication_templates" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage comparisons" ON "public"."competitor_feature_comparisons" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage competitors" ON "public"."competitors" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage content" ON "public"."site_content_blocks" USING ("public"."fn_staff_has_role"('content_manager'::"text"));



CREATE POLICY "Staff manage customer discovery" ON "public"."customer_discovery_interviews" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage customer intel" ON "public"."customer_intelligence_events" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage customer segments" ON "public"."customer_segments" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage customer snapshots" ON "public"."customer_score_snapshots" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage data moat weekly metrics" ON "public"."data_moat_weekly_metrics" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage deals" ON "public"."findora_deals" USING ("public"."fn_staff_has_role"('deals_manager'::"text"));



CREATE POLICY "Staff manage experiments" ON "public"."company_experiments" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage inquiries" ON "public"."findora_deal_inquiries" USING ("public"."fn_staff_has_role"('deals_manager'::"text"));



CREATE POLICY "Staff manage kill list" ON "public"."kill_list_items" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage market health" ON "public"."market_health_indicators" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage merchant discovery" ON "public"."merchant_discovery_studies" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage merchant events" ON "public"."merchant_performance_events" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage merchant snapshots" ON "public"."merchant_score_snapshots" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage merchants" ON "public"."merchants" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage moats" ON "public"."platform_moats" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage news" ON "public"."homepage_announcements" USING (("public"."fn_staff_has_role"('news_manager'::"text") OR "public"."fn_staff_has_role"('content_manager'::"text")));



CREATE POLICY "Staff manage online quotes" ON "public"."online_merchant_quotes" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage outbound" ON "public"."outbound_messages" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage pillars" ON "public"."vision_pillars" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage pricing" ON "public"."service_pricing_versions" USING ("public"."fn_staff_has_role"('pricing_manager'::"text"));



CREATE POLICY "Staff manage project features" ON "public"."project_features" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage project phases" ON "public"."project_phases" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage sourcing sources" ON "public"."sourcing_sources" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage threats" ON "public"."moat_competitor_threats" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage timeline" ON "public"."vision_timeline" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff manage vision ideas" ON "public"."vision_future_ideas" USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff read audit" ON "public"."site_content_audit" FOR SELECT USING (("public"."fn_staff_has_role"('content_manager'::"text") OR "public"."fn_is_staff_manager"()));



CREATE POLICY "Staff read feedback" ON "public"."merchant_customer_feedback" FOR SELECT USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff read link attempt logs" ON "public"."link_attempt_logs" FOR SELECT TO "authenticated" USING ("public"."fn_is_active_staff_7b"());



CREATE POLICY "Staff read platform events" ON "public"."platform_events" FOR SELECT USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff read prefs" ON "public"."communication_preferences" FOR SELECT USING ("public"."fn_is_active_staff_4a"());



CREATE POLICY "Staff read pricing logs" ON "public"."pricing_event_logs" FOR SELECT USING ("public"."fn_staff_has_role"('pricing_manager'::"text"));



CREATE POLICY "Staff read/write ai usage logs" ON "public"."ai_usage_log" TO "authenticated" USING ("public"."fn_is_active_staff_7b"()) WITH CHECK ("public"."fn_is_active_staff_7b"());



CREATE POLICY "Transactions can be managed by admins and accountants" ON "public"."financial_transactions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff_member_roles" "r"
     JOIN "public"."staff_members" "s" ON (("s"."id" = "r"."staff_member_id")))
  WHERE (("s"."auth_user_id" = "auth"."uid"()) AND ("r"."role_code" = ANY (ARRAY['admin'::"text", 'accountant'::"text", 'owner'::"text", 'finance_manager'::"text"])) AND ("r"."is_active" = true)))));



CREATE POLICY "Users can ask questions" ON "public"."buyer_qa" TO "authenticated" USING (("asker_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1)));



CREATE POLICY "Users can manage their disputes" ON "public"."request_disputes" TO "authenticated" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1)));



CREATE POLICY "Users can manage their market insights" ON "public"."market_insights" TO "authenticated" USING (("contributor_id" = ( SELECT "contributors"."id"
   FROM "public"."contributors"
  WHERE ("contributors"."auth_user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Users can manage their price guarantees" ON "public"."price_guarantees" TO "authenticated" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1)));



CREATE POLICY "Users can manage their waitlists" ON "public"."product_waitlists" TO "authenticated" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1)));



CREATE POLICY "Users can view their own points ledger" ON "public"."customer_points_ledger" FOR SELECT TO "authenticated" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."email" = "auth"."email"())
 LIMIT 1)));



CREATE POLICY "Vendors can manage their own bids" ON "public"."vendor_bids" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."vendors" "v"
  WHERE (("v"."id" = "vendor_bids"."vendor_id") AND ("v"."portal_email" = "auth"."email"())))));



ALTER TABLE "public"."agent_job_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_job_logs staff read" ON "public"."agent_job_logs" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."agent_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_jobs staff read" ON "public"."agent_jobs" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."ai_agent_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_copilot_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alerts_own" ON "public"."price_alerts" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."allowed_link_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_read_active_specializations" ON "public"."specializations" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "anon_read_flywheel" ON "public"."flywheel_stages" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anon_submit_review_by_token" ON "public"."vendor_reviews" FOR UPDATE TO "anon" USING ((("review_token" IS NOT NULL) AND ("token_expires_at" > "now"())));



ALTER TABLE "public"."buyer_qa" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_experiments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitor_feature_comparisons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contributor_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_ads_performances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_discovery_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_fee_phases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_intelligence_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_points_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_score_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_subscriptions owner select" ON "public"."customer_subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_subscriptions"."customer_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_owner_select" ON "public"."customers" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "customers_owner_update" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."data_moat_weekly_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flags_audit_insert_admin" ON "public"."feature_flags_audit" FOR INSERT TO "authenticated" WITH CHECK (("public"."fn_staff_has_role"('admin'::"text") OR "public"."fn_staff_has_role"('owner'::"text") OR "public"."fn_staff_has_role"('ai_manager'::"text")));



CREATE POLICY "feature_flags_audit_select_admin" ON "public"."feature_flags_audit" FOR SELECT TO "authenticated" USING (("public"."fn_staff_has_role"('admin'::"text") OR "public"."fn_staff_has_role"('owner'::"text") OR "public"."fn_staff_has_role"('ai_manager'::"text")));



CREATE POLICY "feature_flags_select_public" ON "public"."feature_flags" FOR SELECT USING (true);



CREATE POLICY "feature_flags_update_admin" ON "public"."feature_flags" FOR UPDATE TO "authenticated" USING (("public"."fn_staff_has_role"('admin'::"text") OR "public"."fn_staff_has_role"('owner'::"text") OR "public"."fn_staff_has_role"('ai_manager'::"text"))) WITH CHECK (("public"."fn_staff_has_role"('admin'::"text") OR "public"."fn_staff_has_role"('owner'::"text") OR "public"."fn_staff_has_role"('ai_manager'::"text")));



ALTER TABLE "public"."financial_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."findora_deal_inquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."findora_deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flywheel_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founder_accountability_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founder_weekly_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_content_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homepage_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_queue_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_queue_rules staff read" ON "public"."job_queue_rules" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."kill_list_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."link_attempt_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_health_indicators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchant_customer_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchant_discovery_studies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchant_performance_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchant_quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "merchant_quotes staff read" ON "public"."merchant_quotes" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."merchant_score_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moat_competitor_threats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."north_star_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."north_star_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_sourcing_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offline_sourcing_tasks staff read" ON "public"."offline_sourcing_tasks" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."online_merchant_quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outbound_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_points_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_intents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments_legacy_archive" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_moats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_guarantees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "price_history_read" ON "public"."price_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "price_history_staff_insert" ON "public"."price_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE (("staff_members"."auth_user_id" = "auth"."uid"()) AND ("staff_members"."is_active" = true)))));



ALTER TABLE "public"."price_trends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "price_trends_read" ON "public"."price_trends" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pricing_event_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_waitlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_public_read" ON "public"."products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "products_staff_all" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."staff_members"
  WHERE (("staff_members"."auth_user_id" = "auth"."uid"()) AND ("staff_members"."is_active" = true)))));



ALTER TABLE "public"."project_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_phases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_active_vendors" ON "public"."vendors" FOR SELECT TO "authenticated", "anon" USING (("system_status" = 'Active'::"text"));



ALTER TABLE "public"."referral_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_option_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_option_snapshots owner select" ON "public"."report_option_snapshots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "report_option_snapshots"."request_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."report_option_unlocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_option_unlocks owner select" ON "public"."report_option_unlocks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "report_option_unlocks"."customer_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_candidate_shortlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_candidate_shortlists staff read" ON "public"."request_candidate_shortlists" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."request_delete_backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_deletion_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_operational_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_operational_states staff read" ON "public"."request_operational_states" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."request_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_preferences owner delete" ON "public"."request_preferences" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "request_preferences"."request_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "request_preferences owner insert" ON "public"."request_preferences" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "request_preferences"."request_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "request_preferences owner select" ON "public"."request_preferences" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "request_preferences"."request_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "request_preferences owner update" ON "public"."request_preferences" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "request_preferences"."request_id") AND ("c"."auth_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."customers" "c" ON (("c"."id" = "r"."customer_id")))
  WHERE (("r"."id" = "request_preferences"."request_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."request_qualification_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_qualification_reviews staff read" ON "public"."request_qualification_reviews" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."request_workflow_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_workflow_events staff read" ON "public"."request_workflow_events" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_owner_select" ON "public"."requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "requests"."customer_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "requests_select_only_active_rows" ON "public"."requests" FOR SELECT USING (("archived_at" IS NULL));



ALTER TABLE "public"."research_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "research_items staff read" ON "public"."research_items" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."research_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "research_runs staff read" ON "public"."research_runs" FOR SELECT TO "authenticated" USING ("public"."fn_is_staff"("auth"."uid"()));



ALTER TABLE "public"."service_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_pricing_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_flywheel" ON "public"."flywheel_stages" TO "service_role" USING (true);



CREATE POLICY "service_role_specializations" ON "public"."specializations" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_audit" ON "public"."vendor_audit_log" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_auto_logs" ON "public"."vendor_automation_logs" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_cats" ON "public"."vendor_categories" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_portal_tokens" ON "public"."vendor_portal_tokens" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_reviews" ON "public"."vendor_reviews" TO "service_role" USING (true);



CREATE POLICY "service_role_vendor_sys_msgs" ON "public"."vendor_system_messages" TO "service_role" USING (true);



CREATE POLICY "service_role_vendors" ON "public"."vendors" TO "service_role" USING (true);



ALTER TABLE "public"."site_content_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_content_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_reveals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sourcing_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specializations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_action_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_hr_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_members self select" ON "public"."staff_members" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "public"."fn_is_staff"("auth"."uid"())));



ALTER TABLE "public"."staff_performance_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_plans active read" ON "public"."subscription_plans" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."usage_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usage_events owner select" ON "public"."usage_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "usage_events"."customer_id") AND ("c"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_watchlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_automation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_fee_phases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_portal_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_profile_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_system_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendors_self_read_update" ON "public"."vendors" TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."vision_future_ideas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vision_pillars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vision_timeline" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "watchlists_own" ON "public"."user_watchlists" USING (("customer_id" = ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."workflow_runs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip" character varying, "p_endpoint" character varying, "p_limit" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip" character varying, "p_endpoint" character varying, "p_limit" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip" character varying, "p_endpoint" character varying, "p_limit" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."classify_trend"("pct_change" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."classify_trend"("pct_change" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_trend"("pct_change" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_all_price_trends"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_all_price_trends"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_all_price_trends"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_product_trend"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_product_trend"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_product_trend"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_trend_score"("current_price" numeric, "lowest_price" numeric, "highest_price" numeric, "pct_30d" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_trend_score"("current_price" numeric, "lowest_price" numeric, "highest_price" numeric, "pct_30d" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_trend_score"("current_price" numeric, "lowest_price" numeric, "highest_price" numeric, "pct_30d" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_approve_report"("p_report_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_approve_report"("p_report_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_approve_report"("p_report_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_archive_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_archive_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_archive_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_cancel_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_cancel_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_cancel_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_restore_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_restore_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_restore_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_set_customer_phone_verification"("p_customer_id" "uuid", "p_actor_staff_id" "uuid", "p_verified" boolean, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_set_customer_phone_verification"("p_customer_id" "uuid", "p_actor_staff_id" "uuid", "p_verified" boolean, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_set_customer_phone_verification"("p_customer_id" "uuid", "p_actor_staff_id" "uuid", "p_verified" boolean, "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_soft_delete_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_soft_delete_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_soft_delete_request"("p_request_id" "uuid", "p_reason" "text", "p_actor_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_unlock_report_option"("p_report_option_snapshot_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_apply_request_compliance_decision"("p_request_id" "uuid", "p_decision" "text", "p_reason" "text", "p_summary" "text", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_apply_request_compliance_decision"("p_request_id" "uuid", "p_decision" "text", "p_reason" "text", "p_summary" "text", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_apply_request_compliance_decision"("p_request_id" "uuid", "p_decision" "text", "p_reason" "text", "p_summary" "text", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_archive_request"("p_request_id" "uuid", "p_actor_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_archive_request"("p_request_id" "uuid", "p_actor_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_archive_request"("p_request_id" "uuid", "p_actor_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_assign_staff_member"("p_email" "text", "p_full_name" "text", "p_staff_role" "text", "p_team_code" "text", "p_is_active" boolean, "p_can_approve_requests" boolean, "p_can_manage_merchants" boolean, "p_can_view_financials" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_assign_staff_member"("p_email" "text", "p_full_name" "text", "p_staff_role" "text", "p_team_code" "text", "p_is_active" boolean, "p_can_approve_requests" boolean, "p_can_manage_merchants" boolean, "p_can_view_financials" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_assign_staff_member"("p_email" "text", "p_full_name" "text", "p_staff_role" "text", "p_team_code" "text", "p_is_active" boolean, "p_can_approve_requests" boolean, "p_can_manage_merchants" boolean, "p_can_view_financials" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_block_column_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_block_column_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_block_column_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_block_protected_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_block_protected_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_block_protected_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_block_protected_truncate"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_block_protected_truncate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_block_protected_truncate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_can_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_can_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_can_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_claim_agent_job"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_agent_job"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_complete_research_run"("p_research_run_id" "uuid", "p_status" "text", "p_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_research_run"("p_research_run_id" "uuid", "p_status" "text", "p_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_research_run"("p_research_run_id" "uuid", "p_status" "text", "p_summary" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_compute_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_compute_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_compute_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_contributors_auto_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_contributors_auto_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_contributors_auto_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_count_active_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_count_active_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_count_active_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_create_research_run"("p_request_id" "uuid", "p_job_id" "uuid", "p_run_kind" "text", "p_status" "text", "p_search_scope" "text", "p_query_text" "text", "p_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_research_run"("p_request_id" "uuid", "p_job_id" "uuid", "p_run_kind" "text", "p_status" "text", "p_search_scope" "text", "p_query_text" "text", "p_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_research_run"("p_request_id" "uuid", "p_job_id" "uuid", "p_run_kind" "text", "p_status" "text", "p_search_scope" "text", "p_query_text" "text", "p_summary" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_create_sourcing_request"("p_request_id" "uuid", "p_customer_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_product_name" "text", "p_category" "text", "p_target_location" "text", "p_max_price" numeric, "p_additional_notes" "text", "p_request_code" "text", "p_title" "text", "p_raw_description" "text", "p_status" "text", "p_channel" "text", "p_request_kind" "text", "p_intake_mode" "text", "p_pricing_decision" "text", "p_service_fee_amount" numeric, "p_execution_requested" boolean, "p_followup_requested" boolean, "p_site_visit_requested" boolean, "p_reference_image_path" "text", "p_preferences" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_sourcing_request"("p_request_id" "uuid", "p_customer_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_product_name" "text", "p_category" "text", "p_target_location" "text", "p_max_price" numeric, "p_additional_notes" "text", "p_request_code" "text", "p_title" "text", "p_raw_description" "text", "p_status" "text", "p_channel" "text", "p_request_kind" "text", "p_intake_mode" "text", "p_pricing_decision" "text", "p_service_fee_amount" numeric, "p_execution_requested" boolean, "p_followup_requested" boolean, "p_site_visit_requested" boolean, "p_reference_image_path" "text", "p_preferences" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_sourcing_request"("p_request_id" "uuid", "p_customer_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_product_name" "text", "p_category" "text", "p_target_location" "text", "p_max_price" numeric, "p_additional_notes" "text", "p_request_code" "text", "p_title" "text", "p_raw_description" "text", "p_status" "text", "p_channel" "text", "p_request_kind" "text", "p_intake_mode" "text", "p_pricing_decision" "text", "p_service_fee_amount" numeric, "p_execution_requested" boolean, "p_followup_requested" boolean, "p_site_visit_requested" boolean, "p_reference_image_path" "text", "p_preferences" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_customer_reveal_allowance"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_distribute_network_revenue"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_distribute_network_revenue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_distribute_network_revenue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ensure_default_request_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ensure_default_request_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ensure_default_request_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ensure_request_operational_state"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_evaluate_request_compliance_from_hits"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_evaluate_request_compliance_from_hits"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_evaluate_request_compliance_from_hits"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_action_source" "text", "p_apply_to_request" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_execute_request_transition"("p_transition_name" "text", "p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_execute_request_transition"("p_transition_name" "text", "p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_execute_request_transition"("p_transition_name" "text", "p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fail_agent_job"("p_job_id" "uuid", "p_error_message" "text", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_generate_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_generate_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_financial_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_financial_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_financial_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_stabilizer_multiplier"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_stabilizer_multiplier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_stabilizer_multiplier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_guard_ai_agent_configs_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_guard_ai_agent_configs_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_guard_ai_agent_configs_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_guard_comm_templates_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_guard_comm_templates_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_guard_comm_templates_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_guard_staff_members_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_guard_staff_members_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_guard_staff_members_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_guest_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_normalized" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_guest_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_normalized" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_guest_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_normalized" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_handle_request_job_handoff"("p_job_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_hard_delete_request_with_backup"("p_request_id" "uuid", "p_backup_id" "uuid", "p_actor_staff_id" "uuid", "p_delete_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_init_contributor_wallet"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_init_contributor_wallet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_init_contributor_wallet"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_insert_research_item"("p_request_id" "uuid", "p_research_run_id" "uuid", "p_option_label" "text", "p_source_name" "text", "p_source_type" "text", "p_listing_url" "text", "p_product_title" "text", "p_product_brand" "text", "p_product_model" "text", "p_product_specs_summary" "text", "p_price_amount" numeric, "p_currency_code" "text", "p_availability_status" "text", "p_seller_name" "text", "p_seller_location" "text", "p_warranty_info" "text", "p_price_last_checked_at" timestamp with time zone, "p_price_change_note" "text", "p_trust_score" numeric, "p_value_score" numeric, "p_fit_score" numeric, "p_final_score" numeric, "p_is_candidate" boolean, "p_is_shortlisted" boolean, "p_raw_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_insert_research_item"("p_request_id" "uuid", "p_research_run_id" "uuid", "p_option_label" "text", "p_source_name" "text", "p_source_type" "text", "p_listing_url" "text", "p_product_title" "text", "p_product_brand" "text", "p_product_model" "text", "p_product_specs_summary" "text", "p_price_amount" numeric, "p_currency_code" "text", "p_availability_status" "text", "p_seller_name" "text", "p_seller_location" "text", "p_warranty_info" "text", "p_price_last_checked_at" timestamp with time zone, "p_price_change_note" "text", "p_trust_score" numeric, "p_value_score" numeric, "p_fit_score" numeric, "p_final_score" numeric, "p_is_candidate" boolean, "p_is_shortlisted" boolean, "p_raw_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_insert_research_item"("p_request_id" "uuid", "p_research_run_id" "uuid", "p_option_label" "text", "p_source_name" "text", "p_source_type" "text", "p_listing_url" "text", "p_product_title" "text", "p_product_brand" "text", "p_product_model" "text", "p_product_specs_summary" "text", "p_price_amount" numeric, "p_currency_code" "text", "p_availability_status" "text", "p_seller_name" "text", "p_seller_location" "text", "p_warranty_info" "text", "p_price_last_checked_at" timestamp with time zone, "p_price_change_note" "text", "p_trust_score" numeric, "p_value_score" numeric, "p_fit_score" numeric, "p_final_score" numeric, "p_is_candidate" boolean, "p_is_shortlisted" boolean, "p_raw_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_active_staff_4a"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_active_staff_4a"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_active_staff_4a"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_active_staff_7b"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_active_staff_7b"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_active_staff_7b"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_contributor_hr"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_contributor_hr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_contributor_hr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_staff"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_staff"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_staff"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_staff_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_staff_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_staff_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_link_referral"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_link_referral"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_link_referral"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lock_and_insert_transaction"("p_contributor_id" "uuid", "p_wallet_id" "uuid", "p_tx_type" "text", "p_amount_egp" numeric, "p_amount_points" integer, "p_reference_type" "text", "p_reference_id" "uuid", "p_description_en" "text", "p_description_ar" "text", "p_metadata" "jsonb", "p_idempotency_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lock_and_insert_transaction"("p_contributor_id" "uuid", "p_wallet_id" "uuid", "p_tx_type" "text", "p_amount_egp" numeric, "p_amount_points" integer, "p_reference_type" "text", "p_reference_id" "uuid", "p_description_en" "text", "p_description_ar" "text", "p_metadata" "jsonb", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lock_and_insert_transaction"("p_contributor_id" "uuid", "p_wallet_id" "uuid", "p_tx_type" "text", "p_amount_egp" numeric, "p_amount_points" integer, "p_reference_type" "text", "p_reference_id" "uuid", "p_description_en" "text", "p_description_ar" "text", "p_metadata" "jsonb", "p_idempotency_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_log_request_compliance_hit"("p_request_id" "uuid", "p_rule_code" "text", "p_matched_keyword" "text", "p_matched_excerpt" "text", "p_match_source" "text", "p_language_code" "text", "p_confidence_score" numeric, "p_notes" "text", "p_actor_staff_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_request_compliance_hit"("p_request_id" "uuid", "p_rule_code" "text", "p_matched_keyword" "text", "p_matched_excerpt" "text", "p_match_source" "text", "p_language_code" "text", "p_confidence_score" numeric, "p_notes" "text", "p_actor_staff_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_request_compliance_hit"("p_request_id" "uuid", "p_rule_code" "text", "p_matched_keyword" "text", "p_matched_excerpt" "text", "p_match_source" "text", "p_language_code" "text", "p_confidence_score" numeric, "p_notes" "text", "p_actor_staff_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_log_request_customer_message"("p_request_id" "uuid", "p_report_id" "uuid", "p_message_type" "text", "p_language_code" "text", "p_subject_text" "text", "p_body_text" "text", "p_delivery_channel" "text", "p_delivery_status" "text", "p_created_by_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_request_customer_message"("p_request_id" "uuid", "p_report_id" "uuid", "p_message_type" "text", "p_language_code" "text", "p_subject_text" "text", "p_body_text" "text", "p_delivery_channel" "text", "p_delivery_status" "text", "p_created_by_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_request_customer_message"("p_request_id" "uuid", "p_report_id" "uuid", "p_message_type" "text", "p_language_code" "text", "p_subject_text" "text", "p_body_text" "text", "p_delivery_channel" "text", "p_delivery_status" "text", "p_created_by_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mark_agent_job_waiting_approval"("p_job_id" "uuid", "p_output_payload" "jsonb", "p_output_summary" "text", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_phone_eg"("p_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_phone_eg"("p_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_phone_eg"("p_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_on_product_price_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_on_product_price_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_on_product_price_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_operational_states_canonical_state_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_operational_states_canonical_state_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_operational_states_canonical_state_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_prepare_request_client_bundle"("p_request_id" "uuid", "p_report_id" "uuid", "p_max_options" integer, "p_note" "text", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_prepare_snapshots_from_shortlist"("p_request_id" "uuid", "p_snapshot_kind" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_prepare_snapshots_from_shortlist"("p_request_id" "uuid", "p_snapshot_kind" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_prepare_snapshots_from_shortlist"("p_request_id" "uuid", "p_snapshot_kind" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_pricing_lifecycle_state_machine"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pricing_lifecycle_state_machine"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pricing_lifecycle_state_machine"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_process_referral_reward"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_process_referral_reward"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_process_referral_reward"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_process_wallet_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_process_wallet_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_process_wallet_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_publish_request_shortlist_to_offers"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_rate_merchant"("p_merchant_id" "uuid", "p_request_id" "uuid", "p_overall_score" numeric, "p_reliability_score" numeric, "p_quality_score" numeric, "p_price_competitiveness_score" numeric, "p_service_score" numeric, "p_note" "text", "p_actor_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rate_merchant"("p_merchant_id" "uuid", "p_request_id" "uuid", "p_overall_score" numeric, "p_reliability_score" numeric, "p_quality_score" numeric, "p_price_competitiveness_score" numeric, "p_service_score" numeric, "p_note" "text", "p_actor_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rate_merchant"("p_merchant_id" "uuid", "p_request_id" "uuid", "p_overall_score" numeric, "p_reliability_score" numeric, "p_quality_score" numeric, "p_price_competitiveness_score" numeric, "p_service_score" numeric, "p_note" "text", "p_actor_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_refresh_vendor_trust_from_reviews"("p_vendor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_refresh_vendor_trust_from_reviews"("p_vendor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_refresh_vendor_trust_from_reviews"("p_vendor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text", "p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text", "p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_register_vendor"("p_business_name_ar" "text", "p_business_name_en" "text", "p_merchant_type" "text", "p_category" "text", "p_governorate" "text", "p_city" "text", "p_area" "text", "p_address" "text", "p_primary_phone" "text", "p_secondary_phone" "text", "p_email" "text", "p_website" "text", "p_notes" "text", "p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer"("p_request_id" "uuid", "p_note" "text", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer_by_staff"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer_by_staff"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_release_request_to_customer_by_staff"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_requests_canonical_state_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_requests_canonical_state_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_requests_canonical_state_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_resolve_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_resolve_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_resolve_canonical_state"("p_is_archived" boolean, "p_current_status" "text", "p_reviewer_decision" "text", "p_client_released_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_restore_request"("p_request_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_restore_request"("p_request_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_restore_request"("p_request_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_review_request"("p_request_id" "uuid", "p_decision" "text", "p_note" "text", "p_actor_staff_id" "uuid", "p_intake_ai_decision" "text", "p_intake_ai_confidence" numeric, "p_intake_reason_code" "text", "p_intake_summary" "text", "p_intake_internal_reasoning" "text", "p_intake_clarification_questions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_review_request"("p_request_id" "uuid", "p_decision" "text", "p_note" "text", "p_actor_staff_id" "uuid", "p_intake_ai_decision" "text", "p_intake_ai_confidence" numeric, "p_intake_reason_code" "text", "p_intake_summary" "text", "p_intake_internal_reasoning" "text", "p_intake_clarification_questions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_review_request"("p_request_id" "uuid", "p_decision" "text", "p_note" "text", "p_actor_staff_id" "uuid", "p_intake_ai_decision" "text", "p_intake_ai_confidence" numeric, "p_intake_reason_code" "text", "p_intake_summary" "text", "p_intake_internal_reasoning" "text", "p_intake_clarification_questions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_run_economy_stabilizer"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_run_economy_stabilizer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_run_economy_stabilizer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_save_merchant_from_research_item"("p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_save_merchant_from_research_item"("p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_save_merchant_from_research_item"("p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text", "p_actor_user_id" "uuid", "p_needs_manual_review" boolean, "p_approved_for_processing" boolean, "p_report_ready" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text", "p_actor_user_id" "uuid", "p_needs_manual_review" boolean, "p_approved_for_processing" boolean, "p_report_ready" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_request_operational_stage"("p_request_id" "uuid", "p_operational_stage" "text", "p_stage_status" "text", "p_note" "text", "p_actor_user_id" "uuid", "p_needs_manual_review" boolean, "p_approved_for_processing" boolean, "p_report_ready" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_shortlist_research_item"("p_request_id" "uuid", "p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_ranking_position" integer, "p_reason_summary" "text", "p_customer_summary" "text", "p_is_recommended" boolean, "p_reveal_locked" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_shortlist_research_item"("p_request_id" "uuid", "p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_ranking_position" integer, "p_reason_summary" "text", "p_customer_summary" "text", "p_is_recommended" boolean, "p_reveal_locked" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_shortlist_research_item"("p_request_id" "uuid", "p_research_item_id" "uuid", "p_actor_staff_id" "uuid", "p_ranking_position" integer, "p_reason_summary" "text", "p_customer_summary" "text", "p_is_recommended" boolean, "p_reveal_locked" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_single_active_pricing_rule_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_soft_delete_pricing"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_soft_delete_pricing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_soft_delete_pricing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_specializations_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_specializations_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_specializations_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_staff_has_role"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_staff_has_role"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_staff_has_role"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_staff_role"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_staff_role"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_staff_role"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_staff_team"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_staff_team"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_staff_team"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_start_request_processing_after_approval"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text", "p_force" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_start_request_processing_after_approval"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text", "p_force" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_start_request_processing_after_approval"("p_request_id" "uuid", "p_actor_staff_id" "uuid", "p_note" "text", "p_force" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text", "p_force" boolean, "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text", "p_force" boolean, "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_submit_request_for_processing"("p_request_id" "uuid", "p_note" "text", "p_force" boolean, "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_customer_contacts_from_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_customer_contacts_from_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_customer_contacts_from_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_customer_phone_verified"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_customer_phone_verified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_customer_phone_verified"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_merchant_contacts_from_merchant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_merchant_source_links_from_merchant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_pricing_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_pricing_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_pricing_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_report_option_snapshots"("p_report_id" "uuid", "p_max_options" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_request_current_status"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_request_current_status"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_request_current_status"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_request_status_to_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_request_status_to_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_request_status_to_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_track_request_by_code_and_phone"("p_request_code" "text", "p_phone_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_unlock_report_option"("p_report_option_snapshot_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_update_contributor_trust_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_contributor_trust_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_contributor_trust_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_vendor_activate"("p_vendor_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_vendor_activate"("p_vendor_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_vendor_activate"("p_vendor_id" "uuid", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_vendor_adjust_trust"("p_vendor_id" "uuid", "p_delta" integer, "p_actor_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_vendor_adjust_trust"("p_vendor_id" "uuid", "p_delta" integer, "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_vendor_adjust_trust"("p_vendor_id" "uuid", "p_delta" integer, "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_vendor_suspend"("p_vendor_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_vendor_suspend"("p_vendor_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_vendor_suspend"("p_vendor_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_vendors_calc_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_vendors_calc_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_vendors_calc_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_vendors_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_vendors_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_vendors_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_wallet_reconciliation_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_wallet_reconciliation_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_wallet_reconciliation_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agent_job_logs" TO "anon";
GRANT ALL ON TABLE "public"."agent_job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_job_logs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_jobs" TO "anon";
GRANT ALL ON TABLE "public"."agent_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_agent_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_configs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_copilot_runs" TO "anon";
GRANT ALL ON TABLE "public"."ai_copilot_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_copilot_runs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_response_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_response_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_response_cache" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";



GRANT ALL ON TABLE "public"."alert_events" TO "anon";
GRANT ALL ON TABLE "public"."alert_events" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_events" TO "service_role";



GRANT ALL ON TABLE "public"."allowed_link_domains" TO "anon";
GRANT ALL ON TABLE "public"."allowed_link_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."allowed_link_domains" TO "service_role";



GRANT ALL ON TABLE "public"."approvals" TO "anon";
GRANT ALL ON TABLE "public"."approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."approvals" TO "service_role";



GRANT ALL ON TABLE "public"."bonus_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."bonus_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."bonus_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."buyer_qa" TO "anon";
GRANT ALL ON TABLE "public"."buyer_qa" TO "authenticated";
GRANT ALL ON TABLE "public"."buyer_qa" TO "service_role";



GRANT ALL ON TABLE "public"."communication_preferences" TO "anon";
GRANT ALL ON TABLE "public"."communication_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."communication_templates" TO "anon";
GRANT ALL ON TABLE "public"."communication_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_templates" TO "service_role";



GRANT ALL ON TABLE "public"."company_experiments" TO "anon";
GRANT ALL ON TABLE "public"."company_experiments" TO "authenticated";
GRANT ALL ON TABLE "public"."company_experiments" TO "service_role";



GRANT ALL ON TABLE "public"."competitor_feature_comparisons" TO "anon";
GRANT ALL ON TABLE "public"."competitor_feature_comparisons" TO "authenticated";
GRANT ALL ON TABLE "public"."competitor_feature_comparisons" TO "service_role";



GRANT ALL ON TABLE "public"."competitors" TO "anon";
GRANT ALL ON TABLE "public"."competitors" TO "authenticated";
GRANT ALL ON TABLE "public"."competitors" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_rules" TO "anon";
GRANT ALL ON TABLE "public"."compliance_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_rules" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_alerts" TO "anon";
GRANT ALL ON TABLE "public"."contributor_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_badges" TO "anon";
GRANT ALL ON TABLE "public"."contributor_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_badges" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_device_fingerprints" TO "anon";
GRANT ALL ON TABLE "public"."contributor_device_fingerprints" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_device_fingerprints" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_hr_reviews" TO "anon";
GRANT ALL ON TABLE "public"."contributor_hr_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_hr_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_levels" TO "anon";
GRANT ALL ON TABLE "public"."contributor_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_levels" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_notifications" TO "anon";
GRANT ALL ON TABLE "public"."contributor_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_referrals" TO "anon";
GRANT ALL ON TABLE "public"."contributor_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_reviews" TO "anon";
GRANT ALL ON TABLE "public"."contributor_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_risk_scores" TO "anon";
GRANT ALL ON TABLE "public"."contributor_risk_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_risk_scores" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_scarcity_limits" TO "anon";
GRANT ALL ON TABLE "public"."contributor_scarcity_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_scarcity_limits" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_streaks" TO "anon";
GRANT ALL ON TABLE "public"."contributor_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_submissions" TO "anon";
GRANT ALL ON TABLE "public"."contributor_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_verification_requests" TO "anon";
GRANT ALL ON TABLE "public"."contributor_verification_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_verification_requests" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_wallets" TO "anon";
GRANT ALL ON TABLE "public"."contributor_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."contributor_withdrawals" TO "anon";
GRANT ALL ON TABLE "public"."contributor_withdrawals" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_withdrawals" TO "service_role";



GRANT ALL ON TABLE "public"."contributors" TO "anon";
GRANT ALL ON TABLE "public"."contributors" TO "authenticated";
GRANT ALL ON TABLE "public"."contributors" TO "service_role";



GRANT ALL ON TABLE "public"."crm_ads_performances" TO "anon";
GRANT ALL ON TABLE "public"."crm_ads_performances" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_ads_performances" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_discovery_interviews" TO "anon";
GRANT ALL ON TABLE "public"."customer_discovery_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_discovery_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."customer_disputes" TO "anon";
GRANT ALL ON TABLE "public"."customer_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."customer_fee_phases" TO "anon";
GRANT ALL ON TABLE "public"."customer_fee_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_fee_phases" TO "service_role";



GRANT ALL ON TABLE "public"."customer_intelligence_events" TO "anon";
GRANT ALL ON TABLE "public"."customer_intelligence_events" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_intelligence_events" TO "service_role";



GRANT ALL ON TABLE "public"."customer_points_ledger" TO "anon";
GRANT ALL ON TABLE "public"."customer_points_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_points_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."customer_reliability_stats" TO "anon";
GRANT ALL ON TABLE "public"."customer_reliability_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_reliability_stats" TO "service_role";



GRANT ALL ON TABLE "public"."customer_requests" TO "anon";
GRANT ALL ON TABLE "public"."customer_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_requests" TO "service_role";



GRANT ALL ON TABLE "public"."customer_score_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."customer_score_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_score_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."customer_segments" TO "anon";
GRANT ALL ON TABLE "public"."customer_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_segments" TO "service_role";



GRANT ALL ON TABLE "public"."customer_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."customer_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."customer_verification_events" TO "anon";
GRANT ALL ON TABLE "public"."customer_verification_events" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_verification_events" TO "service_role";



GRANT ALL ON TABLE "public"."data_moat_weekly_metrics" TO "anon";
GRANT ALL ON TABLE "public"."data_moat_weekly_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."data_moat_weekly_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."economy_config" TO "anon";
GRANT ALL ON TABLE "public"."economy_config" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_config" TO "service_role";



GRANT ALL ON TABLE "public"."economy_stabilizer_events" TO "anon";
GRANT ALL ON TABLE "public"."economy_stabilizer_events" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_stabilizer_events" TO "service_role";



GRANT ALL ON TABLE "public"."economy_stabilizer_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."economy_stabilizer_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_stabilizer_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags_audit" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags_audit" TO "service_role";



GRANT ALL ON TABLE "public"."financial_categories" TO "anon";
GRANT ALL ON TABLE "public"."financial_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_categories" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transactions" TO "anon";
GRANT ALL ON TABLE "public"."financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."findora_deal_inquiries" TO "anon";
GRANT ALL ON TABLE "public"."findora_deal_inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."findora_deal_inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."findora_deals" TO "anon";
GRANT ALL ON TABLE "public"."findora_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."findora_deals" TO "service_role";



GRANT ALL ON TABLE "public"."flywheel_stages" TO "anon";
GRANT ALL ON TABLE "public"."flywheel_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."flywheel_stages" TO "service_role";



GRANT ALL ON TABLE "public"."founder_accountability_items" TO "anon";
GRANT ALL ON TABLE "public"."founder_accountability_items" TO "authenticated";
GRANT ALL ON TABLE "public"."founder_accountability_items" TO "service_role";



GRANT ALL ON TABLE "public"."founder_weekly_logs" TO "anon";
GRANT ALL ON TABLE "public"."founder_weekly_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."founder_weekly_logs" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_alerts" TO "anon";
GRANT ALL ON TABLE "public"."fraud_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."fraud_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."group_buying_members" TO "anon";
GRANT ALL ON TABLE "public"."group_buying_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_buying_members" TO "service_role";



GRANT ALL ON TABLE "public"."group_buying_pools" TO "anon";
GRANT ALL ON TABLE "public"."group_buying_pools" TO "authenticated";
GRANT ALL ON TABLE "public"."group_buying_pools" TO "service_role";



GRANT ALL ON TABLE "public"."growth_channels" TO "anon";
GRANT ALL ON TABLE "public"."growth_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_channels" TO "service_role";



GRANT ALL ON TABLE "public"."growth_content_plan" TO "anon";
GRANT ALL ON TABLE "public"."growth_content_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_content_plan" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_announcements" TO "anon";
GRANT ALL ON TABLE "public"."homepage_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."internal_notes" TO "anon";
GRANT ALL ON TABLE "public"."internal_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."internal_notes" TO "service_role";



GRANT ALL ON TABLE "public"."investor_metrics_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."investor_metrics_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_metrics_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."job_queue_rules" TO "anon";
GRANT ALL ON TABLE "public"."job_queue_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."job_queue_rules" TO "service_role";



GRANT ALL ON TABLE "public"."kill_list_items" TO "anon";
GRANT ALL ON TABLE "public"."kill_list_items" TO "authenticated";
GRANT ALL ON TABLE "public"."kill_list_items" TO "service_role";



GRANT ALL ON TABLE "public"."link_attempt_logs" TO "anon";
GRANT ALL ON TABLE "public"."link_attempt_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."link_attempt_logs" TO "service_role";



GRANT ALL ON TABLE "public"."market_health_indicators" TO "anon";
GRANT ALL ON TABLE "public"."market_health_indicators" TO "authenticated";
GRANT ALL ON TABLE "public"."market_health_indicators" TO "service_role";



GRANT ALL ON TABLE "public"."market_insights" TO "anon";
GRANT ALL ON TABLE "public"."market_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."market_insights" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_deals" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_deals" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_products" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_products" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_products" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_categories" TO "anon";
GRANT ALL ON TABLE "public"."merchant_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_categories" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_category_map" TO "anon";
GRANT ALL ON TABLE "public"."merchant_category_map" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_category_map" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_contacts" TO "anon";
GRANT ALL ON TABLE "public"."merchant_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_customer_feedback" TO "anon";
GRANT ALL ON TABLE "public"."merchant_customer_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_customer_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_discovery_studies" TO "anon";
GRANT ALL ON TABLE "public"."merchant_discovery_studies" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_discovery_studies" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."merchant_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_offers_legacy_archive" TO "anon";
GRANT ALL ON TABLE "public"."merchant_offers_legacy_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_offers_legacy_archive" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_performance_events" TO "anon";
GRANT ALL ON TABLE "public"."merchant_performance_events" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_performance_events" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_profiles_legacy_archive" TO "anon";
GRANT ALL ON TABLE "public"."merchant_profiles_legacy_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_profiles_legacy_archive" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_quotes" TO "anon";
GRANT ALL ON TABLE "public"."merchant_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_score_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."merchant_score_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_score_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_service_areas" TO "anon";
GRANT ALL ON TABLE "public"."merchant_service_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_service_areas" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_source_links" TO "anon";
GRANT ALL ON TABLE "public"."merchant_source_links" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_source_links" TO "service_role";



GRANT ALL ON TABLE "public"."merchants" TO "anon";
GRANT ALL ON TABLE "public"."merchants" TO "authenticated";
GRANT ALL ON TABLE "public"."merchants" TO "service_role";



GRANT ALL ON TABLE "public"."moat_competitor_threats" TO "anon";
GRANT ALL ON TABLE "public"."moat_competitor_threats" TO "authenticated";
GRANT ALL ON TABLE "public"."moat_competitor_threats" TO "service_role";



GRANT ALL ON TABLE "public"."north_star_config" TO "anon";
GRANT ALL ON TABLE "public"."north_star_config" TO "authenticated";
GRANT ALL ON TABLE "public"."north_star_config" TO "service_role";



GRANT ALL ON TABLE "public"."north_star_goals" TO "anon";
GRANT ALL ON TABLE "public"."north_star_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."north_star_goals" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."offline_sourcing_tasks" TO "anon";
GRANT ALL ON TABLE "public"."offline_sourcing_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."offline_sourcing_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."online_merchant_quotes" TO "anon";
GRANT ALL ON TABLE "public"."online_merchant_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."online_merchant_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."outbound_messages" TO "anon";
GRANT ALL ON TABLE "public"."outbound_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."outbound_messages" TO "service_role";



GRANT ALL ON TABLE "public"."page_content" TO "anon";
GRANT ALL ON TABLE "public"."page_content" TO "authenticated";
GRANT ALL ON TABLE "public"."page_content" TO "service_role";



GRANT ALL ON TABLE "public"."partner_points_ledger" TO "anon";
GRANT ALL ON TABLE "public"."partner_points_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_points_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."payment_audit_events" TO "anon";
GRANT ALL ON TABLE "public"."payment_audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_audit_events" TO "service_role";



GRANT ALL ON TABLE "public"."payment_intents" TO "anon";
GRANT ALL ON TABLE "public"."payment_intents" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_intents" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."payments_legacy_archive" TO "anon";
GRANT ALL ON TABLE "public"."payments_legacy_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."payments_legacy_archive" TO "service_role";



GRANT ALL ON TABLE "public"."phone_otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."phone_otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."platform_events" TO "anon";
GRANT ALL ON TABLE "public"."platform_events" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_events" TO "service_role";



GRANT ALL ON TABLE "public"."platform_moats" TO "anon";
GRANT ALL ON TABLE "public"."platform_moats" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_moats" TO "service_role";



GRANT ALL ON TABLE "public"."platform_tasks" TO "anon";
GRANT ALL ON TABLE "public"."platform_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."price_alerts" TO "anon";
GRANT ALL ON TABLE "public"."price_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."price_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."price_events" TO "anon";
GRANT ALL ON TABLE "public"."price_events" TO "authenticated";
GRANT ALL ON TABLE "public"."price_events" TO "service_role";



GRANT ALL ON TABLE "public"."price_guarantees" TO "anon";
GRANT ALL ON TABLE "public"."price_guarantees" TO "authenticated";
GRANT ALL ON TABLE "public"."price_guarantees" TO "service_role";



GRANT ALL ON TABLE "public"."price_history" TO "anon";
GRANT ALL ON TABLE "public"."price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."price_history" TO "service_role";



GRANT ALL ON TABLE "public"."price_trends" TO "anon";
GRANT ALL ON TABLE "public"."price_trends" TO "authenticated";
GRANT ALL ON TABLE "public"."price_trends" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_event_logs" TO "anon";
GRANT ALL ON TABLE "public"."pricing_event_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_event_logs" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_rules" TO "anon";
GRANT ALL ON TABLE "public"."pricing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_rules" TO "service_role";



GRANT ALL ON TABLE "public"."product_waitlists" TO "anon";
GRANT ALL ON TABLE "public"."product_waitlists" TO "authenticated";
GRANT ALL ON TABLE "public"."product_waitlists" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."project_features" TO "anon";
GRANT ALL ON TABLE "public"."project_features" TO "authenticated";
GRANT ALL ON TABLE "public"."project_features" TO "service_role";



GRANT ALL ON TABLE "public"."project_phases" TO "anon";
GRANT ALL ON TABLE "public"."project_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."project_phases" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_logs" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."referral_challenges" TO "anon";
GRANT ALL ON TABLE "public"."referral_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."referral_logs" TO "anon";
GRANT ALL ON TABLE "public"."referral_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_logs" TO "service_role";



GRANT ALL ON TABLE "public"."referral_rewards" TO "anon";
GRANT ALL ON TABLE "public"."referral_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."report_option_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."report_option_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."report_option_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."report_option_unlocks" TO "anon";
GRANT ALL ON TABLE "public"."report_option_unlocks" TO "authenticated";
GRANT ALL ON TABLE "public"."report_option_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."request_admin_actions" TO "anon";
GRANT ALL ON TABLE "public"."request_admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."request_admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."request_attachments" TO "anon";
GRANT ALL ON TABLE "public"."request_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."request_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."request_candidate_shortlists" TO "anon";
GRANT ALL ON TABLE "public"."request_candidate_shortlists" TO "authenticated";
GRANT ALL ON TABLE "public"."request_candidate_shortlists" TO "service_role";



GRANT ALL ON TABLE "public"."request_compliance_actions" TO "anon";
GRANT ALL ON TABLE "public"."request_compliance_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."request_compliance_actions" TO "service_role";



GRANT ALL ON TABLE "public"."request_compliance_hits" TO "anon";
GRANT ALL ON TABLE "public"."request_compliance_hits" TO "authenticated";
GRANT ALL ON TABLE "public"."request_compliance_hits" TO "service_role";



GRANT ALL ON TABLE "public"."request_customer_message_audit" TO "anon";
GRANT ALL ON TABLE "public"."request_customer_message_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."request_customer_message_audit" TO "service_role";



GRANT ALL ON TABLE "public"."request_delete_backups" TO "anon";
GRANT ALL ON TABLE "public"."request_delete_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."request_delete_backups" TO "service_role";



GRANT ALL ON TABLE "public"."request_deletion_audit" TO "anon";
GRANT ALL ON TABLE "public"."request_deletion_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."request_deletion_audit" TO "service_role";



GRANT ALL ON TABLE "public"."request_disputes" TO "anon";
GRANT ALL ON TABLE "public"."request_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."request_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."request_merchant_matches" TO "anon";
GRANT ALL ON TABLE "public"."request_merchant_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."request_merchant_matches" TO "service_role";



GRANT ALL ON TABLE "public"."request_messages" TO "anon";
GRANT ALL ON TABLE "public"."request_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."request_messages" TO "service_role";



GRANT ALL ON TABLE "public"."request_operational_states" TO "anon";
GRANT ALL ON TABLE "public"."request_operational_states" TO "authenticated";
GRANT ALL ON TABLE "public"."request_operational_states" TO "service_role";



GRANT ALL ON TABLE "public"."request_preferences" TO "anon";
GRANT ALL ON TABLE "public"."request_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."request_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."request_qualification_reviews" TO "anon";
GRANT ALL ON TABLE "public"."request_qualification_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."request_qualification_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."request_status_history" TO "anon";
GRANT ALL ON TABLE "public"."request_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."request_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."request_workflow_events" TO "anon";
GRANT ALL ON TABLE "public"."request_workflow_events" TO "authenticated";
GRANT ALL ON TABLE "public"."request_workflow_events" TO "service_role";



GRANT ALL ON TABLE "public"."research_items" TO "anon";
GRANT ALL ON TABLE "public"."research_items" TO "authenticated";
GRANT ALL ON TABLE "public"."research_items" TO "service_role";



GRANT ALL ON TABLE "public"."research_runs" TO "anon";
GRANT ALL ON TABLE "public"."research_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."research_runs" TO "service_role";



GRANT ALL ON TABLE "public"."service_catalog" TO "anon";
GRANT ALL ON TABLE "public"."service_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."service_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."service_pricing_versions" TO "anon";
GRANT ALL ON TABLE "public"."service_pricing_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."service_pricing_versions" TO "service_role";



GRANT ALL ON TABLE "public"."site_content_audit" TO "anon";
GRANT ALL ON TABLE "public"."site_content_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."site_content_audit" TO "service_role";



GRANT ALL ON TABLE "public"."site_content_blocks" TO "anon";
GRANT ALL ON TABLE "public"."site_content_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."site_content_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."source_reveals" TO "anon";
GRANT ALL ON TABLE "public"."source_reveals" TO "authenticated";
GRANT ALL ON TABLE "public"."source_reveals" TO "service_role";



GRANT ALL ON TABLE "public"."sourcing_sources" TO "anon";
GRANT ALL ON TABLE "public"."sourcing_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."sourcing_sources" TO "service_role";



GRANT ALL ON TABLE "public"."specializations" TO "anon";
GRANT ALL ON TABLE "public"."specializations" TO "authenticated";
GRANT ALL ON TABLE "public"."specializations" TO "service_role";



GRANT ALL ON TABLE "public"."staff_action_steps" TO "anon";
GRANT ALL ON TABLE "public"."staff_action_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_action_steps" TO "service_role";



GRANT ALL ON TABLE "public"."staff_departments" TO "anon";
GRANT ALL ON TABLE "public"."staff_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_departments" TO "service_role";



GRANT ALL ON TABLE "public"."staff_hr_details" TO "anon";
GRANT ALL ON TABLE "public"."staff_hr_details" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_hr_details" TO "service_role";



GRANT ALL ON TABLE "public"."staff_member_roles" TO "anon";
GRANT ALL ON TABLE "public"."staff_member_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_member_roles" TO "service_role";



GRANT ALL ON TABLE "public"."staff_performance_reviews" TO "anon";
GRANT ALL ON TABLE "public"."staff_performance_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_performance_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."task_claims" TO "anon";
GRANT ALL ON TABLE "public"."task_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."task_claims" TO "service_role";



GRANT ALL ON TABLE "public"."usage_events" TO "anon";
GRANT ALL ON TABLE "public"."usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_watchlists" TO "anon";
GRANT ALL ON TABLE "public"."user_watchlists" TO "authenticated";
GRANT ALL ON TABLE "public"."user_watchlists" TO "service_role";



GRANT ALL ON TABLE "public"."v_customer_current_cycle_usage" TO "anon";
GRANT ALL ON TABLE "public"."v_customer_current_cycle_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."v_customer_current_cycle_usage" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_job_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_request_job_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_job_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_latest_qualification" TO "anon";
GRANT ALL ON TABLE "public"."v_request_latest_qualification" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_latest_qualification" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_offline_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_request_offline_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_offline_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_research_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_request_research_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_research_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_admin_board" TO "anon";
GRANT ALL ON TABLE "public"."v_request_admin_board" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_admin_board" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_pipeline_progress" TO "anon";
GRANT ALL ON TABLE "public"."v_request_pipeline_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_pipeline_progress" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_ui_status" TO "anon";
GRANT ALL ON TABLE "public"."v_request_ui_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_ui_status" TO "service_role";



GRANT ALL ON TABLE "public"."v_customer_request_portal_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_customer_request_portal_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_customer_request_portal_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_guest_request_tracking_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_guest_request_tracking_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_guest_request_tracking_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_intake_request_queue" TO "anon";
GRANT ALL ON TABLE "public"."v_intake_request_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."v_intake_request_queue" TO "service_role";



GRANT ALL ON TABLE "public"."v_intake_request_workspace" TO "anon";
GRANT ALL ON TABLE "public"."v_intake_request_workspace" TO "authenticated";
GRANT ALL ON TABLE "public"."v_intake_request_workspace" TO "service_role";



GRANT ALL ON TABLE "public"."v_merchant_directory" TO "anon";
GRANT ALL ON TABLE "public"."v_merchant_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."v_merchant_directory" TO "service_role";



GRANT ALL ON TABLE "public"."v_merchant_profile_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_merchant_profile_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_merchant_profile_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_stage_clock" TO "anon";
GRANT ALL ON TABLE "public"."v_request_stage_clock" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_stage_clock" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_sla_monitoring" TO "anon";
GRANT ALL ON TABLE "public"."v_request_sla_monitoring" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_sla_monitoring" TO "service_role";



GRANT ALL ON TABLE "public"."v_queue_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."v_queue_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_queue_performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_candidate_pool" TO "anon";
GRANT ALL ON TABLE "public"."v_request_candidate_pool" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_candidate_pool" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_compliance_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_compliance_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_compliance_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_delivery_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_delivery_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_delivery_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_merchant_match_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_merchant_match_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_merchant_match_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_offers_comparison" TO "anon";
GRANT ALL ON TABLE "public"."v_request_offers_comparison" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_offers_comparison" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_release_readiness" TO "anon";
GRANT ALL ON TABLE "public"."v_request_release_readiness" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_release_readiness" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_research_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_research_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_research_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_shortlist_detailed" TO "anon";
GRANT ALL ON TABLE "public"."v_request_shortlist_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_shortlist_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_shortlist_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_request_shortlist_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_shortlist_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_request_timeline" TO "anon";
GRANT ALL ON TABLE "public"."v_request_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."v_request_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."v_requests_active" TO "anon";
GRANT ALL ON TABLE "public"."v_requests_active" TO "authenticated";
GRANT ALL ON TABLE "public"."v_requests_active" TO "service_role";



GRANT ALL ON TABLE "public"."v_requests_archived_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_requests_archived_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_requests_archived_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_requests_ready_for_processing" TO "anon";
GRANT ALL ON TABLE "public"."v_requests_ready_for_processing" TO "authenticated";
GRANT ALL ON TABLE "public"."v_requests_ready_for_processing" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_job_queue" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_job_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_job_queue" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_my_jobs" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_my_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_my_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_request_workspace_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_request_workspace_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_request_workspace_overview" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."vendor_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_automation_logs" TO "anon";
GRANT ALL ON TABLE "public"."vendor_automation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_automation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_bids" TO "anon";
GRANT ALL ON TABLE "public"."vendor_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_bids" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_categories" TO "anon";
GRANT ALL ON TABLE "public"."vendor_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_categories" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_fee_phases" TO "anon";
GRANT ALL ON TABLE "public"."vendor_fee_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_fee_phases" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_portal_tokens" TO "anon";
GRANT ALL ON TABLE "public"."vendor_portal_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_portal_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_profile_details" TO "anon";
GRANT ALL ON TABLE "public"."vendor_profile_details" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_profile_details" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_reviews" TO "anon";
GRANT ALL ON TABLE "public"."vendor_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_system_messages" TO "anon";
GRANT ALL ON TABLE "public"."vendor_system_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_system_messages" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



GRANT ALL ON TABLE "public"."vision_future_ideas" TO "anon";
GRANT ALL ON TABLE "public"."vision_future_ideas" TO "authenticated";
GRANT ALL ON TABLE "public"."vision_future_ideas" TO "service_role";



GRANT ALL ON TABLE "public"."vision_pillars" TO "anon";
GRANT ALL ON TABLE "public"."vision_pillars" TO "authenticated";
GRANT ALL ON TABLE "public"."vision_pillars" TO "service_role";



GRANT ALL ON TABLE "public"."vision_timeline" TO "anon";
GRANT ALL ON TABLE "public"."vision_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."vision_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_runs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_runs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































