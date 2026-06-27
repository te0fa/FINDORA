import { createAdminClient } from './customers';
import { resolveRequestState } from './lifecycle';
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:audit');


/**
 * Safely resolves a staff_member.id (UUID) from an auth_user_id.
 * Never throws; returns null if resolution fails.
 */
export async function resolveStaffIdForAudit(authUserId?: string | null): Promise<string | null> {
  if (!authUserId) return null;
  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('staff_members')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      log.warn(`[AUDIT] Staff resolution error for ${authUserId}:`, error.message);
      return null;
    }
    return data?.id || null;
  } catch (err: any) {
    log.warn(`[AUDIT] Staff resolution critical error for ${authUserId}:`, err.message);
    return null;
  }
}

/**
 * High-Coverage Operational Audit Logging (Fast Path)
 * 
 * Standardizes non-transition operational events in the request audit trail.
 * Logs "in-place" events to request_status_history where the canonical state
 * remains unchanged but the staff action is recorded.
 */
export async function logOperationalEvent(params: {
  requestId: string;
  staffId: string;
  eventName: string;
  metadata?: any;
  notes?: string | null;
}) {
  const { requestId, staffId, eventName, metadata = {}, notes = null } = params;

  try {
    const adminClient = await createAdminClient();

    // 1. Fetch current request state for "in-place" consistency
    // Use maybeSingle() to prevent unhandled exceptions if rows are missing
    const [reqRes, uiStatusRes] = await Promise.all([
      adminClient
        .from('requests')
        .select('current_status, reviewer_decision, is_archived')
        .eq('id', requestId)
        .maybeSingle(),
      adminClient
        .from('v_request_ui_status')
        .select('client_released_at')
        .eq('request_id', requestId)
        .maybeSingle()
    ]);

    if (reqRes.error || !reqRes.data) {
      log.warn(`[AUDIT] Skip log: Request ${requestId} not found.`);
      return;
    }

    // 2. Resolve current canonical state
    const currentStatus = reqRes.data.current_status;
    const resolvedState = resolveRequestState({
      current_status: currentStatus,
      reviewer_decision: reqRes.data.reviewer_decision,
      is_archived: reqRes.data.is_archived,
      client_released_at: uiStatusRes.data?.client_released_at || null
    });

    // 3. Write in-place audit event
    const { error: insertError } = await adminClient
      .from('request_status_history')
      .insert({
        request_id: requestId,
        changed_by_staff_id: staffId,
        transition_name: eventName,
        from_status: currentStatus,
        to_status: currentStatus,
        from_canonical_state: resolvedState,
        to_canonical_state: resolvedState,
        change_reason: notes,
        metadata: metadata,
        event_source: 'staff_action'
      });

    if (insertError) {
      log.error(`[AUDIT] Database write failed for ${eventName}:`, insertError.message);
    } else {
      log.info(`[AUDIT] Logged ${eventName} for request ${requestId}`);
    }
  } catch (err: any) {
    // NON-BLOCKING: Log failure to server logs but do not crash the user action
    log.error(`[AUDIT] Critical error logging ${eventName}:`, err.message);
  }
}

/**
 * High-Coverage Customer Audit Logging
 * 
 * Records actions taken by customers (e.g., unlocking options) in the request timeline.
 * Since request_status_history is staff-centric, we store customer context in metadata
 * and set event_source to 'customer_action'.
 */
export async function logCustomerEvent(params: {
  requestId: string;
  customerId: string;
  customerName: string;
  eventName: string;
  metadata?: any;
  notes?: string | null;
}) {
  const { requestId, customerId, customerName, eventName, metadata = {}, notes = null } = params;

  try {
    const adminClient = await createAdminClient();

    const [reqRes, uiStatusRes] = await Promise.all([
      adminClient
        .from('requests')
        .select('current_status, reviewer_decision, is_archived')
        .eq('id', requestId)
        .maybeSingle(),
      adminClient
        .from('v_request_ui_status')
        .select('client_released_at')
        .eq('request_id', requestId)
        .maybeSingle()
    ]);

    if (reqRes.error || !reqRes.data) return;

    const currentStatus = reqRes.data.current_status;
    const resolvedState = resolveRequestState({
      current_status: currentStatus,
      reviewer_decision: reqRes.data.reviewer_decision,
      is_archived: reqRes.data.is_archived,
      client_released_at: uiStatusRes.data?.client_released_at || null
    });

    await adminClient
      .from('request_status_history')
      .insert({
        request_id: requestId,
        changed_by_staff_id: null,
        transition_name: eventName,
        from_status: currentStatus,
        to_status: currentStatus,
        from_canonical_state: resolvedState,
        to_canonical_state: resolvedState,
        change_reason: notes,
        metadata: {
          ...metadata,
          customer_id: customerId,
          customer_name: customerName,
          event_actor_type: 'customer'
        },
        event_source: 'customer_action'
      });

    log.info(`[AUDIT] Logged ${eventName} for customer ${customerName} on request ${requestId}`);
  } catch (err: any) {
    log.error(`[AUDIT] Critical error logging ${eventName}:`, err.message);
  }
}
