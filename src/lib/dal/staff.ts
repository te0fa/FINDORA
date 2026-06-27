import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { logOperationalEvent, resolveStaffIdForAudit } from './audit'
import { resolveRequestState } from './lifecycle'
import crypto from 'crypto'
import { logPlatformEvent, logMerchantEvent, resolveMerchantForQuote } from './intelligence'
import { queueCommunication } from './communications'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:staff');


export type StaffMemberLite = {
  id: string
  auth_user_id: string
  full_name: string | null
  staff_role: string | null
  team_code: string | null
  is_active: boolean | null
  can_approve_requests: boolean | null
  can_manage_merchants: boolean | null
  can_view_financials: boolean | null
  extra_roles?: string[]
}

export type StaffPermissions = {
  isAdmin: boolean
  canReviewIntake: boolean
  canResearch: boolean
  canSourceOffline: boolean
  canReport: boolean
  canAccessDashboard: boolean
  canAccessQueue: boolean
  activeRoleCodes: string[]
  // Compatibility Aliases
  canTriggerResearch: boolean
  canEditShortlist: boolean
  canReleaseToCustomer: boolean
  canManageDeals: boolean
  canManageNews: boolean
  canManagePricing: boolean
  canManageContent: boolean
  canManageMarketing: boolean
  canManageArchive: boolean
  canManagePayments: boolean
  canViewIntelligence: boolean
  canManageCommunications: boolean
  canManageFinancials: boolean
  canManageAI: boolean
  canManageUsers: boolean
  canHardDelete: boolean
  // Batch 7D operational roles
  isIntakeReviewer: boolean
  isSourcingResearcher: boolean
  isReportBuilder: boolean
  isQualityReviewer: boolean
  isPaymentReviewer: boolean
  isSupportAgent: boolean
  isClientSuccessAgent: boolean
  canManageVendors: boolean
}

function isUuidLike(value: string | null | undefined) {
  if (!value) return false

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function getStaffMemberByAuthUserId(authUserId: string) {
  const adminClient = await createAdminClient()

  const { data: staff, error: staffError } = await (adminClient as any)
    .from('staff_members')
    .select(
      'id, auth_user_id, full_name, staff_role, team_code, is_active, can_approve_requests, can_manage_merchants, can_view_financials'
    )
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (staffError) throw new Error(staffError.message)
  if (!staff) return null

  const { data: roles } = await (adminClient as any)
    .from('staff_member_roles')
    .select('role_code')
    .eq('staff_member_id', staff.id)
    .eq('is_active', true)

  return {
    ...staff,
    extra_roles: (roles || []).map((r: any) => r.role_code)
  } as StaffMemberLite
}

export function resolveStaffHomePath(
  locale: string,
  staff: StaffMemberLite | null | undefined
) {
  if (!staff?.is_active) {
    return `/${locale}/auth/login`
  }

  const permissions = getStaffUiPermissions(staff)

  if (permissions.isAdmin) {
    return `/${locale}/staff/dashboard`
  }

  if (permissions.canAccessQueue) {
    return `/${locale}/staff/queue`
  }

  return `/${locale}/staff/dashboard`
}

export function getStaffUiPermissions(staffMember?: StaffMemberLite | null): StaffPermissions {
  if (!staffMember) {
    const empty = {
      isAdmin: false,
      canReviewIntake: false,
      canResearch: false,
      canSourceOffline: false,
      canReport: false,
      canAccessDashboard: false,
      canAccessQueue: false,
      activeRoleCodes: []
    }
    return {
      ...empty,
      canTriggerResearch: false,
      canEditShortlist: false,
      canReleaseToCustomer: false,
      canManageDeals: false,
      canManageNews: false,
      canManagePricing: false,
      canManageContent: false,
      canManageMarketing: false,
      canManageArchive: false,
      canManagePayments: false,
      canViewIntelligence: false,
      canManageCommunications: false,
      canManageFinancials: false,
      canManageAI: false,
      canManageUsers: false,
      canHardDelete: false,
      isIntakeReviewer: false,
      isSourcingResearcher: false,
      isReportBuilder: false,
      isQualityReviewer: false,
      isPaymentReviewer: false,
      isSupportAgent: false,
      isClientSuccessAgent: false,
      canManageVendors: false
    }
  }

  const primaryRole = staffMember.staff_role ?? ''
  const extraRoles = staffMember.extra_roles || []
  const allRoles = new Set([primaryRole, ...extraRoles])
  const roleCodes = Array.from(allRoles).filter(Boolean)

  const isAdmin = allRoles.has('admin') || allRoles.has('owner')
  const isClientSuccessAgent = allRoles.has('client_success_agent') || allRoles.has('Client Success Agent') || allRoles.has('CLIENT_SUCCESS_AGENT')
  
  const hasOpsRole = isAdmin || isClientSuccessAgent || roleCodes.some(r => 
    ['reviewer', 'researcher', 'field_agent', 'reporter'].includes(r)
  )

  // PHASE 2 — DEFINE ROLE CAPABILITIES
  const canReviewIntake = isAdmin || isClientSuccessAgent || allRoles.has('reviewer') || staffMember.can_approve_requests === true
  const canResearch = isAdmin || isClientSuccessAgent || allRoles.has('researcher')
  const canSourceOffline = isAdmin || allRoles.has('field_agent')
  const canReport = isAdmin || isClientSuccessAgent || allRoles.has('reporter')

  return {
    isAdmin,
    canReviewIntake,
    canResearch,
    canSourceOffline,
    canReport,
    canAccessDashboard: isAdmin || hasOpsRole,
    canAccessQueue: hasOpsRole,
    activeRoleCodes: roleCodes,
    // Compatibility Aliases
    canTriggerResearch: canResearch,
    canEditShortlist: canReport,
    canReleaseToCustomer: canReport,
    // New Marketing/CMS Permissions
    canManageDeals: isAdmin || allRoles.has('deals_manager') || allRoles.has('store_manager'),
    canManageNews: isAdmin || allRoles.has('news_manager'),
    canManagePricing: isAdmin || allRoles.has('pricing_manager'), // Removed 'reviewer'
    canManageContent: isAdmin || allRoles.has('content_manager'),
    canManageMarketing: isAdmin || allRoles.has('deals_manager') || allRoles.has('store_manager') || allRoles.has('news_manager') || allRoles.has('pricing_manager') || allRoles.has('content_manager'),
    canManageArchive: isAdmin || allRoles.has('archive_manager'),
    canManagePayments: isAdmin || allRoles.has('payment_manager'),
    canViewIntelligence: isAdmin || allRoles.has('intelligence_viewer') || allRoles.has('ai_manager'),
    canManageCommunications: isAdmin || isClientSuccessAgent || allRoles.has('communications_manager'),
    canManageFinancials: isAdmin || allRoles.has('accountant') || allRoles.has('finance_manager') || allRoles.has('payment_manager'),
    canManageAI: isAdmin || allRoles.has('ai_manager'), // Restricted to admins or ai_managers
    canManageUsers: isAdmin,
    canHardDelete: isAdmin,
    // Batch 7D Operational Mappings
    isIntakeReviewer: isAdmin || isClientSuccessAgent || allRoles.has('reviewer') || allRoles.has('intake_reviewer'),
    isSourcingResearcher: isAdmin || isClientSuccessAgent || allRoles.has('researcher') || allRoles.has('field_agent') || allRoles.has('sourcing_researcher'),
    isReportBuilder: isAdmin || isClientSuccessAgent || allRoles.has('reporter') || allRoles.has('report_builder'),
    isQualityReviewer: isAdmin || allRoles.has('quality_reviewer'),
    isPaymentReviewer: isAdmin || allRoles.has('payment_manager') || allRoles.has('payment_reviewer'),
    isSupportAgent: isAdmin || isClientSuccessAgent || allRoles.has('support') || allRoles.has('support_agent'),
    isClientSuccessAgent,
    canManageVendors: isAdmin || allRoles.has('vendor_relations')
  }
}

export async function claimAgentJob(params: {
  p_job_id: string
  p_actor_user_id?: string
}) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc('fn_claim_agent_job', {
    p_job_id: params.p_job_id,
    p_actor_user_id: params.p_actor_user_id ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function markAgentJobWaitingApproval(params: {
  p_job_id: string
  p_output_payload?: unknown
  p_output_summary?: string
  p_actor_user_id?: string
}) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc('fn_mark_agent_job_waiting_approval', {
    p_job_id: params.p_job_id,
    p_output_payload: params.p_output_payload ?? {},
    p_output_summary: params.p_output_summary ?? null,
    p_actor_user_id: params.p_actor_user_id ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function completeAgentJob(params: {
  p_job_id: string
  p_output_payload?: unknown
  p_output_summary?: string
  p_actor_user_id?: string
}) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc('fn_complete_agent_job', {
    p_job_id: params.p_job_id,
    p_output_payload: params.p_output_payload ?? {},
    p_output_summary: params.p_output_summary ?? null,
    p_actor_user_id: params.p_actor_user_id ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function failAgentJob(params: {
  p_job_id: string
  p_error_message: string
  p_actor_user_id?: string
}) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc('fn_fail_agent_job', {
    p_job_id: params.p_job_id,
    p_error_message: params.p_error_message,
    p_actor_user_id: params.p_actor_user_id ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function prepareRequestClientBundle(params: {
  p_request_id: string
  p_report_id: string
  p_max_options?: number
  p_note?: string
  p_actor_user_id?: string
}) {
  const supabase = await createAdminClient()

  // Ensure report exists before preparing bundle
  const { error: upsertError } = await (supabase as any).from('reports').upsert({
    id: params.p_report_id,
    request_id: params.p_request_id,
  }, { onConflict: 'id' })
  
  if (upsertError) {
    throw new Error(`[DAL] Failed to create report record: ${upsertError.message}`)
  }

  const { data, error } = await (supabase as any).rpc('fn_prepare_request_client_bundle', {
    p_request_id: params.p_request_id,
    p_report_id: params.p_report_id,
    p_max_options: params.p_max_options ?? 3,
    p_note: params.p_note ?? null,
    p_actor_user_id: params.p_actor_user_id ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  // AUDIT LOG (Non-blocking)
  if (params.p_actor_user_id) {
    const staffId = await resolveStaffIdForAudit(params.p_actor_user_id);
    if (staffId) {
      await logOperationalEvent({
        requestId: params.p_request_id,
        staffId: staffId,
        eventName: 'CLIENT_BUNDLE_PREPARED',
        metadata: { 
          report_id: params.p_report_id,
          result: data 
        }
      });
    }
  }

  return data
}

export async function releaseRequestToCustomer(params: {
  p_request_id: string
  p_note?: string
  p_actor_user_id?: string
}) {
  const { executeTransition } = await import('./transitions')
  const adminClient = await createAdminClient()

  if (!params.p_actor_user_id) {
    throw new Error('Actor user ID is required to release the final report');
  }

  // Fetch staff member for transition params
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', params.p_actor_user_id)
    .single()

  if (!staff) throw new Error('Staff member not found')

  const result = await executeTransition('RELEASE_FINAL', params.p_request_id, staff.id, params.p_note)

  // --- BATCH 4A: INTEL & COMM HOOKS ---
  try {
    // 1. Fetch request details for customer_id
    const { data: req } = await adminClient
      .from('requests')
      .select('customer_id, request_code, title')
      .eq('id', params.p_request_id)
      .single()

    if (req) {
      await Promise.all([
        // 2. Log Platform Event
        logPlatformEvent({
          eventType: 'report_released',
          actorType: 'staff',
          actorId: staff.id,
          requestId: params.p_request_id,
          customerId: req.customer_id
        }),
        // 3. Queue "Report Ready" Communication (DRAFT)
        queueCommunication({
          customerId: req.customer_id,
          requestId: params.p_request_id,
          templateCode: 'report_ready',
          variables: {
            request_code: req.request_code || '',
            request_title: req.title || ''
          },
          status: 'draft'
        })
      ])
    }
  } catch (err: any) {
    log.warn('[INTEL/COMM] Release hook failed (non-blocking):', err.message)
  }

  return result
}

export async function claimJob(jobId: string, actorUserId?: string) {
  return claimAgentJob({
    p_job_id: jobId,
    p_actor_user_id: actorUserId,
  })
}

export async function markJobWaitingApproval(
  jobId: string,
  payload?: unknown,
  summary?: string,
  actorUserId?: string
) {
  return markAgentJobWaitingApproval({
    p_job_id: jobId,
    p_output_payload: payload,
    p_output_summary: summary,
    p_actor_user_id: actorUserId,
  })
}

export async function completeJob(
  jobId: string,
  payload?: unknown,
  summary?: string,
  actorUserId?: string
) {
  return completeAgentJob({
    p_job_id: jobId,
    p_output_payload: payload,
    p_output_summary: summary,
    p_actor_user_id: actorUserId,
  })
}

export async function failJob(jobId: string, errorMessage: string, actorUserId?: string) {
  return failAgentJob({
    p_job_id: jobId,
    p_error_message: errorMessage,
    p_actor_user_id: actorUserId,
  })
}

export async function releaseToCustomer(
  requestId: string,
  note?: string,
  actorUserId?: string
) {
  return releaseRequestToCustomer({
    p_request_id: requestId,
    p_note: note,
    p_actor_user_id: actorUserId,
  })
}

export async function getRequestAdminBoard() {
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('v_request_admin_board')
    .select('*')
    .order('request_created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getPipelineProgress(staffId?: string, authUserId?: string) {
  const stats = await getAdminGlobalStats(staffId, authUserId)

  return [
    { stage_code: 'pending_intake', stage_name: 'Pending Intake', count: stats.pendingIntake },
    { stage_code: 'in_operations', stage_name: 'In Operations', count: stats.inOperations },
    { stage_code: 'client_ready', stage_name: 'Ready to Release', count: stats.readyToRelease },
  ]
}

export async function getStaffJobQueue() {
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('v_staff_job_queue')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function getRequestFullWorkspace(requestId: string, staffMember?: StaffMemberLite) {
  if (!isUuidLike(requestId)) return null

  const adminClient = await createAdminClient()

  const [requestRes, uiStatusRes, snapshotsRes] = await Promise.all([
    adminClient.from('requests').select('*').eq('id', requestId).maybeSingle(),
    adminClient.from('v_request_ui_status').select('client_released_at').eq('request_id', requestId).maybeSingle(),
    adminClient.from('report_option_snapshots').select('id', { count: 'exact', head: true }).eq('request_id', requestId)
  ])

  const baseRequest = requestRes.data
  if (!baseRequest) return null

  // 2. Resolve Canonical State
  const state = resolveRequestState({
    ...baseRequest,
    client_released_at: uiStatusRes.data?.client_released_at
  })

  // 3. SERVER-SIDE ROLE VISIBILITY GUARDS
  const roles = staffMember ? new Set([staffMember.staff_role, ...(staffMember.extra_roles || [])]) : new Set()
  const isAdmin = roles.has('admin') || roles.has('owner')
  if (state === 'ARCHIVED' && !isAdmin) return null

  if (staffMember) {
    if (staffMember.is_active === false) {
      throw new Error('BLOCK: Your account is inactive.')
    }

    const roles = new Set([staffMember.staff_role, ...(staffMember.extra_roles || [])])
    const isAdmin = roles.has('admin') || roles.has('owner')

    if (!isAdmin) {
      const isReviewer = roles.has('reviewer')
      const isResearcher = roles.has('researcher')
      const isFieldAgent = roles.has('field_agent')
      const isReporter = roles.has('reporter')
      
      const isAssigned = baseRequest.assigned_reviewer_staff_id === staffMember.id
      let allowed = false

      if (state === 'INTAKE') {
        if (isReviewer && isAssigned) allowed = true
      } else if (state === 'ISSUES') {
        if (isReviewer && isAssigned && baseRequest.reviewer_decision === 'needs_clarification') {
          allowed = true
        }
      } else if (state === 'OPERATIONS') {
        if (isResearcher || isFieldAgent || isReporter) allowed = true
      } else if (state === 'READY' || state === 'COMPLETED') {
        if (isReporter) allowed = true
      }

      if (!allowed) {
        throw new Error(`BLOCK: Access denied for your role in state ${state}.`)
      }
    }
  }

  // 4. Assemble associated data
  const [researchRunsRes, shortlistRes, merchantQuotesRes, preferencesRes, clockRes, slaRes, reportRes, snapshotsDetailedRes, onlineQuotesRes] = await Promise.all([
    adminClient.from('research_runs').select('*, research_items(*)').eq('request_id', requestId).order('created_at', { ascending: false }),
    adminClient.from('request_candidate_shortlists').select('*').eq('request_id', requestId).order('ranking_position', { ascending: true }),
    adminClient.from('merchant_quotes').select('*').eq('request_id', requestId).order('created_at', { ascending: false }),
    adminClient.from('request_preferences').select('*').eq('request_id', requestId).maybeSingle(),
    adminClient.from('v_request_stage_clock').select('*').eq('request_id', requestId).maybeSingle(),
    adminClient.from('v_request_sla_monitoring').select('*').eq('request_id', requestId).maybeSingle(),
    adminClient.from('reports').select('*').eq('request_id', requestId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId).order('display_rank', { ascending: true }),
    adminClient.from('online_merchant_quotes').select('*').eq('request_id', requestId).order('scraped_at', { ascending: false })
  ])

  // Fetch names
  const [customerRes, staffRes] = await Promise.all([
    adminClient.from('customers').select('full_name').eq('id', baseRequest.customer_id).maybeSingle(),
    baseRequest.assigned_reviewer_staff_id 
      ? adminClient.from('staff_members').select('full_name').eq('id', baseRequest.assigned_reviewer_staff_id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  return {
    request: {
      request_id: baseRequest.id,
      request_code: baseRequest.request_code,
      title: baseRequest.title,
      raw_description: baseRequest.raw_description,
      current_status: baseRequest.current_status,
      request_kind: baseRequest.request_kind,
      reference_image_path: baseRequest.reference_image_path,
      customer_name: customerRes.data?.full_name ?? '-',
      client_released_at: uiStatusRes.data?.client_released_at ?? null,
      intake_ai_decision: baseRequest.intake_ai_decision,
      intake_ai_confidence: baseRequest.intake_ai_confidence,
      intake_summary: baseRequest.intake_summary,
      reviewer_decision: baseRequest.reviewer_decision,
      reviewer_notes: baseRequest.reviewer_notes ?? null,
      assigned_reviewer_staff_id: baseRequest.assigned_reviewer_staff_id,
      reviewer_assignment_status: baseRequest.reviewer_assignment_status,
      assigned_reviewer_name: staffRes.data?.full_name ?? null,
      snapshot_count: snapshotsRes.count ?? 0,
      pricing_model: baseRequest.pricing_model,
      payment_policy: baseRequest.payment_policy,
      service_fee_amount: baseRequest.service_fee_amount,
      pricing_notes: baseRequest.pricing_notes,
      updated_at: baseRequest.updated_at,
      source_channel: baseRequest.source_channel
    },
    preferences: preferencesRes.data ?? { urgency_level: 'normal' },
    research_runs: researchRunsRes.data || [],
    shortlist: shortlistRes.data || [],
    merchant_quotes: merchantQuotesRes.data || [],
    online_merchant_quotes: onlineQuotesRes?.data || [],
    report: reportRes.data || null,
    report_snapshots: snapshotsDetailedRes.data || [],
    stage_clock: clockRes.data || null,
    sla_monitoring: slaRes.data || null,
    state
  }
}

export async function saveMerchantQuote(params: {
  request_id: string
  merchant_name: string
  product_title: string
  price_amount: number
  captured_by_staff_id?: string
  contact_person?: string
  phone_number?: string
  address?: string
  governorate?: string
  area?: string
  availability_status?: string
  installment_details?: string
  notes?: string
  category?: string
  product_image_path?: string
  business_card_image_path?: string
}) {
  const adminClient = await createAdminClient()

  // 0. Resolve/Create Merchant (Batch 4B Hook)
  const merchantId = await resolveMerchantForQuote({
    merchantName: params.merchant_name,
    category: params.category,
    governorate: params.governorate,
    area: params.area,
    address: params.address
  });

  // 1. Resolve quoted_by_user_id (auth UUID) if staff_id is provided
  let quotedByUserId: string | null = null;
  if (params.captured_by_staff_id) {
    const { data: staff } = await adminClient
      .from('staff_members')
      .select('auth_user_id')
      .eq('id', params.captured_by_staff_id)
      .maybeSingle();
    quotedByUserId = staff?.auth_user_id || null;
  }

  // 2. Aggregate notes
  const contactNotes = [
    params.merchant_name ? `Merchant: ${params.merchant_name}` : null,
    params.contact_person ? `Contact: ${params.contact_person}` : null,
    params.phone_number ? `Phone: ${params.phone_number}` : null,
    params.address ? `Address: ${params.address}` : null,
    params.governorate ? `Gov: ${params.governorate}` : null,
    params.area ? `Area: ${params.area}` : null,
    params.installment_details ? `Installments: ${params.installment_details}` : null,
    params.notes ? `Notes: ${params.notes}` : null
  ].filter(Boolean).join(' | ');

  const { data, error } = await (adminClient as any)
    .from('merchant_quotes')
    .insert({
      request_id: params.request_id,
      merchant_id: merchantId, // Link solved merchant
      quoted_by_user_id: quotedByUserId,
      captured_by_staff_id: params.captured_by_staff_id || null,
      merchant_name: params.merchant_name,
      contact_person: params.contact_person || null,
      phone_number: params.phone_number || null,
      address: params.address || null,
      governorate: params.governorate || null,
      area: params.area || null,
      option_label: params.merchant_name,
      product_title: params.product_title,
      price_amount: params.price_amount,
      availability_status: params.availability_status || 'available',
      currency_code: 'EGP',
      installment_details: params.installment_details || null,
      notes: params.notes || null,
      product_image_path: params.product_image_path || null,
      business_card_image_path: params.business_card_image_path || null,
      contact_notes: contactNotes,
      source_channel: 'field_agent'
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // AUDIT LOG (Non-blocking)
  if (params.captured_by_staff_id) {
    await logOperationalEvent({
      requestId: params.request_id,
      staffId: params.captured_by_staff_id,
      eventName: 'OFFLINE_QUOTE_ADDED',
      metadata: { merchant_quote_id: data.id }
    });
  }

  // --- BATCH 4A/4B: INTEL HOOK ---
  if (merchantId) {
    await logMerchantEvent({
      merchantId: merchantId,
      eventType: 'quote_submitted',
      requestId: params.request_id,
      metadata: { quote_id: data.id }
    }).catch(e => log.warn('[INTEL] Merchant event log failed:', e.message));
  }

  return data
}

export async function updateReviewerDecision(params: {
  request_id: string
  decision: 'approve' | 'reject' | 'needs_clarification'
  staff_id?: string | null
  reviewer_notes?: string | null
}) {
  const { executeTransition } = await import('./transitions')
  const adminClient = await createAdminClient()

  if (!params.staff_id) {
    throw new Error('Staff ID is required to process the intake decision');
  }

  // Fetch staff member
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('*')
    .eq('id', params.staff_id)
    .single()

  if (!staff) throw new Error('Staff member not found')

  const transitionType = 
    params.decision === 'approve' ? 'APPROVE_INTAKE' :
    params.decision === 'reject' ? 'REJECT_INTAKE' :
    'CLARIFY_INTAKE';

  return await executeTransition(transitionType, params.request_id, staff.id, params.reviewer_notes ?? undefined)
}

export async function addToShortlist(params: {
  request_id: string
  candidate_channel: string
  research_item_id?: string | null
  merchant_quote_id?: string | null
  selected_by_user_id?: string | null
  ranking_position?: number | null
  option_label?: string | null
  trust_score?: number | null
  value_score?: number | null
  fit_score?: number | null
  final_score?: number | null
  reason_summary: string
  customer_summary?: string | null
  reveal_locked?: boolean
  is_recommended?: boolean
  is_active?: boolean
}) {
  const adminClient = await createAdminClient()

  let finalPos = params.ranking_position
  if (finalPos === undefined || finalPos === null) {
    const { data: currentItems } = await (adminClient as any)
      .from('request_candidate_shortlists')
      .select('ranking_position')
      .eq('request_id', params.request_id)
      .order('ranking_position', { ascending: false })
      .limit(1)

    const maxPos = currentItems?.[0]?.ranking_position || 0
    finalPos = maxPos + 1
  }

  const { data, error } = await (adminClient as any)
    .from('request_candidate_shortlists')
    .insert({
      request_id: params.request_id,
      candidate_channel: params.candidate_channel,
      research_item_id: params.research_item_id ?? null,
      merchant_quote_id: params.merchant_quote_id ?? null,
      selected_by_user_id: params.selected_by_user_id ?? null,
      ranking_position: finalPos,
      option_label: params.option_label ?? null,
      trust_score: params.trust_score ?? null,
      value_score: params.value_score ?? null,
      fit_score: params.fit_score ?? null,
      final_score: params.final_score ?? null,
      reason_summary: params.reason_summary,
      customer_summary: params.customer_summary ?? null,
      reveal_locked: params.reveal_locked ?? true,
      is_recommended: params.is_recommended ?? true,
      is_active: params.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // AUDIT LOG (Non-blocking)
  const staffId = await resolveStaffIdForAudit(params.selected_by_user_id);

  if (staffId) {
    await logOperationalEvent({
      requestId: params.request_id,
      staffId: staffId,
      eventName: 'SHORTLIST_ITEM_ADDED',
      metadata: { shortlist_id: data.id }
    });
  }

  // --- BATCH 4A/4B: INTEL HOOK ---
  // Resolve merchant_id from quote if not direct
  let targetMerchantId = data.merchant_id;
  if (!targetMerchantId && data.merchant_quote_id) {
     const { data: quote } = await adminClient.from('merchant_quotes').select('merchant_id').eq('id', data.merchant_quote_id).single();
     targetMerchantId = quote?.merchant_id;
  }

  if (targetMerchantId) {
    await logMerchantEvent({
      merchantId: targetMerchantId,
      eventType: 'shortlisted',
      requestId: params.request_id,
      metadata: { shortlist_id: data.id }
    }).catch(e => log.warn('[INTEL] Merchant event log failed:', e.message));
  }

  return data
}

export async function getRequestUiStatus(requestId: string) {
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('v_request_ui_status')
    .select(
      'request_id, title, current_status, customer_visible_status, customer_reveal_completion_pct, report_ready, client_released_at, snapshot_count, unlock_count, latest_report_id, latest_report_status, latest_report_created_at, pipeline_completion_pct, customer_name'
    )
    .eq('request_id', requestId)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function getReviewerPerformanceByStaffId(staffId: string) {
  if (!isUuidLike(staffId)) {
    return {
      total_reviewed: 0,
      approved_count: 0,
      rejected_count: 0,
      clarification_count: 0,
      approval_rate: 0,
      ai_assists_used: 0,
      reports_ready: 0,
      assigned_total: 0,
      myStaffCompletedToday: 0
    }
  }

  const adminClient = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [decisionsRes, aiRunsRes, reqsRes, historyRes] = await Promise.all([
    adminClient
      .from('requests')
      .select('reviewer_decision, id')
      .eq('reviewer_decided_by_staff_id', staffId)
      .not('reviewer_decision', 'is', null),
    adminClient
      .from('ai_copilot_runs')
      .select('id')
      .eq('staff_id', staffId)
      .eq('status', 'completed'),
    adminClient
      .from('requests')
      .select('id, current_status')
      .eq('assigned_reviewer_staff_id', staffId),
    adminClient
      .from('request_status_history')
      .select('id')
      .eq('changed_by_staff_id', staffId)
      .gte('created_at', `${today}T00:00:00Z`)
  ])

  const decisions = decisionsRes.data || []
  const total_reviewed = decisions.length
  const approved_count = decisions.filter((r: any) => r.reviewer_decision === 'approve').length
  const rejected_count = decisions.filter((r: any) => r.reviewer_decision === 'reject').length
  const clarification_count = decisions.filter((r: any) => r.reviewer_decision === 'needs_clarification').length
  const approval_rate = total_reviewed > 0 ? Math.round((approved_count / total_reviewed) * 100) : 0

  const ai_assists_used = aiRunsRes.data?.length || 0
  const assigned_total = reqsRes.data?.length || 0
  const reports_ready = reqsRes.data?.filter((r: any) => r.current_status === 'ready' || r.current_status === 'closed').length || 0
  const myStaffCompletedToday = historyRes.data?.length || 0

  return {
    total_reviewed,
    approved_count,
    rejected_count,
    clarification_count,
    approval_rate,
    ai_assists_used,
    reports_ready,
    assigned_total,
    myStaffCompletedToday
  }
}

export async function getAdminGlobalStats(staffId?: string, authUserId?: string) {
  const adminClient = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch base fields for state resolution + client_released_at from view + running jobs
  const [reqsRes, uiStatusRes, jobsRes, slaRes, historyRes, aiRunsRes, staffHistoryRes] = await Promise.all([
    adminClient.from('requests').select('id, current_status, reviewer_decision, assigned_reviewer_staff_id, is_archived'),
    adminClient.from('v_request_ui_status').select('request_id, client_released_at'),
    adminClient.from('v_staff_job_queue').select('request_id, assigned_to_user_id, status').eq('status', 'running'),
    adminClient.from('v_request_sla_monitoring').select('request_id, sla_status'),
    adminClient.from('request_status_history').select('request_id, transition_name').like('transition_name', 'ASSIGNMENT_UPDATED%'),
    adminClient.from('ai_copilot_runs').select('request_id, status, agent_code').eq('agent_code', 'intake_reviewer'),
    adminClient.from('request_status_history').select('id, created_at, changed_by_staff_id, event_source').or('event_source.eq.staff_action,changed_by_staff_id.not.is.null')
  ])

  if (reqsRes.error) throw new Error(reqsRes.error.message)

  const releasedMap = new Map((uiStatusRes.data || []).map((r: any) => [r.request_id, r.client_released_at]))
  const slaMap = new Map((slaRes.data || []).map((r: any) => [r.request_id, r.sla_status]))
  const reassignmentData = historyRes.data || []
  const jobs = jobsRes.data || []
  const claimedRequestIds = new Set(jobs.map((j: any) => j.request_id))
  
  const aiRuns = aiRunsRes.data || []
  const aiCompletedIds = new Set(aiRuns.filter((r: any) => r.status === 'completed').map((r: any) => r.request_id))
  const aiFailedIds = new Set(aiRuns.filter((r: any) => r.status === 'failed').map((r: any) => r.request_id))

  const rows = reqsRes.data as any[]

  // Map each row to its canonical state
  const resolvedRows = rows.map(row => {
    const state = resolveRequestState({
      ...row,
      client_released_at: releasedMap.get(row.id)
    });
    return { ...row, state };
  });

  // RENAMED TOTALS
  const totalRequests = resolvedRows.length // All-time including archived
  const activeTotal = resolvedRows.filter(r => r.state !== 'ARCHIVED').length // Current operational scope

  // Filter by staffId/authUserId if provided (for personal stats)
  const personalRows = resolvedRows.filter(r => {
    if (!staffId) return true;
    
    // Intake is personal if assigned to staffId
    if (r.state === 'INTAKE') return r.assigned_reviewer_staff_id === staffId;
    
    // Operations is personal if claimed by authUserId
    if (r.state === 'OPERATIONS') {
      const isClaimedByMe = authUserId && jobs.some((j: any) => j.request_id === r.id && j.assigned_to_user_id === authUserId);
      return isClaimedByMe;
    }
    
    return true; // Other states usually global or filtered at UI
  });

  const displayRows = staffId ? personalRows : resolvedRows;

  // Derive counters using canonical states
  const pendingIntake = displayRows.filter(r => r.state === 'INTAKE').length
  const inOperations = displayRows.filter(r => r.state === 'OPERATIONS').length
  const readyToRelease = displayRows.filter(r => r.state === 'READY').length
  const completedCount = displayRows.filter(r => r.state === 'COMPLETED').length
  const issuesCount = displayRows.filter(r => r.state === 'ISSUES').length
  const rejectedCount = displayRows.filter(r => r.state === 'REJECTED').length
  
  // Workload Reconciliation (Strict Definitions)
  // Assigned Workload = intake items assigned to this reviewer
  const assignedWorkload = resolvedRows.filter(r => 
    r.state === 'INTAKE' && 
    (staffId ? r.assigned_reviewer_staff_id === staffId : !!r.assigned_reviewer_staff_id)
  ).length

  // Claimed Workload = operations jobs currently running for this staff member
  const claimedWorkload = staffId && authUserId
    ? jobs.filter((j: any) => j.assigned_to_user_id === authUserId).length
    : jobs.length

  // Shared Pool Visibility = operations items visible but not claimed
  const sharedPoolVisibility = resolvedRows.filter(r => 
    r.state === 'OPERATIONS' && !claimedRequestIds.has(r.id)
  ).length

  // Actionable Load = assigned intake (reviewers) OR claimed operations (agents)
  const actionableLoad = staffId 
    ? (assignedWorkload + claimedWorkload)
    : (resolvedRows.filter(r => r.state === 'INTAKE').length + jobs.length)

  const activeWork = pendingIntake + inOperations + readyToRelease
  const archivedCount = resolvedRows.filter(r => r.state === 'ARCHIVED').length

  // AI METRICS
  const pendingAI = resolvedRows.filter(r => 
    ['INTAKE', 'READY'].includes(r.state) && 
    r.state !== 'ARCHIVED' && 
    !aiCompletedIds.has(r.id)
  ).length

  const aiCompleted = resolvedRows.filter(r => 
    r.state !== 'ARCHIVED' && 
    aiCompletedIds.has(r.id)
  ).length
  const aiFailed = aiFailedIds.size

  // STAFF COMPLETED METRICS
  const staffActions = staffHistoryRes.data || []
  const staffCompletedTotal = staffActions.length
  
  const staffCompletedTodayCount = staffActions.filter((a: any) => {
    const actionDate = new Date(a.created_at).toISOString().split('T')[0]
    return actionDate === today && (staffId ? a.changed_by_staff_id === staffId : true)
  }).length

  const slaBreached = resolvedRows.filter(r => slaMap.get(r.id) === 'breached').length
  const slaAtRisk = resolvedRows.filter(r => slaMap.get(r.id) === 'at_risk').length
  const slaOnTrack = resolvedRows.filter(r => slaMap.get(r.id) === 'on_track').length

  return {
    totalRequests,
    activeTotal,
    pendingIntake,
    inOperations,
    readyToRelease,
    completedCount,
    issuesCount,
    rejectedCount,
    assignedWorkload,
    claimedWorkload,
    sharedPoolVisibility,
    actionableLoad,
    activeWork,
    archivedCount,
    pendingAI,
    aiCompleted,
    aiFailed,
    staffCompletedTotal,
    staffCompletedToday: staffCompletedTodayCount,
    slaBreached,
    slaAtRisk,
    slaOnTrack,
    reassignedCount: reassignmentData.length
  }
}

export async function getAllStaffPerformance() {
  const adminClient = await createAdminClient()

  const { data: staff, error: staffError } = await (adminClient as any)
    .from('staff_members')
    .select('id, full_name, staff_role, auth_user_id')
    .eq('is_active', true)

  if (staffError) throw new Error(staffError.message)

  const { data: decisions, error: decError } = await (adminClient as any)
    .from('requests')
    .select('reviewer_decided_by_staff_id, reviewer_decision, reviewer_decided_at')
    .eq('is_archived', false)
    .not('reviewer_decision', 'is', null)

  if (decError) throw new Error(decError.message)

  const { data: jobs, error: jobsError } = await (adminClient as any)
    .from('v_staff_job_queue')
    .select('assigned_to_user_id, status')
    .eq('status', 'running')

  if (jobsError) {
    log.warn('Workload fetch warning in performance overview:', jobsError.message)
  }

  return (staff as any[]).map(s => {
    const sDecisions = (decisions as any[]).filter(d => d.reviewer_decided_by_staff_id === s.id)
    const sJobs = (jobs || []).filter((j: any) => j.assigned_to_user_id === s.auth_user_id)
    
    const sortedDec = [...sDecisions].sort((a, b) => 
      new Date(b.reviewer_decided_at).getTime() - new Date(a.reviewer_decided_at).getTime()
    )
    
    const total = sDecisions.length
    const approved = sDecisions.filter(d => d.reviewer_decision === 'approve').length
    const rejected = sDecisions.filter(d => d.reviewer_decision === 'reject').length
    const clarification = sDecisions.filter(d => d.reviewer_decision === 'needs_clarification').length
    
    return {
      staff_id: s.id,
      name: s.full_name,
      role: s.staff_role,
      current_jobs_count: sJobs.length,
      reviewed_count: total,
      approved_count: approved,
      rejected_count: rejected,
      clarification_count: clarification,
      approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
      last_activity_at: sortedDec[0]?.reviewer_decided_at || null
    }
  }).sort((a, b) => b.reviewed_count - a.reviewed_count)
}

export async function getStaffManagementList() {
  const adminClient = await createAdminClient()

  const { data: staff, error: staffError } = await (adminClient as any)
    .from('staff_members')
    .select('id, full_name, staff_role, team_code, is_active, auth_user_id, is_archived')
    .order('full_name', { ascending: true })

  if (staffError) throw new Error(staffError.message)

  const staffIds = (staff as any[]).map(s => s.id)

  const [jobsRes, decRes, rolesRes, authUsersRes] = await Promise.all([
    adminClient.from('v_staff_job_queue').select('assigned_to_user_id, status').eq('status', 'running'),
    adminClient.from('requests').select('reviewer_decided_by_staff_id, reviewer_decision, reviewer_decided_at').eq('is_archived', false).not('reviewer_decision', 'is', null),
    adminClient.from('staff_member_roles').select('staff_member_id, role_code').eq('is_active', true).in('staff_member_id', staffIds),
    adminClient.auth.admin.listUsers()
  ])

  const jobs = jobsRes.data || []
  const decisions = decRes.data || []
  const extraRoles = rolesRes.data || []
  const authUsers = authUsersRes?.data?.users || []
  const authMap = new Map(authUsers.map(u => [u.id, u]))

  const staffList = (staff as any[]).map(s => {
    const sJobs = jobs.filter((j: any) => j.assigned_to_user_id === s.auth_user_id)
    const sDecisions = decisions.filter((d: any) => d.reviewer_decided_by_staff_id === s.id)
    const sExtra = extraRoles.filter((r: any) => r.staff_member_id === s.id).map((r: any) => r.role_code)
    const authUser = authMap.get(s.auth_user_id)
    
    const sortedDec = [...sDecisions].sort((a, b) => 
      new Date(b.reviewer_decided_at || '').getTime() - new Date(a.reviewer_decided_at || '').getTime()
    )
    
    const approved = sDecisions.filter((d: any) => d.reviewer_decision === 'approve').length
    const rejected = sDecisions.filter((d: any) => d.reviewer_decision === 'reject').length
    const clarification = sDecisions.filter((d: any) => d.reviewer_decision === 'needs_clarification').length
    const total = sDecisions.length

    return {
      id: s.id,
      name: s.full_name,
      role: s.staff_role,
      extra_roles: sExtra,
      team: s.team_code,
      is_active: s.is_active,
      is_archived: s.is_archived,
      auth_id: s.auth_user_id,
      email: authUser?.email || '—',
      phone: authUser?.phone || authUser?.user_metadata?.phone || '—',
      workload: sJobs.length,
      reviewed_count: total,
      approved_count: approved,
      rejected_count: rejected,
      clarification_count: clarification,
      approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
      last_activity: sortedDec[0]?.reviewer_decided_at || null
    }
  })

  return staffList
}

export async function updateStaffMemberStatus(staffId: string, updates: { 
  staff_role?: string; 
  team_code?: string; 
  is_active?: boolean;
  extra_roles?: string[];
}) {
  const adminClient = await createAdminClient()

  // 1. Update primary fields
  const { staff_role, team_code, is_active } = updates
  const { data, error } = await (adminClient as any)
    .from('staff_members')
    .update({ staff_role, team_code, is_active })
    .eq('id', staffId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 2. Sync extra roles if provided
  if (updates.extra_roles !== undefined) {
    const newRoles = updates.extra_roles

    // Deactivate current extra roles
    await adminClient
      .from('staff_member_roles')
      .update({ is_active: false })
      .eq('staff_member_id', staffId)

    // Insert or update new ones
    if (newRoles.length > 0) {
      for (const roleCode of newRoles) {
        const { data: existing } = await adminClient
          .from('staff_member_roles')
          .select('id')
          .eq('staff_member_id', staffId)
          .eq('role_code', roleCode)
          .maybeSingle()

        if (existing) {
          await adminClient
            .from('staff_member_roles')
            .update({ is_active: true })
            .eq('id', existing.id)
        } else {
          await adminClient
            .from('staff_member_roles')
            .insert({
              staff_member_id: staffId,
              role_code: roleCode,
              is_active: true,
              granted_at: new Date().toISOString()
            })
        }
      }
    }
  }

  return data
}

export async function createStaffMember(params: {
  email: string
  passwordStr: string
  fullName: string
  role: string
  team: string
  extraRoles: string[]
  phone?: string
}) {
  const adminClient = await createAdminClient()
  
  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.passwordStr,
    email_confirm: true,
    phone: params.phone || undefined,
    user_metadata: { full_name: params.fullName, phone: params.phone }
  })
  
  if (authError) throw new Error(authError.message)
  const authUserId = authData.user.id
  
  // 2. Insert staff member
  const { data: staff, error: insertError } = await adminClient
    .from('staff_members')
    .insert({
      auth_user_id: authUserId,
      full_name: params.fullName,
      staff_role: params.role,
      team_code: params.team,
      is_active: true
    })
    .select()
    .single()
    
  if (insertError) {
    // Attempt clean up of auth user
    await adminClient.auth.admin.deleteUser(authUserId).catch(() => {})
    throw new Error(insertError.message)
  }
  
  // 3. Grant extra roles if any
  if (params.extraRoles && params.extraRoles.length > 0) {
    for (const r of params.extraRoles) {
      await adminClient
        .from('staff_member_roles')
        .insert({
          staff_member_id: staff.id,
          role_code: r,
          is_active: true,
          granted_at: new Date().toISOString()
        })
    }
  }
  
  return staff
}

export async function deleteStaffMember(staffId: string) {
  const adminClient = await createAdminClient()
  
  // Fetch auth_user_id first to delete from auth
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('auth_user_id')
    .eq('id', staffId)
    .maybeSingle()
    
  if (staff) {
    // Clear references in requests table to avoid FK violation
    await adminClient
      .from('requests')
      .update({ assigned_reviewer_staff_id: null })
      .eq('assigned_reviewer_staff_id', staffId)
      
    await adminClient
      .from('requests')
      .update({ reviewer_decided_by_staff_id: null })
      .eq('reviewer_decided_by_staff_id', staffId)

    await adminClient
      .from('requests')
      .update({ reviewer_assigned_by_staff_id: null })
      .eq('reviewer_assigned_by_staff_id', staffId)
      
    // Delete staff member roles
    await adminClient
      .from('staff_member_roles')
      .delete()
      .eq('staff_member_id', staffId)
      
    // Delete from staff_members
    await adminClient
      .from('staff_members')
      .delete()
      .eq('id', staffId)
      
    // Delete from auth
    if (staff.auth_user_id) {
      await adminClient.auth.admin.deleteUser(staff.auth_user_id).catch(() => {})
    }
  }
  return true
}

export async function archiveStaffMember(staffId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('staff_members')
    .update({
      is_archived: true,
      is_active: false,
      archived_at: new Date().toISOString()
    })
    .eq('id', staffId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  return data
}

export async function unarchiveStaffMember(staffId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('staff_members')
    .update({
      is_archived: false,
      is_active: true,
      archived_at: null
    })
    .eq('id', staffId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  return data
}

/**
 * PHASE 1A: Reviewer Assignment DAL
 */

const TOKEN_SECRET = process.env.SUPABASE_SECRET_KEY || 'findora-secret-token-key';

export function generateAcceptanceToken(requestId: string, reviewerStaffId: string): string {
  const payload = JSON.stringify({ requestId, reviewerStaffId, expiresAt: Date.now() + 48 * 60 * 60 * 1000 }); // 48 hr expiry
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

export function verifyAcceptanceToken(token: string): { requestId: string, reviewerStaffId: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { payload, signature } = decoded;
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return null;

    const data = JSON.parse(payload);
    if (data.expiresAt < Date.now()) return null; // Expired

    return { requestId: data.requestId, reviewerStaffId: data.reviewerStaffId };
  } catch (e) {
    return null;
  }
}

export async function acceptTaskWithToken(token: string) {
  const verified = verifyAcceptanceToken(token)
  if (!verified) {
    return { success: false, error: 'Invalid or expired task acceptance token.' }
  }

  const adminClient = await createAdminClient()

  // Verify the request is still assigned to this reviewer
  const { data: request, error: fetchError } = await adminClient
    .from('requests')
    .select('id, assigned_reviewer_staff_id, reviewer_assignment_status')
    .eq('id', verified.requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'Associated customer request not found.' }
  }

  if (request.assigned_reviewer_staff_id !== verified.reviewerStaffId) {
    return { success: false, error: 'This task is no longer assigned to you.' }
  }

  // Update status to accepted
  const { error: updateError } = await adminClient
    .from('requests')
    .update({
      reviewer_assignment_status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', verified.requestId)

  if (updateError) {
    log.error('Failed to accept task:', updateError)
    return { success: false, error: 'Failed to update task assignment status.' }
  }

  return { success: true, requestId: verified.requestId }
}

export async function assignReviewerToRequest(params: {
  requestId: string
  reviewerStaffId: string
  assignedByStaffId?: string | null
}) {
  const adminClient = await createAdminClient()

  const { data: staff } = await adminClient
    .from('staff_members')
    .select('id, is_active, staff_role')
    .eq('id', params.reviewerStaffId)
    .single()

  if (!staff || !staff.is_active) throw new Error('Target reviewer is invalid or inactive')

  const { data: extraRoles } = await adminClient
    .from('staff_member_roles')
    .select('role_code')
    .eq('staff_member_id', staff.id)
    .eq('role_code', 'reviewer')
    .eq('is_active', true)

  const isEligible = staff.staff_role === 'reviewer' || (extraRoles && extraRoles.length > 0)
  if (!isEligible) throw new Error('Target staff member does not have reviewer capability')

  // Generate acceptance token
  const token = generateAcceptanceToken(params.requestId, params.reviewerStaffId)

  const { data, error } = await adminClient
    .from('requests')
    .update({
      assigned_reviewer_staff_id: params.reviewerStaffId,
      reviewer_assignment_status: 'assigned',
      reviewer_assigned_at: new Date().toISOString(),
      reviewer_assigned_by_staff_id: params.assignedByStaffId || null
    })
    .eq('id', params.requestId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Fetch staff email/phone to send notifications
  try {
    const { data: hrDetails } = await adminClient
      .from('staff_hr_details')
      .select('email, phone')
      .eq('staff_id', params.reviewerStaffId)
      .maybeSingle()

    if (hrDetails) {
      const acceptUrl = `http://localhost:3000/staff/tasks/accept/${token}`
      const message = `Hello, you have been assigned to review request ${data.request_code} ("${data.title}"). Click here to accept: ${acceptUrl}`
      
      log.info(`[STAFF TASK ASSIGNMENT] Sending email to ${hrDetails.email}: ${message}`)
      
      if (hrDetails.phone) {
        const waLink = `https://wa.me/${hrDetails.phone}?text=${encodeURIComponent(message)}`
        log.info(`[STAFF TASK ASSIGNMENT] Generated WhatsApp link: ${waLink}`)
      }
    }
  } catch (err: any) {
    log.warn('[STAFF TASK ASSIGNMENT] Notification queuing failed:', err.message)
  }

  return data
}

export async function unassignReviewerFromRequest(requestId: string, assignedByStaffId: string) {
  const adminClient = await createAdminClient()

  const { data, error } = await adminClient
    .from('requests')
    .update({
      assigned_reviewer_staff_id: null,
      reviewer_assignment_status: 'unassigned',
      reviewer_assigned_at: null,
      reviewer_assigned_by_staff_id: null
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getReviewerOpenLoad() {
  const adminClient = await createAdminClient()

  const [reqsRes, uiStatusRes] = await Promise.all([
    adminClient.from('requests').select('id, current_status, reviewer_decision, assigned_reviewer_staff_id, is_archived'),
    adminClient.from('v_request_ui_status').select('request_id, client_released_at')
  ])

  if (reqsRes.error) return {}

  const releasedMap = new Map((uiStatusRes.data || []).map((r: any) => [r.request_id, r.client_released_at]))
  
  const loadMap: Record<string, number> = {}
  
  reqsRes.data.forEach((row: any) => {
    const state = resolveRequestState({
      ...row,
      client_released_at: releasedMap.get(row.id)
    })
    
    // Workload is anything assigned but still in INTAKE
    if (row.assigned_reviewer_staff_id && state === 'INTAKE') {
      loadMap[row.assigned_reviewer_staff_id] = (loadMap[row.assigned_reviewer_staff_id] || 0) + 1
    }
  })

  return loadMap
}

export async function getAssignableReviewers() {
  const adminClient = await createAdminClient()

  // Get staff with primary role 'reviewer'
  const { data: primary, error: pErr } = await adminClient
    .from('staff_members')
    .select('id, full_name, staff_role')
    .eq('is_active', true)

  if (pErr) throw new Error(pErr.message)

  // Get staff with secondary role 'reviewer'
  const { data: extra, error: eErr } = await adminClient
    .from('staff_member_roles')
    .select('staff_member_id')
    .eq('role_code', 'reviewer')
    .eq('is_active', true)

  if (eErr) throw new Error(eErr.message)

  const extraIds = new Set((extra || []).map((r: any) => r.staff_member_id))

  const reviewers = (primary || []).filter((s: any) => 
    s.staff_role === 'reviewer' || extraIds.has(s.id)
  )

  return reviewers
}

export async function autoAssignReviewerToRequest(requestId: string, assignedByStaffId?: string | null) {
  const reviewers = await getAssignableReviewers()
  const eligible = reviewers.filter((r: any) => r.staff_role !== 'admin' && r.staff_role !== 'owner')

  if (eligible.length === 0) {
    if (reviewers.length === 0) throw new Error('No eligible reviewers available for auto-assignment')
  }

  const pool = eligible.length > 0 ? eligible : reviewers

  const loadMap = await getReviewerOpenLoad()

  const sorted = pool.map((r: any) => ({
    id: r.id,
    load: loadMap[r.id] || 0
  })).sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load
    return a.id.localeCompare(b.id)
  })

  const winner = sorted[0]

  return assignReviewerToRequest({
    requestId,
    reviewerStaffId: winner.id,
    assignedByStaffId: assignedByStaffId || null
  })
}

export async function getAssignedReviewerSummaryForRequest(requestId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('requests')
    .select('assigned_reviewer_staff_id, reviewer_assignment_status')
    .eq('id', requestId)
    .single()
  
  if (error || !data) return null

  let full_name = null
  if (data.assigned_reviewer_staff_id) {
    const { data: staff } = await adminClient
      .from('staff_members')
      .select('full_name')
      .eq('id', data.assigned_reviewer_staff_id)
      .maybeSingle()
    full_name = staff?.full_name || null
  }

  return {
    ...data,
    staff_members: full_name ? { full_name } : null
  }
}

export async function getCurrentAssignedLoadCount(staffId: string, authUserId?: string) {
  const stats = await getAdminGlobalStats(staffId, authUserId)
  return stats.actionableLoad
}

export async function updateRequestPricing(params: {
  requestId: string
  requestKind: string
  pricingModel: string
  paymentPolicy: string
  serviceFeeAmount: number
  pricingNotes?: string | null
  staffId: string
}) {
  const adminClient = await createAdminClient()

  const { error } = await adminClient
    .from('requests')
    .update({
      request_kind: params.requestKind,
      pricing_model: params.pricingModel,
      payment_policy: params.paymentPolicy,
      service_fee_amount: params.serviceFeeAmount,
      pricing_notes: params.pricingNotes,
    })
    .eq('id', params.requestId)

  if (error) throw new Error(error.message)

  // Log audit event
  await adminClient.from('request_status_history').insert({
    request_id: params.requestId,
    transition_name: 'PRICING_UPDATED',
    changed_by_staff_id: params.staffId,
    change_reason: 'Pricing and scope policy updated manually by staff',
    metadata: {
      request_kind: params.requestKind,
      pricing_model: params.pricingModel,
      payment_policy: params.paymentPolicy,
      service_fee_amount: params.serviceFeeAmount
    },
    event_source: 'staff_action'
  } as any)
}
