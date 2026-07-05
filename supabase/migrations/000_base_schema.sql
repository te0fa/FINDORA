-- =============================================================================
-- FINDORA — Base Database Schema Setup (Phases 1 - 5 Base Tables)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. STAFF MEMBERS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE,
    full_name text,
    staff_role text NOT NULL,
    team_code text NOT NULL DEFAULT 'operations',
    is_active boolean NOT NULL DEFAULT true,
    can_approve_requests boolean NOT NULL DEFAULT false,
    can_manage_merchants boolean NOT NULL DEFAULT false,
    can_view_financials boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_archived boolean DEFAULT false,
    archived_at timestamp with time zone
);

-- ─── 2. CUSTOMERS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code text NOT NULL,
    full_name text NOT NULL,
    governorate text,
    preferred_language text NOT NULL DEFAULT 'ar',
    preferred_contact_method text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    auth_user_id uuid UNIQUE,
    phone_number_raw text,
    phone_number_normalized text,
    phone_verified_at timestamp with time zone,
    email text,
    free_trial_used_at timestamp with time zone,
    block_reason text,
    blocked_at timestamp with time zone,
    is_archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    has_used_free_first_request boolean NOT NULL DEFAULT false,
    phone_verified boolean NOT NULL DEFAULT false
);

-- ─── 3. VENDORS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    commercial_reg_number text,
    tax_card_number text,
    whatsapp_number text,
    governorate text,
    area text,
    trust_score integer NOT NULL DEFAULT 100,
    total_successful_deals integer NOT NULL DEFAULT 0,
    reported_issues integer NOT NULL DEFAULT 0,
    account_tier text NOT NULL DEFAULT 'Bronze',
    system_status text NOT NULL DEFAULT 'Pending Verification',
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    portal_enabled boolean NOT NULL DEFAULT false,
    portal_email text,
    response_speed_hours numeric DEFAULT 24,
    bid_win_rate numeric DEFAULT 0,
    customer_satisfaction_rate numeric DEFAULT 85,
    price_reliability_rate numeric DEFAULT 95,
    trusted_score numeric DEFAULT 85,
    auth_user_id uuid UNIQUE,
    merchant_access_level text NOT NULL DEFAULT 'basic',
    is_phone_verified boolean NOT NULL DEFAULT false
);

-- ─── 4. REQUESTS TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code text NOT NULL UNIQUE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    title text NOT NULL,
    raw_description text NOT NULL,
    interpreted_summary text,
    target_price numeric(12,2),
    currency_code text NOT NULL DEFAULT 'EGP',
    current_status text NOT NULL DEFAULT 'new',
    source_channel text NOT NULL DEFAULT 'landing_page',
    turnaround_deadline timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    assigned_ops_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    assigned_reporter_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    assigned_quality_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    assigned_payment_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    image_url text,
    reference_image_path text,
    reviewer_decision text,
    reviewer_decided_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    reviewer_decided_at timestamp with time zone,
    reviewer_notes text,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    clarification_requested_at timestamp with time zone,
    is_cancelled boolean NOT NULL DEFAULT false,
    cancelled_at timestamp with time zone,
    cancelled_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    cancellation_reason text,
    is_archived boolean NOT NULL DEFAULT false,
    archived_at timestamp with time zone,
    archived_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    archive_reason text,
    is_soft_deleted boolean NOT NULL DEFAULT false,
    soft_deleted_at timestamp with time zone,
    soft_deleted_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    soft_delete_reason text,
    request_kind text,
    intake_mode text NOT NULL DEFAULT 'quick',
    pricing_decision text NOT NULL DEFAULT 'pending_review',
    service_fee_amount numeric,
    execution_requested boolean NOT NULL DEFAULT false,
    followup_requested boolean NOT NULL DEFAULT false,
    site_visit_requested boolean NOT NULL DEFAULT false,
    pricing_notes text,
    assigned_reviewer_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    reviewer_assignment_status text NOT NULL DEFAULT 'unassigned',
    reviewer_assigned_at timestamp with time zone,
    reviewer_assigned_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    archived_by_user_id uuid,
    operations_entered_at timestamp with time zone,
    reporting_entered_at timestamp with time zone,
    ready_entered_at timestamp with time zone,
    pricing_model text,
    payment_policy text,
    budget numeric,
    city text,
    accepts_used boolean,
    priority text DEFAULT 'price',
    auction_duration_hours integer DEFAULT 24,
    auction_ends_at timestamp with time zone,
    selected_bid_id uuid,
    is_recurring boolean,
    reorder_interval_months integer DEFAULT 0,
    last_reordered_at timestamp with time zone,
    is_business boolean,
    business_metadata jsonb DEFAULT '{}'::jsonb,
    rfq_document text,
    canonical_state text DEFAULT 'UNKNOWN',
    metadata jsonb DEFAULT '{}'::jsonb,
    ai_confidence numeric,
    source_type text DEFAULT 'manual'
);

-- ─── 5. VENDOR REVIEWS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    platform_rating integer,
    platform_comment text,
    vendor_rating integer,
    vendor_availability integer,
    vendor_price_accuracy integer,
    vendor_communication integer,
    review_token text,
    token_expires_at timestamp with time zone,
    is_published boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    recommend boolean DEFAULT true,
    price_rating integer,
    response_rating integer,
    commitment_rating integer,
    quality_rating integer,
    review_tags text[],
    image_url text,
    video_url text,
    is_verified_purchase boolean DEFAULT false
);

-- ─── 6. JOB QUEUE RULES TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_queue_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    team_code text NOT NULL,
    default_priority smallint NOT NULL DEFAULT 5,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 7. AGENT JOBS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    job_type text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    priority smallint NOT NULL DEFAULT 5,
    assigned_to_user_id uuid,
    depends_on_job_id uuid REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
    input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_summary text,
    error_message text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 8. AGENT JOB LOGS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_job_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
    log_level text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 9. REQUEST PREFERENCES TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.request_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    budget_min numeric,
    budget_max numeric,
    preferred_brands text,
    preferred_models text,
    preferred_specs text,
    allow_alternatives boolean NOT NULL DEFAULT true,
    condition_preference text NOT NULL DEFAULT 'new',
    urgency_level text NOT NULL DEFAULT 'normal',
    knows_market_price boolean NOT NULL DEFAULT false,
    estimated_market_price numeric,
    priority_focus text NOT NULL DEFAULT 'best_value',
    search_scope text NOT NULL DEFAULT 'online_and_offline',
    preferred_governorate text,
    preferred_area text,
    delivery_needed boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 10. RESEARCH RUNS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    job_id uuid REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
    run_kind text NOT NULL DEFAULT 'online_search',
    status text NOT NULL DEFAULT 'queued',
    search_scope text NOT NULL DEFAULT 'all',
    query_text text,
    summary text,
    results_count integer NOT NULL DEFAULT 0,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 11. REQUEST CANDIDATE SHORTLISTS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.request_candidate_shortlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    candidate_channel text NOT NULL,
    research_item_id uuid,
    merchant_quote_id uuid,
    selected_by_user_id uuid,
    ranking_position integer NOT NULL,
    option_label text,
    trust_score numeric,
    value_score numeric,
    fit_score numeric,
    final_score numeric,
    reason_summary text NOT NULL,
    customer_summary text,
    reveal_locked boolean NOT NULL DEFAULT true,
    is_recommended boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    published_offer_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 12. REQUEST STATUS HISTORY TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.request_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    change_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    from_canonical_state text,
    to_canonical_state text,
    transition_name text,
    changed_by_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    event_source text DEFAULT 'staff_action',
    metadata jsonb DEFAULT '{}'::jsonb
);

-- ─── 13. REQUEST OPERATIONAL STATES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.request_operational_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    operational_stage text NOT NULL DEFAULT 'intake',
    stage_status text NOT NULL DEFAULT 'pending',
    approved_for_processing boolean NOT NULL DEFAULT false,
    needs_manual_review boolean NOT NULL DEFAULT false,
    report_ready boolean NOT NULL DEFAULT false,
    client_released_at timestamp with time zone,
    latest_note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 14. REQUEST WORKFLOW EVENTS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.request_workflow_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    actor_user_id uuid,
    event_type text NOT NULL,
    stage_before text,
    status_before text,
    stage_after text,
    status_after text,
    note text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 15. REPORTS TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    report_version integer NOT NULL DEFAULT 1,
    report_status text NOT NULL DEFAULT 'draft',
    executive_summary text,
    recommendation_summary text,
    why_not_cheapest text,
    price_validity_note text,
    pdf_file_url text,
    generated_by text NOT NULL DEFAULT 'admin',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    approved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);

-- ─── 16. REPORT OPTION SNAPSHOTS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_option_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    shortlist_id uuid,
    offer_id uuid,
    display_rank integer NOT NULL,
    candidate_channel text NOT NULL,
    display_title text NOT NULL,
    display_brand text,
    display_model text,
    display_specs_summary text,
    display_price_amount numeric,
    currency_code text NOT NULL DEFAULT 'EGP',
    availability_status text,
    warranty_info text,
    trust_score numeric,
    value_score numeric,
    final_score numeric,
    highlight_summary text,
    customer_summary text,
    reveal_locked boolean NOT NULL DEFAULT true,
    reveal_kind text NOT NULL DEFAULT 'none',
    hidden_reference_url text,
    hidden_merchant_name text,
    hidden_merchant_location text,
    hidden_contact_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    disadvantages_en text,
    disadvantages_ar text
);

-- ─── 17. REPORT OPTION UNLOCKS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_option_unlocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_option_snapshot_id uuid NOT NULL REFERENCES public.report_option_snapshots(id) ON DELETE CASCADE,
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    subscription_id uuid,
    unlocked_by_user_id uuid,
    unlock_type text NOT NULL DEFAULT 'self_service',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT report_option_unlocks_unlock_type_check CHECK (unlock_type = ANY (ARRAY['self_service'::text, 'admin'::text, 'support'::text]))
);

-- ─── 18. SOURCE REVEALS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.source_reveals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    payment_id uuid,
    reveal_type text NOT NULL,
    revealed_source_text text,
    revealed_source_url text,
    revealed_contact_info text,
    revealed_by text NOT NULL DEFAULT 'admin',
    revealed_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    payment_intent_id uuid
);

-- ─── 19. APPROVALS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    related_entity_type text NOT NULL,
    related_entity_id uuid,
    approval_type text NOT NULL,
    approval_status text NOT NULL DEFAULT 'pending',
    approval_notes text,
    approved_by text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    approved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    approved_by_user_id uuid
);

-- ─── 20. INTERNAL NOTES TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    related_entity_type text NOT NULL,
    related_entity_id uuid NOT NULL,
    note_type text NOT NULL DEFAULT 'general',
    note_text text NOT NULL,
    created_by text NOT NULL DEFAULT 'admin',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── 21. CUSTOMER REQUESTS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_phone text,
    product_name text NOT NULL,
    category text NOT NULL,
    target_location text NOT NULL,
    max_price numeric(10,2),
    additional_notes text,
    status text NOT NULL DEFAULT 'processing',
    is_expanded_by_ai boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    source_deal_id uuid,
    CONSTRAINT customer_requests_status_check CHECK (status = ANY (ARRAY['processing'::text, 'fulfilled'::text, 'cancelled'::text]))
);

-- ─── 22. PHONE OTP CODES TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    code_hash text NOT NULL,
    purpose text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:10:00'::interval),
    is_used boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT phone_otp_codes_purpose_check CHECK (purpose = ANY (ARRAY['contributor_registration'::text, 'merchant_registration'::text, 'withdrawal_verification'::text, 'vendor_auth'::text]))
);

-- ─── 23. STUB VIEWS FOR DEPS ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_request_ui_status AS 
SELECT NULL::uuid AS request_id, NULL::timestamptz AS client_released_at;

CREATE OR REPLACE VIEW public.v_request_admin_board AS 
SELECT NULL::uuid AS request_id, NULL::text AS request_code, NULL::uuid AS customer_id, NULL::text AS title, NULL::text AS legacy_current_status, NULL::text AS source_channel, NULL::timestamptz AS request_created_at, NULL::timestamptz AS request_updated_at, NULL::text AS customer_code, NULL::text AS customer_name, NULL::text AS governorate, NULL::text AS preferred_language, NULL::text AS preferred_contact_method, NULL::text AS primary_contact, NULL::text AS search_scope, NULL::numeric AS budget_min, NULL::numeric AS budget_max, NULL::boolean AS allow_alternatives, NULL::text AS priority_focus, NULL::text AS preferred_governorate, NULL::text AS preferred_area, NULL::text AS operational_stage, NULL::text AS stage_status, NULL::boolean AS approved_for_processing, NULL::boolean AS needs_manual_review, NULL::boolean AS report_ready, NULL::timestamptz AS client_released_at, NULL::text AS latest_note, NULL::text AS latest_qualification_decision, NULL::numeric AS latest_qualification_score, NULL::text AS latest_qualification_reason, NULL::bigint AS total_jobs, NULL::bigint AS queued_jobs, NULL::bigint AS running_jobs, NULL::bigint AS waiting_approval_jobs, NULL::bigint AS completed_jobs, NULL::bigint AS failed_jobs, NULL::bigint AS research_runs_count, NULL::bigint AS research_items_count, NULL::bigint AS research_shortlisted_items, NULL::bigint AS offline_tasks_count, NULL::bigint AS offline_quotes_count, NULL::bigint AS offline_shortlisted_quotes, NULL::bigint AS active_shortlist_count, NULL::bigint AS published_shortlist_count, NULL::bigint AS offers_count, NULL::bigint AS reports_count, NULL::bigint AS payments_count, NULL::uuid AS latest_report_id, NULL::text AS latest_report_status, NULL::timestamptz AS latest_report_created_at, NULL::bigint AS snapshot_count, NULL::bigint AS unlock_count;

CREATE OR REPLACE VIEW public.v_request_pipeline_progress AS 
SELECT NULL::uuid AS request_id, NULL::numeric AS pipeline_completion_pct;

CREATE OR REPLACE VIEW public.v_request_stage_clock AS 
SELECT NULL::uuid AS request_id, NULL::text AS request_code, NULL::text AS canonical_state, NULL::text AS current_status, NULL::text AS current_stage_code, NULL::timestamp with time zone AS current_stage_entered_at, NULL::timestamp with time zone AS last_transition_at, NULL::numeric AS stage_age_minutes, NULL::numeric AS stage_age_hours, NULL::boolean AS is_active_work;

-- ─── 24. VIEW DEFINITION ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_staff_job_queue AS
SELECT j.id AS job_id,
    j.request_id,
    r.request_code,
    r.title AS request_title,
    j.job_type,
    j.status,
    j.priority,
    j.assigned_to_user_id,
    sm.full_name AS assigned_to_name,
    jq.team_code AS target_team,
    j.output_summary,
    j.error_message,
    j.started_at,
    j.finished_at,
    j.created_at,
    j.updated_at
   FROM agent_jobs j
     JOIN requests r ON r.id = j.request_id
     LEFT JOIN staff_members sm ON sm.auth_user_id = j.assigned_to_user_id
     LEFT JOIN job_queue_rules jq ON jq.job_type = j.job_type AND jq.is_active = true;

-- ─── 25. STUB FUNCTIONS FOR PREFLIGHT ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_is_staff(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select exists (
  select 1
  from public.staff_members s
  where s.auth_user_id = p_user_id
    and s.is_active = true
);
$function$;

CREATE OR REPLACE FUNCTION public.fn_claim_agent_job(p_job_id uuid, p_actor_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(job_id uuid, request_id uuid, job_type text, status text, assigned_to_user_id uuid, started_at timestamp with time zone)
 LANGUAGE plpgsql AS $$
BEGIN
  -- Stub: to be overwritten in later migration
  RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::uuid, NULL::timestamptz WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_release_request_to_customer(p_request_id uuid, p_note text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(request_id uuid, notify_job_created boolean, operational_stage text, stage_status text, client_released_at timestamp with time zone)
 LANGUAGE plpgsql AS $$
BEGIN
  -- Stub: to be overwritten in later migration
  RETURN QUERY SELECT NULL::uuid, NULL::boolean, NULL::text, NULL::text, NULL::timestamptz WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_ensure_request_operational_state(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql AS $$
BEGIN
  -- Stub: to be overwritten in later migration
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_request_operational_stage(p_request_id uuid, p_operational_stage text, p_stage_status text, p_note text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid, p_needs_manual_review boolean DEFAULT NULL::boolean, p_approved_for_processing boolean DEFAULT NULL::boolean, p_report_ready boolean DEFAULT NULL::boolean)
 RETURNS TABLE(request_id uuid, operational_stage text, stage_status text, approved_for_processing boolean, needs_manual_review boolean, report_ready boolean)
 LANGUAGE plpgsql AS $$
BEGIN
  -- Stub: to be overwritten in later migration
  RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::boolean, NULL::boolean, NULL::boolean WHERE false;
END;
$$;
