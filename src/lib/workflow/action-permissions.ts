import { StaffMemberLite, StaffPermissions } from '../dal/staff'
import { RequestState } from '../dal/lifecycle'

export type StaffActionPermissions = {
  canReviewIntake: boolean
  canApprove: boolean
  canReject: boolean
  canRequestClarification: boolean
  canStartResearch: boolean
  canAddOnlineFinding: boolean
  canAddOfflineQuote: boolean
  canAddShortlist: boolean
  canMoveToReporting: boolean
  canPrepareBundle: boolean
  canReleaseToCustomer: boolean
  canMoveToArchive: boolean
  canRestoreArchive: boolean
  canHardDelete: boolean
  canManageArchive: boolean
  canResolveIssue: boolean
  canRevertToOps: boolean
}

export function getStaffActionPermissions({
  staff,
  permissions,
  state,
  request,
  snapshotCount
}: {
  staff: StaffMemberLite
  permissions: StaffPermissions
  state: RequestState
  request: any
  snapshotCount: number
}): StaffActionPermissions {
  const isAdmin = permissions.isAdmin
  const isAssigned = request.assigned_reviewer_staff_id === staff.id
  
  // Terminal States
  const isTerminal = state === 'COMPLETED' || state === 'REJECTED' || (state === 'ISSUES' && request.reviewer_decision === 'reject') || state === 'ARCHIVED'
  const isArchived = state === 'ARCHIVED'

  // 1. Intake / Issues
  const inIntakePhase = (state === 'INTAKE' || (state === 'ISSUES' && request.reviewer_decision === 'needs_clarification')) && !isTerminal
  const canReview = (isAdmin || permissions.canReviewIntake) && !isArchived && !hasReleased(request) && !isTerminal

  // 2. Operations
  const inOpsPhase = state === 'OPERATIONS' && !isArchived && !hasReleased(request)
  const isReporting = request.current_status === 'reporting'

  // 3. Ready / Reporting
  const inReportingPhase = (inOpsPhase && isReporting) || state === 'READY'

  return {
    // Intake/Review Actions
    canReviewIntake: canReview && inIntakePhase,
    canApprove: canReview && inIntakePhase,
    canReject: canReview && inIntakePhase,
    canRequestClarification: canReview && inIntakePhase,
    canResolveIssue: canReview && state === 'ISSUES' && request.reviewer_decision === 'needs_clarification',

    // Research Actions
    canStartResearch: (isAdmin || permissions.canResearch) && inOpsPhase && request.current_status !== 'reporting',
    canAddOnlineFinding: (isAdmin || permissions.canResearch) && inOpsPhase && !hasReleased(request),
    canAddOfflineQuote: (isAdmin || permissions.canSourceOffline) && inOpsPhase && !hasReleased(request),
    
    // Reporting Actions
    canAddShortlist: (isAdmin || permissions.canReport) && (inOpsPhase || state === 'READY') && !hasReleased(request),
    canMoveToReporting: (isAdmin || permissions.canResearch || permissions.canSourceOffline) && inOpsPhase && !isReporting,
    canPrepareBundle: (isAdmin || permissions.canReport) && inReportingPhase && !hasReleased(request) && snapshotCount === 0,
    canReleaseToCustomer: (isAdmin || permissions.canReport) && state === 'READY' && !hasReleased(request) && snapshotCount > 0,
    canRevertToOps: (isAdmin || permissions.canReport) && (state === 'READY' || (inOpsPhase && isReporting)) && !hasReleased(request),

    // Archive Actions
    canMoveToArchive: (isAdmin || permissions.canManageArchive) && isTerminal && !isArchived,
    canRestoreArchive: (isAdmin || permissions.canManageArchive) && isArchived,
    canHardDelete: isAdmin && isArchived, // Hard delete ONLY for archived
    canManageArchive: isAdmin || permissions.canManageArchive
  }
}

function hasReleased(request: any) {
  return !!request.client_released_at || request.current_status === 'closed'
}
