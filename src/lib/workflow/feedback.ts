// src/lib/workflow/feedback.ts
import { createAdminClient } from '@/lib/dal/customers';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('workflow/feedback')

export async function handleClientFeedback(requestId: string, message: string): Promise<boolean> {
  const adminClient = await createAdminClient();

  try {
    // 1. Fetch current request status for logging
    const { data: request, error: reqError } = await adminClient
      .from('requests')
      .select('current_status, customer_id, title, assigned_reviewer_staff_id')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      log.error(`[FEEDBACK_ERROR] Request not found: ${requestId}`);
      return false;
    }

    // 2. Save message to request_messages (Incoming client communication)
    try {
      const { error: msgErr } = await adminClient
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: request.customer_id,
          sender_type: 'customer',
          message: message,
          metadata: {
            subject: `Client feedback regarding request`,
            channel: 'email'
          }
        });

      if (msgErr) throw msgErr;
    } catch (err) {
      // Fallback: save inside public.outbound_messages (as incoming status)
      const { error: fallbackErr } = await adminClient
        .from('outbound_messages')
        .insert({
          request_id: requestId,
          customer_id: request.customer_id,
          channel: 'email',
          recipient: 'system',
          rendered_subject: `[CLIENT_FEEDBACK] Feedback Received`,
          rendered_body: message,
          status: 'received',
          sent_at: new Date().toISOString()
        });
      if (fallbackErr) {
        log.error("[FEEDBACK_ERROR] Failed to save message fallback:", fallbackErr.message);
      }
    }

    // 3. Update status to CLIENT_FEEDBACK_PENDING
    // We update current_status to 'client_feedback_pending' in requests table
    const { error: updateErr } = await adminClient
      .from('requests')
      .update({
        current_status: 'client_feedback_pending'
      })
      .eq('id', requestId);

    if (updateErr) {
      log.error("[FEEDBACK_ERROR] Failed to update request status:", updateErr.message);
      return false;
    }

    // 4. Log the transition manually in request_status_history
    const { error: histErr } = await adminClient
      .from('request_status_history')
      .insert({
        request_id: requestId,
        from_status: request.current_status,
        to_status: 'client_feedback_pending',
        from_canonical_state: 'OPERATIONS', // approximate or resolve
        to_canonical_state: 'ISSUES',
        transition_name: 'CLIENT_FEEDBACK_RECEIVED',
        change_reason: message,
        changed_by_staff_id: null,
        metadata: { client_message: message }
      } as any);
    if (histErr) {
      log.warn("[FEEDBACK_WARN] Failed to write history transition:", histErr.message);
    }

    log.info("[CLIENT_FEEDBACK_RECEIVED]", requestId);

    // 5. Notify assigned staff immediately
    if (request.assigned_reviewer_staff_id) {
      log.info(`[NOTIFY_STAFF] Staff member ${request.assigned_reviewer_staff_id} notified of client feedback on request ${requestId}`);
    }

    return true;

  } catch (err: any) {
    log.error("[FEEDBACK_CRITICAL_FAIL] Failed to handle client feedback:", err.message);
    return false;
  }
}
