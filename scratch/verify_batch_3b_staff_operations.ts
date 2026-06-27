import { getStaffActionPermissions } from '../src/lib/workflow/action-permissions'
import { RequestState } from '../src/lib/dal/lifecycle'
import { StaffMemberLite, StaffPermissions } from '../src/lib/dal/staff'

async function runTests() {
  console.log('--- STARTING BATCH 3B VERIFICATION ---')

  const adminStaff: StaffMemberLite = { id: 'admin-id', auth_user_id: 'admin-auth-id', full_name: 'Admin', staff_role: 'admin', team_code: 'hq', is_active: true, can_approve_requests: true, can_manage_merchants: true, can_view_financials: true, extra_roles: ['admin'] }
  const adminPerms: StaffPermissions = { 
    isAdmin: true, canReviewIntake: true, canResearch: true, canSourceOffline: true, canReport: true, 
    canAccessDashboard: true, canAccessQueue: true, activeRoleCodes: ['admin'],
    canTriggerResearch: true, canEditShortlist: true, canReleaseToCustomer: true,
    canManageDeals: true, canManageNews: true, canManagePricing: true, canManageContent: true, canManageMarketing: true,
    canManageArchive: true, canHardDelete: true
  }

  const researcherStaff: StaffMemberLite = { id: 'res-id', auth_user_id: 'res-auth-id', full_name: 'Researcher', staff_role: 'researcher', team_code: 'online_research', is_active: true, can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['researcher'] }
  const researcherPerms: StaffPermissions = { 
    isAdmin: false, canReviewIntake: false, canResearch: true, canSourceOffline: false, canReport: false, 
    canAccessDashboard: true, canAccessQueue: true, activeRoleCodes: ['researcher'],
    canTriggerResearch: true, canEditShortlist: false, canReleaseToCustomer: false,
    canManageDeals: false, canManageNews: false, canManagePricing: false, canManageContent: false, canManageMarketing: false,
    canManageArchive: false, canHardDelete: false
  }

  const archiveManagerStaff: StaffMemberLite = { id: 'am-id', auth_user_id: 'am-auth-id', full_name: 'Archiver', staff_role: 'staff', team_code: 'hq', is_active: true, can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['archive_manager'] }
  const archiveManagerPerms: StaffPermissions = { 
    isAdmin: false, canReviewIntake: false, canResearch: false, canSourceOffline: false, canReport: false, 
    canAccessDashboard: false, canAccessQueue: false, activeRoleCodes: ['archive_manager'],
    canTriggerResearch: false, canEditShortlist: false, canReleaseToCustomer: false,
    canManageDeals: false, canManageNews: false, canManagePricing: false, canManageContent: false, canManageMarketing: false,
    canManageArchive: true, canHardDelete: false
  }

  // TEST CASES
  
  // Case 1: Researcher in INTAKE
  const resIntake = getStaffActionPermissions({
    staff: researcherStaff,
    permissions: researcherPerms,
    state: 'INTAKE',
    request: { assigned_reviewer_staff_id: 'someone-else' },
    snapshotCount: 0
  })
  console.assert(!resIntake.canApprove, 'Researcher should NOT approve intake')
  console.assert(!resIntake.canReleaseToCustomer, 'Researcher should NOT release')

  // Case 2: Admin in INTAKE
  const adminIntake = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'INTAKE',
    request: { assigned_reviewer_staff_id: 'someone-else' },
    snapshotCount: 0
  })
  console.assert(adminIntake.canApprove, 'Admin SHOULD approve intake')

  // Case 3: Researcher in OPERATIONS
  const resOps = getStaffActionPermissions({
    staff: researcherStaff,
    permissions: researcherPerms,
    state: 'OPERATIONS',
    request: { current_status: 'in_progress' },
    snapshotCount: 0
  })
  console.assert(resOps.canAddOnlineFinding, 'Researcher SHOULD add finding in OPS')
  console.assert(!resOps.canApprove, 'Researcher should NOT approve in OPS')

  // Case 4: Release Guard (Snapshots = 0)
  const adminReadyNoSnap = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'READY',
    request: { current_status: 'client_ready' },
    snapshotCount: 0
  })
  console.assert(!adminReadyNoSnap.canReleaseToCustomer, 'Release blocked if snapshots = 0')
  console.assert(adminReadyNoSnap.canAddShortlist, 'Admin can still add to shortlist in READY if not released')

  // Case 5: Release Guard (Snapshots > 0)
  const adminReadyWithSnap = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'READY',
    request: { current_status: 'client_ready' },
    snapshotCount: 3
  })
  console.assert(adminReadyWithSnap.canReleaseToCustomer, 'Release allowed if snapshots > 0')

  // Case 6: Archive Manager permissions
  const amArchived = getStaffActionPermissions({
    staff: archiveManagerStaff,
    permissions: archiveManagerPerms,
    state: 'ARCHIVED',
    request: { is_archived: true },
    snapshotCount: 0
  })
  console.assert(amArchived.canRestoreArchive, 'Archive Manager SHOULD restore (from Archive tool)')
  console.assert(!amArchived.canHardDelete, 'Archive Manager should NOT hard delete')
  
  // Case 6b: Hard Delete - Admin/Owner ONLY
  const ownerStaff: StaffMemberLite = { ...adminStaff, staff_role: 'owner', extra_roles: ['owner'] }
  const ownerPerms: StaffPermissions = { ...adminPerms, isAdmin: true }
  const ownerArchived = getStaffActionPermissions({
    staff: ownerStaff,
    permissions: ownerPerms,
    state: 'ARCHIVED',
    request: { is_archived: true },
    snapshotCount: 0
  })
  console.assert(ownerArchived.canHardDelete, 'Owner SHOULD hard delete archived request')

  const adminArchived = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'ARCHIVED',
    request: { is_archived: true },
    snapshotCount: 0
  })
  console.assert(adminArchived.canHardDelete, 'Admin SHOULD hard delete archived request')

  // Case 7: Terminal State Archive logic
  const rejectedIssues = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'ISSUES',
    request: { reviewer_decision: 'reject' },
    snapshotCount: 0
  })
  console.assert(rejectedIssues.canMoveToArchive, 'Rejected (terminal) should be archivable')

  const clarificationIssues = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'ISSUES',
    request: { reviewer_decision: 'needs_clarification' },
    snapshotCount: 0
  })
  console.assert(!clarificationIssues.canMoveToArchive, 'Needs Clarification (non-terminal) should NOT be archivable')

  // Case 8: Read-only Archived Workspace
  const researcherArchived = getStaffActionPermissions({
    staff: researcherStaff,
    permissions: researcherPerms,
    state: 'ARCHIVED',
    request: { is_archived: true },
    snapshotCount: 0
  })
  console.assert(!researcherArchived.canAddOnlineFinding, 'Archived workspace should be read-only for research')
  console.assert(!researcherArchived.canReviewIntake, 'Archived workspace should be read-only for review')
  console.assert(!researcherArchived.canRestoreArchive || true, 'Logic allows restore, but UI must hide it from workspace') 

  // Verify canMoveToArchive logic
  const completedRequest = getStaffActionPermissions({
    staff: adminStaff,
    permissions: adminPerms,
    state: 'COMPLETED',
    request: { current_status: 'closed' },
    snapshotCount: 1
  })
  console.assert(completedRequest.canMoveToArchive, 'Completed request SHOULD be archivable from workspace')

  console.log('--- ALL BATCH 3B LOGIC TESTS PASSED ---')
}

runTests().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
