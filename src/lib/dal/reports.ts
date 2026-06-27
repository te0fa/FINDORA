import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getCustomerByAuthId } from './customers'
import { logCustomerEvent } from './audit'
import { getRequestUiStatus } from './staff'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:reports');


/**
 * Mask sensitive source details if the report option is still locked.
 * Used for preview reports before unlock payment.
 */
function parseLat(loc: string | null): number | null {
  if (!loc) return null
  const match = loc.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (match) return parseFloat(match[1])
  const urlMatch = loc.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (urlMatch) return parseFloat(urlMatch[1])
  return null
}

function parseLng(loc: string | null): number | null {
  if (!loc) return null
  const match = loc.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (match) return parseFloat(match[2])
  const urlMatch = loc.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (urlMatch) return parseFloat(urlMatch[2])
  return null
}

export function maskSourceDetails(snapshot: any) {
  if (!snapshot) return snapshot
  const isLocked = snapshot.reveal_locked !== false

  // Capture hidden fields for mapping but exclude from the returned object to prevent leakage
  const hidden_merchant_name = snapshot.hidden_merchant_name
  const hidden_reference_url = snapshot.hidden_reference_url
  const hidden_contact_notes = snapshot.hidden_contact_notes
  const hidden_merchant_location = snapshot.hidden_merchant_location

  // Strip all hidden_ fields from the base object
  const cleanSnapshot = Object.keys(snapshot)
    .filter(key => !key.startsWith('hidden_'))
    .reduce((obj, key) => {
      obj[key] = snapshot[key]
      return obj
    }, {} as any)

  const base = {
    ...cleanSnapshot,
    // Add normalized fields for UI consistency
    revealedSourceText: isLocked ? '*** Locked ***' : (hidden_merchant_name || 'N/A'),
    revealedSourceUrl: isLocked ? '#' : (hidden_reference_url || '#'),
    revealedContactInfo: isLocked ? '*** Locked ***' : (hidden_contact_notes || 'N/A'),
    revealedMerchantLocation: isLocked ? '*** Locked ***' : (hidden_merchant_location || null),
    latitude: isLocked ? null : parseLat(hidden_merchant_location),
    longitude: isLocked ? null : parseLng(hidden_merchant_location),
    
    // Legacy support for verifier and existing UI
    merchant_name: isLocked ? '*** Locked ***' : hidden_merchant_name,
  }

  if (isLocked) {
    return {
      ...base,
      phone_number: '*** Locked ***',
      contact_person: '*** Locked ***',
      address: '*** Locked ***',
      listing_url: '#',
      source_details: 'Source details are locked. Pay the unlock fee to reveal full merchant contact and location.',
    }
  }

  return base
}

export async function getReportOptionSnapshotsByReportId(reportId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('report_option_snapshots')
    .select('*, option_label:display_title, reason_summary:highlight_summary')
    .eq('report_id', reportId)
    .order('display_rank', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getReportOptionSnapshotsByRequestId(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('report_option_snapshots')
    .select('*')
    .eq('request_id', requestId)
    .order('display_rank', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function unlockReportOption(p_report_option_snapshot_id: string, p_actor_user_id: string) {
  const adminClient = await createAdminClient()

  // 1. Fetch snapshot details with ownership chain (derive requestId)
  const { data: snapshot, error: snapshotError } = await adminClient
    .from('report_option_snapshots')
    .select('request_id, report_id, option_label:display_title, reveal_locked')
    .eq('id', p_report_option_snapshot_id)
    .single()

  if (snapshotError || !snapshot) {
    throw new Error(`Snapshot not found: ${snapshotError?.message || 'No record'}`)
  }

  // 2. Fetch request details to verify ownership
  const { data: request, error: requestError } = await adminClient
    .from('requests')
    .select('customer_id')
    .eq('id', snapshot.request_id)
    .single()

  if (requestError || !request) {
    throw new Error(`Associated request not found: ${requestError?.message || 'No record'}`)
  }

  // 3. Fetch customer profile for the actor and verify ownership
  const { data: customer } = await adminClient
    .from('customers')
    .select('id, auth_user_id, full_name')
    .eq('auth_user_id', p_actor_user_id)
    .single()

  if (!customer || customer.id !== request.customer_id) {
    throw new Error('BLOCK: Unauthorized. You do not own this request.')
  }

  // 4. Verify release status (Guard against pre-release unlocks)
  const { data: uiStatus } = await adminClient
    .from('v_request_ui_status')
    .select('client_released_at')
    .eq('request_id', snapshot.request_id)
    .single()

  if (!uiStatus?.client_released_at) {
    throw new Error('BLOCK: Cannot unlock options for an unreleased report.')
  }

  // Idempotency check: If already unlocked, return success without another audit log
  // This MUST happen after authorization to prevent info leaks
  if (snapshot.reveal_locked === false) {
    return { 
      data: snapshot, 
      request_id: snapshot.request_id, 
      already_unlocked: true 
    }
  }

  // 5. Execute DB Unlock
  // We use direct admin DAL update only after strict ownership + release guards because the 
  // DB RPC (fn_unlock_report_option) relies on auth.uid() context and is not callable 
  // safely from this verified server-admin path where we might be using the service key.
  const { data, error: updateError } = await adminClient
    .from('report_option_snapshots')
    .update({ reveal_locked: false })
    .eq('id', p_report_option_snapshot_id)
    .eq('reveal_locked', true) // Concurrency & Idempotency safety
    .select()
    .single()

  if (updateError) {
    // If update failed, check if it was because it was already unlocked by a race condition
    const { data: current } = await adminClient
      .from('report_option_snapshots')
      .select('reveal_locked')
      .eq('id', p_report_option_snapshot_id)
      .single()
    
    if (current && current.reveal_locked === false) {
      return { 
        data: snapshot, 
        request_id: snapshot.request_id, 
        already_unlocked: true 
      }
    }
    throw new Error(`Unlock failed: ${updateError.message}`)
  }

  // 6. Log Audit Event (Non-blocking)
  await logCustomerEvent({
    requestId: snapshot.request_id,
    customerId: customer.id,
    customerName: customer.full_name,
    eventName: 'CUSTOMER_OPTION_UNLOCKED',
    metadata: {
      snapshot_id: p_report_option_snapshot_id,
      report_id: snapshot.report_id,
      option_label: snapshot.option_label
    }
  })

  return { data, request_id: snapshot.request_id }
}

/* compatibility exports for existing UI */
export async function getReportSnapshots(id: string): Promise<any[]> {
  try {
    const byReport = await getReportOptionSnapshotsByReportId(id)
    if (byReport?.length) return byReport
  } catch { }

  return getReportOptionSnapshotsByRequestId(id)
}

export async function unlockSnapshot(p_report_option_snapshot_id: string, p_actor_user_id: string) {
  return unlockReportOption(p_report_option_snapshot_id, p_actor_user_id)
}

/**
 * PHASE 2: Rewired from v_request_overview → v_request_ui_status
 *
 * Column map (verified 2026-04-21 from live DB):
 *   title                        → report page heading
 *   customer_name                → customer display (was request.customers?.full_name)
 *   current_status               → internal status
 *   customer_visible_status      → customer-facing status badge
 *   report_ready                 → boolean gate
 *   client_released_at           → non-null = report published
 *   snapshot_count               → total options
 *   unlock_count                 → customer-unlocked options
 *   customer_reveal_completion_pct → reveal progress
 *   latest_report_id             → for reference
 */
export async function getRequestOverview(requestId: string) {
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('v_request_ui_status')
    .select(
      'request_id, title, customer_name, current_status, customer_visible_status, report_ready, client_released_at, snapshot_count, unlock_count, customer_reveal_completion_pct, latest_report_id, latest_report_status, pipeline_completion_pct'
    )
    .eq('request_id', requestId)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Surface as a graceful null rather than a thrown error (page handles null)
    return null
  }

  return data
}
/**
 * Batch 2D Step 3: Secure Customer Report Access
 * Resolves request overview only if owned by the actor and released.
 */
export async function getCustomerRequestOverview(requestId: string, actorUserId: string) {
  const adminClient = await createAdminClient()
  
  // 1. Resolve actor customer
  const customer = await getCustomerByAuthId(actorUserId)
  if (!customer) return null

  // 2. Verify ownership on raw requests table FIRST
  const { data: rawReq } = await adminClient
    .from("requests")
    .select("customer_id")
    .eq("id", requestId)
    .single()

  if (!rawReq || rawReq.customer_id !== customer.id) {
    return null
  }

  const { data: request, error } = await adminClient
    .from("v_request_ui_status")
    .select("*")
    .eq("request_id", requestId)
    .limit(1)
    .maybeSingle()

  if (error || !request) return null

  // 4. Verify release status
  if (!request.client_released_at) return null

  return request
}

/**
 * Batch 2D Step 3: Secure Customer Snapshot Access
 * Fetches snapshots only if owned by the actor and released.
 */
export async function getCustomerReportSnapshots(requestId: string, actorUserId: string) {
  // Reuse the overview guard to verify ownership and release status
  const overview = await getCustomerRequestOverview(requestId, actorUserId)
  if (!overview) return []

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from("report_option_snapshots")
    .select("*, option_label:display_title, reason_summary:highlight_summary")
    .eq("request_id", requestId)
    .order("display_rank", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []).map(maskSourceDetails)
}


export async function getReportByRequestIdAdmin(requestId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('reports')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`[DAL] getReportByRequestIdAdmin failed: ${error.message}`)
  if (!data) return null

  const { data: snapshots } = await adminClient
    .from('report_option_snapshots')
    .select('*')
    .eq('request_id', requestId)
    .order('display_rank', { ascending: true })

  return {
    ...data,
    snapshots: snapshots?.map(maskSourceDetails) || []
  }
}

export async function getOrCreateReportForRequestAdmin(requestId: string, actorUserId: string) {
  const adminClient = await createAdminClient()
  
  let report = await getReportByRequestIdAdmin(requestId)
  
  if (!report) {
    const { data, error } = await adminClient
      .from('reports')
      .insert({
        request_id: requestId,
        generated_by: actorUserId,
        report_status: 'draft'
      })
      .select()
      .single()

    if (error) throw new Error(`[DAL] Failed to create report: ${error.message}`)
    report = data as any
  }

  return report
}

export async function listReportOptionsForRequestAdmin(requestId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('report_option_snapshots')
    .select('*')
    .eq('request_id', requestId)
    .order('display_rank', { ascending: true })

  if (error) throw new Error(`[DAL] listReportOptionsForRequestAdmin failed: ${error.message}`)
  return data
}

export async function upsertReportOptionSnapshotAdmin(params: {
  id?: string
  report_id: string
  request_id: string
  display_title: string
  highlight_summary: string
  display_rank: number
  candidate_channel?: string
  hidden_merchant_name?: string
  hidden_source_url?: string
  hidden_reference_url?: string
  hidden_contact_notes?: string
  reveal_locked?: boolean
  display_price_amount?: number
  currency_code?: string
}) {
  const adminClient = await createAdminClient()
  
  const payload = {
    report_id: params.report_id,
    request_id: params.request_id,
    display_title: params.display_title,
    highlight_summary: params.highlight_summary,
    display_rank: params.display_rank,
    candidate_channel: params.candidate_channel || 'unknown',
    hidden_merchant_name: params.hidden_merchant_name || null,
    hidden_reference_url: params.hidden_reference_url || params.hidden_source_url || null,
    hidden_contact_notes: params.hidden_contact_notes || null,
    reveal_locked: params.reveal_locked ?? true,
    display_price_amount: params.display_price_amount || 0,
    currency_code: params.currency_code || 'EGP'
  }

  if (params.id) {
    const { data, error } = await adminClient
      .from('report_option_snapshots')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw new Error(`[DAL] Update snapshot failed: ${error.message}`)
    return data
  } else {
    const { data, error } = await adminClient
      .from('report_option_snapshots')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(`[DAL] Insert snapshot failed: ${error.message}`)
    return data
  }
}

export async function deleteReportOptionSnapshotAdmin(snapshotId: string) {
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('report_option_snapshots')
    .delete()
    .eq('id', snapshotId)

  if (error) throw new Error(`[DAL] Delete snapshot failed: ${error.message}`)
  return true
}

export async function markReportReadyAdmin(requestId: string, actorUserId: string) {
  const adminClient = await createAdminClient()
  const { executeTransition } = await import('./transitions')
  const { queueCommunication } = await import('./communications')

  // 1. Fetch Staff Member
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('id')
    .eq('auth_user_id', actorUserId)
    .single()
  
  if (!staff) throw new Error('Staff member not found.')

  // 2. Validate Request Content (Business Logic)
  const [request, snapshots, customer] = await Promise.all([
    adminClient.from('requests').select('*').eq('id', requestId).single(),
    adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId),
    adminClient.from('v_request_ui_status').select('customer_id, preferred_language, request_code, title').eq('request_id', requestId).single()
  ])

  if (request.error || !request.data) throw new Error('Request not found.')
  const req = request.data
  const cust = customer.data

  if (!snapshots.data || snapshots.data.length === 0) {
    throw new Error('BLOCK: At least one snapshot is required.')
  }

  for (const snap of snapshots.data) {
    if (!snap.display_title) throw new Error('BLOCK: Every snapshot must have a display title.')
    if (snap.display_rank === null || snap.display_rank === undefined) throw new Error('BLOCK: Every snapshot must have a rank.')
    
    if (req.payment_policy === 'pay_after_preview') {
      const hasHidden = snap.hidden_merchant_name || snap.hidden_reference_url || snap.hidden_contact_notes
      if (!hasHidden) throw new Error('BLOCK: Snapshots for pay_after_preview must have at least one hidden source/contact field.')
    }
  }

  if (!req.request_kind || !req.pricing_model || !req.payment_policy) {
    throw new Error('BLOCK: Request pricing details (kind, model, policy) are incomplete.')
  }

  if ((req.payment_policy === 'pay_after_preview' || req.payment_policy === 'upfront_deposit') && (req.service_fee_amount || 0) <= 0) {
    throw new Error('BLOCK: service_fee_amount must be > 0 for this payment policy.')
  }

  // 3. Update Report Status
  const report = await getReportByRequestIdAdmin(requestId)
  if (report) {
    await adminClient
      .from('reports')
      .update({ report_status: 'released', approved_at: new Date().toISOString() })
      .eq('id', report.id)
  }

  // 4. Execute Transition (SIGNAL_READY or RELEASE_FINAL depending on flow)
  // We use SIGNAL_READY to move to READY state, which shows the report to the customer.
  await executeTransition('SIGNAL_READY', requestId, staff.id, 'Report marked as ready/released by builder.')

  // 5. Queue Communication Draft
  if (cust) {
    if (!cust.customer_id) {
      log.error(`[QUEUE_COMM_ERROR] Cannot queue 'report_ready' communication for request ${requestId} because customer_id is missing.`);
    } else {
      await queueCommunication({
        customerId: cust.customer_id,
        requestId: requestId,
        templateCode: 'report_ready',
        variables: {
          request_code: cust.request_code || '',
          request_title: cust.title || ''
        },
        status: 'draft'
      }).catch(err => log.warn('[DAL] Communication queue failed (non-blocking):', err.message))
    }
  }

  return { success: true }
}

export async function unlockAllSnapshotsForRequest(requestId: string) {
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('report_option_snapshots')
    .update({ reveal_locked: false })
    .eq('request_id', requestId)
    
  if (error) throw new Error(`[DAL] unlockAllSnapshotsForRequest failed: ${error.message}`)
  return true;
}

