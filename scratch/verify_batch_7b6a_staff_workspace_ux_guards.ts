import { resolveRequestState } from '../src/lib/dal/lifecycle';
import { getStaffActionPermissions } from '../src/lib/workflow/action-permissions';

async function runVerification() {
  console.log('--- BATCH 7B.6A LOGIC VERIFICATION ---');

  // 1. Test resolveRequestState for REJECTED
  console.log('\n[1] Testing Canonical State: REJECTED');
  const rejectedRequest = {
    current_status: 'open',
    reviewer_decision: 'reject',
    is_archived: false,
    client_released_at: null
  };
  const rejectedState = resolveRequestState(rejectedRequest);
  console.log(`Decision: reject -> State: ${rejectedState} (Expected: REJECTED)`);
  if (rejectedState !== 'REJECTED') throw new Error('FAILED: resolveRequestState for REJECTED');

  // 2. Test resolveRequestState for COMPLETED (Closed)
  console.log('\n[2] Testing Canonical State: COMPLETED (Closed)');
  const closedRequest = {
    current_status: 'closed',
    reviewer_decision: 'approve',
    is_archived: false,
    client_released_at: null
  };
  const closedState = resolveRequestState(closedRequest);
  console.log(`Status: closed -> State: ${closedState} (Expected: COMPLETED)`);
  if (closedState !== 'COMPLETED') throw new Error('FAILED: resolveRequestState for COMPLETED (Closed)');

  // 3. Test Staff Action Permissions for Terminal State
  console.log('\n[3] Testing Mutation Guards (Terminal State)');
  const mockStaff = { id: 'staff-1', is_active: true };
  const mockPermissions = { isAdmin: false, canReviewIntake: true, canResearch: true, canReport: true, canSourceOffline: true, canManageArchive: true };
  
  const terminalPermissions = getStaffActionPermissions({
    staff: mockStaff,
    permissions: mockPermissions,
    state: 'REJECTED',
    request: { assigned_reviewer_staff_id: 'staff-1' },
    snapshotCount: 0
  });

  console.log('In REJECTED state:');
  console.log(`- canApprove: ${terminalPermissions.canApprove} (Expected: false)`);
  console.log(`- canReject: ${terminalPermissions.canReject} (Expected: false)`);
  console.log(`- canAddOnlineFinding: ${terminalPermissions.canAddOnlineFinding} (Expected: false)`);
  console.log(`- canReleaseToCustomer: ${terminalPermissions.canReleaseToCustomer} (Expected: false)`);
  console.log(`- canMoveToArchive: ${terminalPermissions.canMoveToArchive} (Expected: true)`);

  if (terminalPermissions.canApprove || terminalPermissions.canAddOnlineFinding || !terminalPermissions.canMoveToArchive) {
    throw new Error('FAILED: Mutation guards for terminal state');
  }

  // 4. Test Intake Permissions (Assigned)
  console.log('\n[4] Testing Intake Permissions (Assigned)');
  const intakePermissions = getStaffActionPermissions({
    staff: mockStaff,
    permissions: mockPermissions,
    state: 'INTAKE',
    request: { assigned_reviewer_staff_id: 'staff-1' },
    snapshotCount: 0
  });
  console.log(`Assigned Intake -> canReviewIntake: ${intakePermissions.canReviewIntake} (Expected: true)`);
  if (!intakePermissions.canReviewIntake) throw new Error('FAILED: Intake permissions');

  console.log('\n--- VERIFICATION SUCCESSFUL ---');
}

runVerification().catch(err => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
