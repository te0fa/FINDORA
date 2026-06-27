import { createAdminClient } from './customers'
import { logPlatformEvent, logCustomerIntelEvent } from './intelligence'
import { queueCommunication } from './communications'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:transitions');


export type TransitionName = 
  | 'APPROVE_INTAKE' 
  | 'REJECT_INTAKE' 
  | 'CLARIFY_INTAKE' 
  | 'RESOLVE_ISSUE' 
  | 'START_RESEARCH' 
  | 'START_FIELD_WORK' 
  | 'MOVE_TO_REPORTING' 
  | 'SIGNAL_READY' 
  | 'REVERT_TO_OPS' 
  | 'RELEASE_FINAL'

export interface TransitionResult {
  success: boolean
  from_canonical: string
  to_canonical: string
  error?: string
}

/**
 * Authoritative Request Transition Engine.
 * Delegates all business logic and history logging to a DB-side atomic transaction.
 */
export async function executeTransition(
  transitionName: TransitionName,
  requestId: string,
  actorStaffId: string,
  notes?: string | null,
  metadata: any = {}
): Promise<TransitionResult> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient.rpc('fn_execute_request_transition', {
    p_transition_name: transitionName,
    p_request_id: requestId,
    p_actor_staff_id: actorStaffId,
    p_notes: notes ?? undefined,
    p_metadata: metadata
  });

  if (error) {
    log.error(`[DAL] Transition ${transitionName} failed: ${error.message}`);
    throw new Error(error.message);
  }

  const result = data as any;

  if (!result?.success) {
    throw new Error(result?.error || `Transition ${transitionName} failed`);
  }

  // --- BATCH 4A: INTEL & COMM HOOKS ---
  try {
    // 1. Log Platform Event
    await logPlatformEvent({
      eventType: 'request_status_changed' as any, // General event for status changes
      actorType: 'staff',
      actorId: actorStaffId,
      requestId: requestId,
      metadata: { 
        transition: transitionName, 
        from_canonical: result.from_canonical, 
        to_canonical: result.to_canonical 
      }
    });

    // 2. Queue Lifecycle Communications & Log Intel Events
    const { data: req } = await adminClient.from('requests').select('customer_id, request_code, title').eq('id', requestId).single();
    
    if (req) {
      if (transitionName === 'APPROVE_INTAKE') {
        await Promise.all([
          logPlatformEvent({ eventType: 'request_accepted', actorType: 'staff', actorId: actorStaffId, requestId, customerId: req.customer_id }),
          logCustomerIntelEvent({ customerId: req.customer_id, eventType: 'request_accepted' as any, requestId }),
          queueCommunication({
            customerId: req.customer_id,
            requestId: requestId,
            templateCode: 'request_accepted',
            variables: { request_code: req.request_code || '', request_title: req.title || '' },
            status: 'draft'
          })
        ]);
      } else if (transitionName === 'REJECT_INTAKE') {
        await Promise.all([
          logPlatformEvent({ eventType: 'request_rejected', actorType: 'staff', actorId: actorStaffId, requestId, customerId: req.customer_id }),
          logCustomerIntelEvent({ customerId: req.customer_id, eventType: 'request_rejected' as any, requestId }),
          queueCommunication({
            customerId: req.customer_id,
            requestId: requestId,
            templateCode: 'request_rejected',
            variables: { request_code: req.request_code || '', request_title: req.title || '', reason: notes || 'No reason provided' },
            status: 'draft'
          })
        ]);
      } else if (transitionName === 'CLARIFY_INTAKE') {
        await Promise.all([
          logPlatformEvent({ eventType: 'clarification_needed', actorType: 'staff', actorId: actorStaffId, requestId, customerId: req.customer_id }),
          logCustomerIntelEvent({ customerId: req.customer_id, eventType: 'clarification_needed' as any, requestId }),
          queueCommunication({
            customerId: req.customer_id,
            requestId: requestId,
            templateCode: 'clarification_needed',
            variables: { request_code: req.request_code || '', request_title: req.title || '' },
            status: 'draft'
          })
        ]);
      } else if (transitionName === 'START_RESEARCH' || transitionName === 'START_FIELD_WORK') {
        await Promise.all([
          logPlatformEvent({ eventType: 'research_started', actorType: 'staff', actorId: actorStaffId, requestId, customerId: req.customer_id }),
          queueCommunication({
            customerId: req.customer_id,
            requestId: requestId,
            templateCode: 'research_started',
            variables: { request_code: req.request_code || '', request_title: req.title || '' },
            status: 'draft'
          })
        ]);
      } else if (transitionName === 'SIGNAL_READY') {
        await Promise.all([
          logPlatformEvent({ eventType: 'report_preparing', actorType: 'staff', actorId: actorStaffId, requestId, customerId: req.customer_id }),
          queueCommunication({
            customerId: req.customer_id,
            requestId: requestId,
            templateCode: 'report_ready',
            variables: { request_code: req.request_code || '', request_title: req.title || '' },
            status: 'draft'
          })
        ]);
      }
    }
  } catch (err: any) {
    log.warn('[INTEL/COMM] Transition hook failed (non-blocking):', err.message);
  }

  return {
    success: true,
    from_canonical: result.from_canonical,
    to_canonical: result.to_canonical
  };
}
