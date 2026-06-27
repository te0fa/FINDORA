/**
 * FINDORA Canonical Lifecycle Resolver
 * Final LOCKED Version for Batch 1A
 */

export type RequestState = 
  | 'ARCHIVED' 
  | 'COMPLETED' 
  | 'READY' 
  | 'OPERATIONS' 
  | 'INTAKE' 
  | 'ISSUES' 
  | 'REJECTED'
  | 'UNKNOWN';

export interface LifecycleInput {
  is_archived?: boolean;
  current_status?: string | null;
  reviewer_decision?: string | null;
  client_released_at?: string | null;
}

/**
 * Resolves the canonical state based on the strict locking rules.
 */
export function resolveRequestState(input: LifecycleInput): RequestState {
  // 1. Archive Precedence
  if (input.is_archived || input.current_status === 'cancelled') return 'ARCHIVED';

  // 2. Completed (Terminal / Released)
  if (input.current_status === 'closed' || (input.client_released_at && input.current_status !== 'closed')) {
    return 'COMPLETED';
  }

  // 3. Ready
  if (input.current_status === 'client_ready' && !input.client_released_at) {
    return 'READY';
  }

  // 4. Rejected (Terminal Staff Decision)
  if (input.reviewer_decision === 'reject') {
    return 'REJECTED';
  }

  // 5. Issues (Needs Clarification)
  if (input.reviewer_decision === 'needs_clarification' || input.current_status === 'client_feedback_pending') {
    return 'ISSUES';
  }

  // 6. Operations
  if (
    input.reviewer_decision === 'approve' && 
    ['in_progress', 'research', 'reporting'].includes(input.current_status || '')
  ) {
    return 'OPERATIONS';
  }

  // 7. Intake
  if (
    !input.reviewer_decision && 
    ['submitted', 'open'].includes(input.current_status || '')
  ) {
    return 'INTAKE';
  }

  return 'UNKNOWN';
}

/**
 * Membership logic for queues
 */
export const QUEUE_MEMBERSHIP = {
  INTAKE: (state: RequestState) => state === 'INTAKE',
  OPERATIONS: (state: RequestState) => state === 'OPERATIONS',
  READY: (state: RequestState) => state === 'READY',
  ISSUES: (state: RequestState) => state === 'ISSUES',
  REJECTED: (state: RequestState) => state === 'REJECTED',
  COMPLETED: (state: RequestState) => state === 'COMPLETED',
  ARCHIVE: (state: RequestState) => state === 'ARCHIVED'
};
