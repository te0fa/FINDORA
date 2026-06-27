import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('DAL:timeline')

export interface TimelineEvent {
  event_id: string;
  request_id: string;
  transition_name: string;
  from_canonical_state: string | null;
  to_canonical_state: string | null;
  notes: string | null;
  event_at: string;
  event_source: string;
  actor_name: string | null;
  metadata: any;
}

/**
 * Standardized fetch for the deterministic request timeline.
 */
export async function getRequestTimeline(
  requestId: string, 
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<TimelineEvent[]> {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('v_request_timeline')
    .select('*')
    .eq('request_id', requestId)
    .order('event_at', { ascending: sortOrder === 'asc' })
    .order('event_source', { ascending: true })
    .order('event_id', { ascending: true });

  if (error) {
    log.error(`[DAL] getRequestTimeline error: ${error.message}`);
    throw new Error(error.message);
  }

  return (data || []) as any;
}

export async function logTimelineEvent(params: {
  requestId: string;
  transitionName: string;
  notes?: string | null;
  changedByStaffId?: string | null;
  eventSource?: string;
  metadata?: any;
}) {
  try {
    const adminClient = await createAdminClient();
    
    // Fetch current status of request to keep history consistent
    const { data: req } = await adminClient
      .from('requests')
      .select('current_status, is_archived, reviewer_decision')
      .eq('id', params.requestId)
      .single();

    const currentStatus = req?.current_status || 'open';
    const reviewerDecision = req?.reviewer_decision || null;
    const isArchived = req?.is_archived || false;
    
    // Resolve canonical state helper
    const resolveState = (archived: boolean, status: string, decision: string | null) => {
      if (archived) return 'ARCHIVED';
      if (status === 'closed') return 'COMPLETED';
      if (status === 'client_ready') return 'READY';
      if (decision === 'reject' || decision === 'needs_clarification') return 'ISSUES';
      if (decision === 'approve') return 'OPERATIONS';
      return 'INTAKE';
    };

    const canonicalState = resolveState(isArchived, currentStatus, reviewerDecision);

    const { error } = await adminClient
      .from('request_status_history')
      .insert({
        request_id: params.requestId,
        from_status: currentStatus,
        to_status: currentStatus,
        from_canonical_state: canonicalState,
        to_canonical_state: canonicalState,
        transition_name: params.transitionName,
        changed_by_staff_id: params.changedByStaffId || null,
        change_reason: params.notes || null,
        event_source: params.eventSource || 'staff_action',
        metadata: params.metadata || {}
      });

    if (error) {
      log.warn('[DAL] logTimelineEvent insert error:', error.message);
    }
  } catch (err: any) {
    log.warn('[DAL] logTimelineEvent failed:', err.message);
  }
}
