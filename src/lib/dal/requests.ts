import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { resolveRequestState, QUEUE_MEMBERSHIP } from './lifecycle'
import { logPlatformEvent, logCustomerIntelEvent } from './intelligence'
import { queueCommunication } from './communications'
import { createLogger } from '@/lib/utils/logger'
import crypto from 'node:crypto'
import { resolveCustomerServiceFee } from '@/lib/pricing/feeResolvers'

const log = createLogger('DAL:requests')

async function fetchUiStatusInChunks(adminClient: any, requestIds: string[]) {
  if (requestIds.length === 0) return []
  const chunkSize = 100
  const results: any[] = []
  for (let i = 0; i < requestIds.length; i += chunkSize) {
    const chunk = requestIds.slice(i, i + chunkSize)
    const { data, error } = await adminClient
      .from('v_request_ui_status')
      .select('request_id, client_released_at')
      .in('request_id', chunk)
    if (error) throw new Error(error.message)
    if (data) results.push(...data)
  }
  return results
}

export type CreateSourcingRequestParams = {
  customerId: string
  title: string
  rawDescription: string
  status: string
  channel: string
  requestKind?: string | null
  intakeMode?: string | null
  pricingDecision?: string | null
  serviceFeeAmount?: number | null
  executionRequested?: boolean
  followupRequested?: boolean
  siteVisitRequested?: boolean
  pricingNotes?: string | null
  pricingModel?: string | null
  paymentPolicy?: string | null
  referenceImagePath?: string | null
  autoSubmit?: boolean
  preferences: any
}

export async function createSourcingRequest(params: CreateSourcingRequestParams) {
  const adminClient = await createAdminClient()

  const requestCode = `REQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`

  // Resolve Customer Name and Phone for dual-write
  const { data: customer, error: customerErr } = await adminClient
    .from('customers')
    .select('full_name, phone_number_raw, phone_number_normalized')
    .eq('id', params.customerId)
    .single()

  if (customerErr) {
    throw new Error(`Failed to resolve customer: ${customerErr.message}`)
  }

  const customerName = customer.full_name || 'Valued Customer'
  const customerPhone = customer.phone_number_raw || customer.phone_number_normalized || ''

  // Resolve Customer Service Fee
  let serviceFeeAmount = 299
  try {
    const resolution = await resolveCustomerServiceFee(params.customerId)
    serviceFeeAmount = resolution.fee
  } catch (err: any) {
    log.warn('[DAL:requests] Error resolving customer service fee (using 299 fallback):', err.message)
  }

  const requestId = crypto.randomUUID()

  const allowedKinds = ['everyday_purchase', 'high_value_asset', 'project_supply', 'general']
  let finalRequestKind = 'general'
  const incomingKind = params.requestKind?.trim()

  if (incomingKind && allowedKinds.includes(incomingKind)) {
    finalRequestKind = incomingKind
  } else if (incomingKind === 'product' || incomingKind === 'service') {
    finalRequestKind = 'everyday_purchase'
  } else if (incomingKind === 'high_value_deals') {
    finalRequestKind = 'high_value_asset'
  } else if (incomingKind === 'projects_supplies') {
    finalRequestKind = 'project_supply'
  }

  const { data: rpcResult, error: rpcError } = await adminClient.rpc('fn_create_sourcing_request', {
    p_request_id: requestId,
    p_customer_id: params.customerId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_product_name: params.title,
    p_category: params.requestKind || 'everyday_purchase',
    p_target_location: params.preferences?.preferred_governorate || 'Cairo',
    p_max_price: params.preferences?.budget_max ? Number(params.preferences.budget_max) : undefined,
    p_additional_notes: params.rawDescription || '',
    p_request_code: requestCode,
    p_title: params.title,
    p_raw_description: params.rawDescription || '',
    p_status: params.status,
    p_channel: params.channel,
    p_request_kind: finalRequestKind,
    p_intake_mode: params.intakeMode || 'quick',
    p_pricing_decision: params.pricingDecision || 'pending_review',
    p_service_fee_amount: serviceFeeAmount,
    p_execution_requested: params.executionRequested ?? false,
    p_followup_requested: params.followupRequested ?? false,
    p_site_visit_requested: params.siteVisitRequested ?? false,
    p_reference_image_path: params.referenceImagePath || undefined,
    p_preferences: params.preferences || {}
  })

  if (rpcError) throw new Error(rpcError.message)

  const data = (rpcResult as any).request

  // --- BATCH 4A: INTEL & COMM HOOKS ---
  try {
    await Promise.all([
      // 1. Log Platform Event
      logPlatformEvent({
        eventType: 'request_submitted',
        actorType: 'customer',
        actorId: params.customerId,
        requestId: data.id,
        customerId: params.customerId,
        metadata: { source_channel: params.channel, request_kind: params.requestKind }
      }),
      // 2. Log Customer Intel
      logCustomerIntelEvent({
        customerId: params.customerId,
        eventType: 'request_created',
        requestId: data.id
      }),
      // 3. Queue "Request Received" Communication (DRAFT)
      queueCommunication({
        customerId: params.customerId,
        requestId: data.id,
        templateCode: 'request_received',
        variables: {
          request_code: data.request_code || '',
          request_title: data.title || ''
        },
        status: 'draft' // Safety: Batch 4A is draft-only
      })
    ])
  } catch (err: any) {
    log.warn('[INTEL/COMM] Hook failed (non-blocking):', err.message)
  }

  return data
}

export async function getCustomerRequests(customerId: string) {
  const adminClient = await createAdminClient()

  // 1. Fetch base requests to verify ownership
  const { data: baseReqs, error: baseError } = await adminClient
    .from('requests')
    .select(`
      id,
      request_code,
      title,
      current_status,
      raw_description,
      reviewer_notes,
      reviewer_decision,
      created_at,
      updated_at
    `)
    .eq('customer_id', customerId)
    .eq('is_archived', false)
    .is('cancelled_at', null)
    .order('created_at', { ascending: false })

  if (baseError) {
    throw new Error(baseError.message)
  }

  if (!baseReqs || baseReqs.length === 0) return []

  const requestIds = baseReqs.map(r => r.id)

  // 2. Fetch UI status data from view and request preferences
  const [uiStatusRes, prefsRes] = await Promise.all([
    adminClient.from('v_request_ui_status').select('*').in('request_id', requestIds),
    adminClient.from('request_preferences').select('*').in('request_id', requestIds)
  ])

  if (uiStatusRes.error) {
    throw new Error(uiStatusRes.error.message)
  }

  const uiMap = new Map((uiStatusRes.data || []).map((u: any) => [u.request_id, u]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 3. Merge and map
  return baseReqs.map((row: any) => {
    const ui = uiMap.get(row.id)
    const prefs = prefsMap.get(row.id)
    
    return {
      ...row,
      request_id: row.id,
      customer_visible_status: ui?.customer_visible_status || row.current_status,
      pipeline_completion_pct: ui?.pipeline_completion_pct || 0,
      client_released_at: ui?.client_released_at || null,
      latest_report_id: ui?.latest_report_id || null,
      latest_report_status: ui?.latest_report_status || null,
      snapshot_count: ui?.snapshot_count || 0,
      unlock_count: ui?.unlock_count || 0,
      request_created_at: row.created_at,
      request_updated_at: row.updated_at,
      // preferences
      budget_min: prefs?.budget_min || null,
      budget_max: prefs?.budget_max || null,
      urgency_level: prefs?.urgency_level || 'normal',
      priority_focus: prefs?.priority_focus || null,
      search_scope: prefs?.search_scope || 'both',
      preferred_governorate: prefs?.preferred_governorate || null,
      preferred_area: prefs?.preferred_area || null,
      delivery_needed: prefs?.delivery_needed || false,
    }
  })
}

export async function getIntakeQueueRequests(staffId?: string) {
  const adminClient = await createAdminClient()

  // 1. Query directly by materialized canonical_state
  let query = adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reference_image_path, customer_id, reviewer_decision, reviewer_notes, assigned_reviewer_staff_id, reviewer_assignment_status, reviewer_assigned_at, reviewer_assigned_by_staff_id, created_at, updated_at, is_archived')
    .eq('canonical_state', 'INTAKE')

  if (staffId) {
    query = query.eq('assigned_reviewer_staff_id', staffId)
  }

  const reqsRes = await query
  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const intakeRows = reqsRes.data as any[]

  if (intakeRows.length === 0) return []

  const requestIds = intakeRows.map((r: any) => r.id)


  const customerIds = Array.from(new Set(intakeRows.map((r: any) => r.customer_id).filter(Boolean)))
  const reviewerIds = Array.from(new Set(intakeRows.map((r: any) => r.assigned_reviewer_staff_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes, staffRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name, email, phone_number_raw, phone_number_normalized').in('id', customerIds),
    adminClient.from('request_preferences').select('*').in('request_id', requestIds),
    reviewerIds.length > 0 
      ? adminClient.from('staff_members').select('id, full_name').in('id', reviewerIds)
      : Promise.resolve({ data: [] })
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))
  const staffMap = new Map((staffRes.data || []).map((s: any) => [s.id, s.full_name]))

  // 4. Final Mapping (Deduplicated)
  const items = intakeRows.map((row: any) => {
    const cust = customerMap.get(row.customer_id)
    const prefs = prefsMap.get(row.id)
    
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      request_updated_at: row.updated_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: cust?.full_name || '-',
      customer_email: cust?.email || null,
      phone_number_raw: cust?.phone_number_raw || null,
      phone_number_normalized: cust?.phone_number_normalized || null,
      budget_min: prefs?.budget_min || null,
      budget_max: prefs?.budget_max || null,
      urgency_level: prefs?.urgency_level || 'normal',
      priority_focus: prefs?.priority_focus || null,
      search_scope: prefs?.search_scope || 'both',
      preferred_governorate: prefs?.preferred_governorate || null,
      preferred_area: prefs?.preferred_area || null,
      delivery_needed: prefs?.delivery_needed || false,
      assigned_reviewer_name: row.assigned_reviewer_staff_id ? staffMap.get(row.assigned_reviewer_staff_id) : null,
      intake_stage: row.assigned_reviewer_staff_id ? 'pending_staff_review' : 'pending_ai_review'
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unique = new Map()
  for (const i of items) if (!unique.has(i.id)) unique.set(i.id, i)
  return Array.from(unique.values())
}

export async function getReadyQueueRequests() {
  const adminClient = await createAdminClient()
  
  // 1. Query directly by materialized canonical_state
  const reqsRes = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reviewer_decision, created_at, reference_image_path, customer_id, is_archived')
    .eq('canonical_state', 'READY')

  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const readyRows = reqsRes.data as any[]

  if (readyRows.length === 0) return []

  const requestIds = readyRows.map((r: any) => r.id)


  const customerIds = Array.from(new Set(readyRows.map((r: any) => r.customer_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name').in('id', customerIds),
    adminClient.from('request_preferences').select('request_id, urgency_level, search_scope, preferred_governorate, preferred_area').in('request_id', requestIds)
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c.full_name]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 4. Map in memory (Deduplicated)
  const results = readyRows.map((row: any) => {
    const prefs = prefsMap.get(row.id)
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: customerMap.get(row.customer_id) || '-',
      urgency_level: prefs?.urgency_level || 'normal',
      search_scope: prefs?.search_scope || 'both',
      preferred_governorate: prefs?.preferred_governorate || null,
      preferred_area: prefs?.preferred_area || null
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  log.info(`[DAL] getReadyQueueRequests: Found ${results.length} ready requests.`)
  const unique = new Map()
  for (const r of results) if (!unique.has(r.id)) unique.set(r.id, r)
  return Array.from(unique.values())
}

export async function getCompletedQueueRequests() {
  const adminClient = await createAdminClient()
  
  // 1. Query directly by materialized canonical_state
  const reqsRes = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reviewer_decision, created_at, reference_image_path, customer_id, is_archived')
    .eq('canonical_state', 'COMPLETED')

  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const completedRows = reqsRes.data as any[]

  if (completedRows.length === 0) return []

  const requestIds = completedRows.map((r: any) => r.id)


  const customerIds = Array.from(new Set(completedRows.map((r: any) => r.customer_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name').in('id', customerIds),
    adminClient.from('request_preferences').select('request_id, urgency_level, search_scope').in('request_id', requestIds)
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c.full_name]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 4. Map in memory (Deduplicated)
  const results = completedRows.map((row: any) => {
    const prefs = prefsMap.get(row.id)
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: customerMap.get(row.customer_id) || '-',
      urgency_level: prefs?.urgency_level || 'normal',
      search_scope: prefs?.search_scope || 'both'
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  log.info(`[DAL] getCompletedQueueRequests: Found ${results.length} completed requests.`)
  const unique = new Map()
  for (const r of results) if (!unique.has(r.id)) unique.set(r.id, r)
  return Array.from(unique.values())
}

export async function getIssuesQueueRequests() {
  const adminClient = await createAdminClient()
  
  // 1. Query directly by materialized canonical_state
  const reqsRes = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reviewer_decision, created_at, reference_image_path, customer_id, is_archived')
    .eq('canonical_state', 'ISSUES')

  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const issuesRows = reqsRes.data as any[]

  if (issuesRows.length === 0) return []

  const requestIds = issuesRows.map((r: any) => r.id)


  const customerIds = Array.from(new Set(issuesRows.map((r: any) => r.customer_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name').in('id', customerIds),
    adminClient.from('request_preferences').select('request_id, urgency_level, search_scope').in('request_id', requestIds)
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c.full_name]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 4. Map in memory (Deduplicated)
  const results = issuesRows.map((row: any) => {
    const prefs = prefsMap.get(row.id)
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: customerMap.get(row.customer_id) || '-',
      urgency_level: prefs?.urgency_level || 'normal',
      search_scope: prefs?.search_scope || 'both'
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unique = new Map()
  for (const r of results) if (!unique.has(r.id)) unique.set(r.id, r)
  return Array.from(unique.values())
}

export async function getRejectedQueueRequests() {
  const adminClient = await createAdminClient()
  
  // 1. Query directly by materialized canonical_state
  const reqsRes = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reviewer_decision, created_at, reference_image_path, customer_id, is_archived')
    .eq('canonical_state', 'REJECTED')

  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const rejectedRows = reqsRes.data as any[]

  if (rejectedRows.length === 0) return []

  const requestIds = rejectedRows.map((r: any) => r.id)


  const customerIds = Array.from(new Set(rejectedRows.map((r: any) => r.customer_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name').in('id', customerIds),
    adminClient.from('request_preferences').select('request_id, urgency_level, search_scope').in('request_id', requestIds)
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c.full_name]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 4. Map in memory (Deduplicated)
  const results = rejectedRows.map((row: any) => {
    const prefs = prefsMap.get(row.id)
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: customerMap.get(row.customer_id) || '-',
      urgency_level: prefs?.urgency_level || 'normal',
      search_scope: prefs?.search_scope || 'both'
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unique = new Map()
  for (const r of results) if (!unique.has(r.id)) unique.set(r.id, r)
  return Array.from(unique.values())
}

export async function getOperationsQueueRequests() {
  const adminClient = await createAdminClient()

  // 1. Query directly by materialized canonical_state
  const reqsRes = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, reviewer_decision, created_at, reference_image_path, customer_id, is_archived')
    .eq('canonical_state', 'OPERATIONS')

  if (reqsRes.error) throw new Error(reqsRes.error.message)
  const operationsRows = reqsRes.data as any[]

  if (operationsRows.length === 0) return []

  const requestIds = operationsRows.map((r: any) => r.id)
  const { data: opData, error: opErr } = await adminClient
    .from('request_operational_states')
    .select('request_id, client_released_at')
    .in('request_id', requestIds)
  if (opErr) throw new Error(opErr.message)
  const releasedMap = new Map((opData || []).map((r: any) => [r.request_id, r.client_released_at]))


  const customerIds = Array.from(new Set(operationsRows.map((r: any) => r.customer_id).filter(Boolean)))

  // 3. Fetch associated data independently
  const [customersRes, prefsRes] = await Promise.all([
    adminClient.from('customers').select('id, full_name').in('id', customerIds),
    adminClient.from('request_preferences').select('request_id, urgency_level, search_scope, preferred_governorate, preferred_area').in('request_id', requestIds)
  ])

  const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c.full_name]))
  const prefsMap = new Map((prefsRes.data || []).map((p: any) => [p.request_id, p]))

  // 4. Map in memory (Deduplicated)
  const results = operationsRows.map((row: any) => {
    const prefs = prefsMap.get(row.id)
    return {
      ...row,
      request_id: row.id,
      request_created_at: row.created_at,
      has_reference_image: !!row.reference_image_path,
      customer_name: customerMap.get(row.customer_id) || '-',
      urgency_level: prefs?.urgency_level || 'normal',
      search_scope: prefs?.search_scope || 'both',
      preferred_governorate: prefs?.preferred_governorate || null,
      preferred_area: prefs?.preferred_area || null,
      client_released_at: releasedMap.get(row.id) || null
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  log.info(`[DAL] getOperationsQueueRequests: Found ${results.length} operations requests.`)
  const unique = new Map()
  for (const r of results) if (!unique.has(r.id)) unique.set(r.id, r)
  return Array.from(unique.values())
}

export async function submitRequestToProcessing(params: {
  p_request_id: string
  p_note?: string
}) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc(
    'fn_submit_request_for_processing',
    params
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function updateRequestStatus(requestId: string, status: string) {
  const adminClient = await createAdminClient()

  // --- CANONICAL STATE ENFORCEMENT ---
  const [reqRes, uiStatusRes] = await Promise.all([
    adminClient.from('requests').select('id, current_status, reviewer_decision, is_archived').eq('id', requestId).single(),
    adminClient.from('v_request_ui_status').select('client_released_at').eq('request_id', requestId).maybeSingle()
  ])

  const request = reqRes.data
  if (!request) throw new Error('Request not found')

  const state = resolveRequestState({
    ...request,
    client_released_at: uiStatusRes.data?.client_released_at
  })

  if (state === 'ARCHIVED') throw new Error('BLOCK: Cannot mutate an archived request.')

  const { data, error } = await adminClient
    .from('requests')
    .update({ current_status: status })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function trackRequestByCodeAndPhone(requestCode: string, phoneNormalized: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('fn_guest_track_request_by_code_and_phone', {
    p_request_code: requestCode,
    p_phone_normalized: phoneNormalized
  })

  if (error) throw new Error(error.message)
  return data?.[0] || null
}
export async function getArchivedRequestsAdmin() {
  const adminClient = await createAdminClient()
  const { data: requests, error } = await (adminClient as any)
    .from('requests')
    .select('id, request_code, title, raw_description, current_status, request_kind, created_at, reference_image_path, customer_id, is_archived, archived_at, archive_reason')
    .or('is_archived.eq.true,current_status.eq.cancelled')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!requests || requests.length === 0) return []

  const customerIds = Array.from(new Set(requests.map((r: any) => r.customer_id).filter(Boolean)))
  const { data: customers } = await adminClient.from('customers').select('id, full_name').in('id', customerIds as string[])
  const customerMap = new Map((customers || []).map((c: any) => [c.id, c.full_name]))

  const items = requests.map((row: any) => ({
    ...row,
    request_id: row.id,
    request_created_at: row.created_at,
    has_reference_image: !!row.reference_image_path,
    customer_name: customerMap.get(row.customer_id) || '-'
  }))

  const unique = new Map()
  for (const i of items) if (!unique.has(i.id)) unique.set(i.id, i)
  return Array.from(unique.values())
}

export async function archiveRequestAdmin(requestId: string, actorUserId: string, reason?: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await (adminClient as any).rpc('fn_archive_request', {
    p_request_id: requestId,
    p_actor_user_id: actorUserId,
    p_reason: reason || 'Manual archive by admin'
  })

  if (error) throw new Error(error.message)
  return data
}

export async function restoreRequestAdmin(requestId: string, actorUserId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await (adminClient as any).rpc('fn_restore_request', {
    p_request_id: requestId,
    p_actor_user_id: actorUserId
  })

  if (error) throw new Error(error.message)
  return data
}

export async function getReferenceImageBase64(path: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient.storage
    .from('request-reference-images')
    .download(path)

  if (error) throw new Error(error.message)
  
  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return {
    data: buffer.toString('base64'),
    mimeType: data.type
  }
}
