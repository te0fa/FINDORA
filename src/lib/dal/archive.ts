import { createAdminClient } from './customers'
import { resolveRequestState, RequestState } from './lifecycle'
import { resolveStaffIdForAudit } from './audit'

export type ArchiveFilterStatus = RequestState | 'ALL' | 'REJECTED' | 'ALL_CLEANUP_SAFE'

export type ArchiveRequestFilter = {
  status?: ArchiveFilterStatus
  requestKind?: string | 'ALL'
  backupStatus?: 'ALL' | 'missing' | 'prepared' | 'deleted'
  search?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

/**
 * Fetches requests eligible for the Archive/Cleanup UI.
 * Terminal states: COMPLETED, ARCHIVED, REJECTED.
 * 
 * IMPORTANT: Backups (request_delete_backups) have NO Foreign Key to requests.
 * We MUST fetch them separately and merge in JavaScript.
 */
export async function getArchiveRequestsAdmin(filter: ArchiveRequestFilter = {}) {
  const { 
    status = 'ARCHIVED', 
    backupStatus = 'ALL', 
    search, 
    limit = 50, 
    offset = 0,
    dateFrom,
    dateTo,
    requestKind
  } = filter

  const adminClient = await createAdminClient()

  // 1. Fetch Candidate Requests from public.requests only
  // We fetch a broad set of candidates to allow JS filtering for released status and backups
  let query = adminClient
    .from('requests')
    .select('id, request_code, title, current_status, reviewer_decision, is_archived, created_at, customer_id, request_kind')

  // Apply SQL-level candidate filters
  if (status === 'ARCHIVED') {
    query = query.or('is_archived.eq.true,current_status.eq.cancelled')
  } else if (status === 'REJECTED') {
    query = query.eq('reviewer_decision', 'reject').eq('is_archived', false).not('current_status', 'eq', 'cancelled')
  } else if (status === 'COMPLETED') {
    // Candidates for COMPLETED: closed OR non-archived candidates that might be released
    query = query.or('current_status.eq.closed,current_status.eq.reporting,current_status.eq.client_ready').eq('is_archived', false).not('current_status', 'eq', 'cancelled')
  } else if (status === 'ALL_CLEANUP_SAFE') {
    // Candidates: archived OR closed OR rejected OR potential released OR cancelled
    query = query.or('is_archived.eq.true,current_status.eq.closed,reviewer_decision.eq.reject,current_status.eq.reporting,current_status.eq.client_ready,current_status.eq.cancelled')
  }

  if (search) {
    query = query.or(`request_code.ilike.%${search}%,title.ilike.%${search}%`)
  }
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)
  if (requestKind && requestKind !== 'ALL') query = query.eq('request_kind', requestKind)

  // Initial order in SQL
  query = query.order('created_at', { ascending: false })

  const { data: requests, error } = await query
  if (error) {
    console.error('[DAL] Archive Fetch Error:', error)
    throw new Error(error.message)
  }

  if (!requests || requests.length === 0) {
    return { items: [], total: 0, limit, offset }
  }

  const ids = requests.map(r => r.id)
  const customerIds = Array.from(new Set(requests.map(r => r.customer_id).filter(Boolean)))

  // 2. Fetch v_request_ui_status separately (for released status)
  // TASK B: Do not embed join with v_request_ui_status
  const { data: uiStatuses } = await adminClient
    .from('v_request_ui_status')
    .select('request_id, client_released_at')
    .in('request_id', ids)

  const uiStatusMap = new Map(uiStatuses?.map(s => [s.request_id, s.client_released_at]) || [])

  // 3. Fetch request_delete_backups separately
  // TASK A: Remove embedded join. Backups have no FK.
  const { data: backups } = await adminClient
    .from('request_delete_backups')
    .select('id, request_id, created_at, delete_confirmed')
    .in('request_id', ids)
    .order('created_at', { ascending: false })

  // Build latest backup map (request_id -> latest backup)
  const latestBackupMap = new Map()
  backups?.forEach(b => {
    if (!latestBackupMap.has(b.request_id)) {
      latestBackupMap.set(b.request_id, b)
    }
  })

  // 4. Fetch Customers separately (optional but safe)
  const { data: customers } = await adminClient
    .from('customers')
    .select('id, full_name')
    .in('id', customerIds)

  const customerMap = new Map(customers?.map(c => [c.id, c.full_name]) || [])

  // 5. Merge and Filter in TypeScript
  let items = requests.map(row => {
    const releasedAt = uiStatusMap.get(row.id) || null
    const state = resolveRequestState({
      is_archived: row.is_archived,
      current_status: row.current_status,
      reviewer_decision: row.reviewer_decision,
      client_released_at: releasedAt
    })

    const b = latestBackupMap.get(row.id)
    const b_status: 'missing' | 'prepared' | 'deleted' = !b ? 'missing' : (b.delete_confirmed ? 'deleted' : 'prepared')

    return {
      id: row.id,
      request_code: row.request_code,
      title: row.title,
      customer_name: customerMap.get(row.customer_id) || '-',
      state,
      is_terminal: state === 'COMPLETED' || state === 'ARCHIVED' || (state === 'ISSUES' && row.reviewer_decision === 'reject'),
      created_at: row.created_at,
      latest_backup_id: b?.id || null,
      backup_created_at: b?.created_at || null,
      backup_delete_confirmed: b?.delete_confirmed || false,
      backup_status: b_status,
      is_delete_safe: (state === 'COMPLETED' || state === 'ARCHIVED' || (state === 'ISSUES' && row.reviewer_decision === 'reject')) && b_status === 'prepared'
    }
  })

  // 6. Strict Status Filter Refinement in JS
  if (status === 'ARCHIVED') {
    items = items.filter(i => i.state === 'ARCHIVED')
  } else if (status === 'COMPLETED') {
    items = items.filter(i => i.state === 'COMPLETED')
  } else if (status === 'REJECTED') {
    // REJECTED is issues + is_terminal
    items = items.filter(i => i.state === 'ISSUES' && i.is_terminal)
  } else if (status === 'ALL_CLEANUP_SAFE') {
    items = items.filter(i => i.is_terminal)
  }

  // 7. Backup Status Filter in JS
  if (backupStatus !== 'ALL') {
    items = items.filter(i => i.backup_status === backupStatus)
  }

  // 8. Final Total and Pagination (Deduplicated)
  const uniqueByRequestId = new Map()
  for (const item of items) {
    if (!uniqueByRequestId.has(item.id)) {
      uniqueByRequestId.set(item.id, item)
    }
  }
  const deduplicatedItems = Array.from(uniqueByRequestId.values()) as typeof items

  const total = deduplicatedItems.length
  const paginatedItems = deduplicatedItems.slice(offset, offset + limit)

  return { 
    items: paginatedItems, 
    total, 
    limit, 
    offset 
  }
}

/**
 * Builds a comprehensive JSONB backup of a request and all its operational children.
 */
export async function buildRequestDeleteBackupAdmin(requestId: string, actorUserId: string) {
  const adminClient = await createAdminClient()
  const staffId = await resolveStaffIdForAudit(actorUserId)
  if (!staffId) throw new Error('BLOCK: Unauthorized. Staff record not found.')

  // 1. Fetch the base request to ensure it exists
  const { data: request, error: reqErr } = await adminClient
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqErr || !request) throw new Error('Request not found.')

  // 2. Fetch all related tables verified in live audit
  const [
    preferences,
    history,
    runs,
    items,
    shortlist,
    quotes,
    reports,
    optionSnapshots,
    offers,
    approvals,
    payments,
    reveals
  ] = await Promise.all([
    adminClient.from('request_preferences').select('*').eq('request_id', requestId),
    adminClient.from('request_status_history').select('*').eq('request_id', requestId),
    adminClient.from('research_runs').select('*').eq('request_id', requestId),
    adminClient.from('research_items').select('*').eq('request_id', requestId),
    adminClient.from('request_candidate_shortlists').select('*').eq('request_id', requestId),
    adminClient.from('merchant_quotes').select('*').eq('request_id', requestId),
    adminClient.from('reports').select('*').eq('request_id', requestId),
    adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId),
    adminClient.from('offers').select('*').eq('request_id', requestId),
    adminClient.from('approvals').select('*').eq('request_id', requestId),
    adminClient.from('payments').select('*').eq('request_id', requestId),
    adminClient.from('source_reveals').select('*').eq('request_id', requestId)
  ])

  // 3. Construct the deep JSON backup
  const backup_json = {
    request,
    preferences: preferences.data || [],
    history: history.data || [],
    research_runs: runs.data || [],
    research_items: items.data || [],
    shortlist: shortlist.data || [],
    merchant_quotes: quotes.data || [],
    reports: reports.data || [],
    report_option_snapshots: optionSnapshots.data || [],
    offers: offers.data || [],
    approvals: approvals.data || [],
    payments: payments.data || [],
    source_reveals: reveals.data || [],
    metadata: {
      backed_up_at: new Date().toISOString(),
      backed_up_by_staff_id: staffId,
      request_code: request.request_code,
      table_counts: {
        preferences: (preferences.data || []).length,
        history: (history.data || []).length,
        runs: (runs.data || []).length,
        items: (items.data || []).length,
        shortlist: (shortlist.data || []).length,
        quotes: (quotes.data || []).length,
        reports: (reports.data || []).length,
        snapshots: (optionSnapshots.data || []).length,
        offers: (offers.data || []).length,
        approvals: (approvals.data || []).length,
        payments: (payments.data || []).length,
        reveals: (reveals.data || []).length
      }
    }
  }

  // 4. Check for existing backup
  const { data: existingBackup } = await adminClient
    .from('request_delete_backups')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle()

  let backup, backupErr
  if (existingBackup) {
    const { data: updated, error } = await adminClient
      .from('request_delete_backups')
      .update({
        backup_json,
        created_by_staff_id: staffId,
        delete_confirmed: false
      })
      .eq('id', existingBackup.id)
      .select()
      .single()
    backup = updated
    backupErr = error
  } else {
    const { data: inserted, error } = await adminClient
      .from('request_delete_backups')
      .insert({
        request_id: requestId,
        request_code: request.request_code,
        backup_json,
        created_by_staff_id: staffId,
        delete_confirmed: false
      })
      .select()
      .single()
    backup = inserted
    backupErr = error
  }

  if (backupErr) throw new Error(backupErr.message)

  // 5. Log Audit Event
  await adminClient.from('request_deletion_audit').insert({
    request_id: requestId,
    backup_id: backup!.id,
    event_type: 'BACKUP_CREATED',
    actor_staff_id: staffId,
    notes: `Full backup generated with ${backup_json.metadata.table_counts.items} research items and ${backup_json.metadata.table_counts.snapshots} report snapshots.`
  })

  return backup
}

/**
 * Executes the hard deletion via RPC.
 */
export async function hardDeleteRequestWithBackupAdmin(params: {
  requestId: string
  backupId: string
  actorUserId: string
  notes?: string
}) {
  const adminClient = await createAdminClient()
  const staffId = await resolveStaffIdForAudit(params.actorUserId)
  if (!staffId) throw new Error('BLOCK: Unauthorized. Staff record not found.')

  const { data, error } = await (adminClient as any).rpc('fn_hard_delete_request_with_backup', {
    p_request_id: params.requestId,
    p_backup_id: params.backupId,
    p_actor_staff_id: staffId,
    p_delete_notes: params.notes || null
  })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Retrieves a backup for download.
 */
export async function getRequestDeleteBackupAdmin(backupId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('request_delete_backups')
    .select('*')
    .eq('id', backupId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
