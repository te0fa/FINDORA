import { createAdminClient } from '../src/lib/dal/customers';
import { getRequestFullWorkspace, StaffMemberLite, getStaffUiPermissions } from '../src/lib/dal/staff';
import { resolveRequestState } from '../src/lib/dal/lifecycle';

type RequestState = 
  | 'ARCHIVED' 
  | 'COMPLETED' 
  | 'READY' 
  | 'OPERATIONS' 
  | 'INTAKE' 
  | 'ISSUES' 
  | 'UNKNOWN';

async function verifyAccessMatrix() {
  const adminClient = await createAdminClient();

  // 1. Fetch Requests and Group by State
  console.log('--- Fetching Requests ---');
  const { data: allRequests } = await adminClient
    .from('requests')
    .select('id, current_status, reviewer_decision, assigned_reviewer_staff_id, reviewer_assignment_status, reviewer_assigned_at, reviewer_assigned_by_staff_id, is_archived');
  
  const { data: uiStatuses } = await adminClient
    .from('v_request_ui_status')
    .select('request_id, client_released_at');

  const releasedMap = new Map((uiStatuses || []).map((r: any) => [r.request_id, r.client_released_at]));

  const stateGroups: Record<RequestState, any[]> = {
    ARCHIVED: [], COMPLETED: [], READY: [], OPERATIONS: [], INTAKE: [], ISSUES: [], UNKNOWN: []
  };

  allRequests?.forEach(req => {
    const state = resolveRequestState({
      ...req,
      client_released_at: releasedMap.get(req.id)
    });
    stateGroups[state].push(req);
  });

  console.log('Requests found per state:');
  Object.entries(stateGroups).forEach(([state, reqs]) => {
    console.log(` - ${state}: ${reqs.length}`);
  });

  // 2. Setup synthetic personas using real IDs for FK/Constraint compatibility
  console.log('--- Setting up Staff IDs ---');
  const { data: allActiveStaff } = await adminClient
    .from('staff_members')
    .select('id, auth_user_id, staff_role')
    .eq('is_active', true);

  if (!allActiveStaff || allActiveStaff.length === 0) {
    throw new Error('CRITICAL ERROR: No active staff members found in database.');
  }

  const preferredAdmin = allActiveStaff.find(s => s.staff_role === 'admin' || s.staff_role === 'owner');
  const preferredReviewer = allActiveStaff.find(s => s.staff_role === 'reviewer');

  const adminPersona = preferredAdmin || allActiveStaff[0];
  const reviewerPersona = preferredReviewer || allActiveStaff.find(s => s.id !== adminPersona.id) || allActiveStaff[0];

  const adminId = adminPersona.id;
  const adminAuthId = adminPersona.auth_user_id;
  const reviewerId = reviewerPersona.id;
  const reviewerAuthId = reviewerPersona.auth_user_id;
  const reviewerFallbackUsed = !preferredReviewer;

  console.log(` - Selected Admin ID: ${adminId} (${adminPersona.staff_role})`);
  console.log(` - Selected Reviewer ID: ${reviewerId} (${reviewerPersona.staff_role})`);
  console.log(` - Reviewer Fallback Used: ${reviewerFallbackUsed}`);

  const personas: Record<string, StaffMemberLite> = {
    admin: {
      id: adminId,
      auth_user_id: adminAuthId,
      full_name: 'Synthetic Admin',
      staff_role: 'admin',
      team_code: 'core',
      is_active: true,
      can_approve_requests: true,
      can_manage_merchants: true,
      can_view_financials: true,
      extra_roles: []
    },
    'assigned reviewer': {
      id: reviewerId,
      auth_user_id: reviewerAuthId,
      full_name: 'Synthetic Assigned Reviewer',
      staff_role: 'reviewer',
      team_code: 'review',
      is_active: true,
      can_approve_requests: true,
      can_manage_merchants: false,
      can_view_financials: false,
      extra_roles: []
    },
    'unassigned reviewer': {
      id: reviewerId, // Same ID but will be unassigned in DB for this test
      auth_user_id: reviewerAuthId,
      full_name: 'Synthetic Unassigned Reviewer',
      staff_role: 'reviewer',
      team_code: 'review',
      is_active: true,
      can_approve_requests: true,
      can_manage_merchants: false,
      can_view_financials: false,
      extra_roles: []
    },
    researcher: {
      id: adminId, // Roles are synthetic in StaffMemberLite anyway
      auth_user_id: adminAuthId,
      full_name: 'Synthetic Researcher',
      staff_role: 'researcher',
      team_code: 'ops',
      is_active: true,
      can_approve_requests: false,
      can_manage_merchants: true,
      can_view_financials: false,
      extra_roles: []
    },
    field_agent: {
      id: adminId,
      auth_user_id: adminAuthId,
      full_name: 'Synthetic Field Agent',
      staff_role: 'field_agent',
      team_code: 'field',
      is_active: true,
      can_approve_requests: false,
      can_manage_merchants: true,
      can_view_financials: false,
      extra_roles: []
    },
    reporter: {
      id: adminId,
      auth_user_id: adminAuthId,
      full_name: 'Synthetic Reporter',
      staff_role: 'reporter',
      team_code: 'reporting',
      is_active: true,
      can_approve_requests: false,
      can_manage_merchants: false,
      can_view_financials: false,
      extra_roles: []
    },
    'inactive staff': {
      id: adminId,
      auth_user_id: adminAuthId,
      full_name: 'Synthetic Inactive',
      staff_role: 'admin',
      team_code: 'core',
      is_active: false,
      can_approve_requests: true,
      can_manage_merchants: true,
      can_view_financials: true,
      extra_roles: []
    }
  };

  // 3. Define Expected Matrix
  // key: "role|state", value: boolean (access allowed)
  const matrix: Record<string, boolean> = {
    // Admin
    'admin|INTAKE': true, 'admin|ISSUES': true, 'admin|OPERATIONS': true, 'admin|READY': true, 'admin|COMPLETED': true, 'admin|ARCHIVED': false,
    // Assigned Reviewer (Logic handled in evaluation)
    'assigned reviewer|INTAKE': true,
    'assigned reviewer|ISSUES': true, // Only if needs_clarification (will check in eval)
    'assigned reviewer|OPERATIONS': false, 'assigned reviewer|READY': false, 'assigned reviewer|COMPLETED': false, 'assigned reviewer|ARCHIVED': false,
    // Unassigned Reviewer
    'unassigned reviewer|INTAKE': false, 'unassigned reviewer|ISSUES': false, 'unassigned reviewer|OPERATIONS': false, 'unassigned reviewer|READY': false, 'unassigned reviewer|COMPLETED': false, 'unassigned reviewer|ARCHIVED': false,
    // Researcher
    'researcher|INTAKE': false, 'researcher|ISSUES': false, 'researcher|OPERATIONS': true, 'researcher|READY': false, 'researcher|COMPLETED': false, 'researcher|ARCHIVED': false,
    // Field Agent
    'field_agent|INTAKE': false, 'field_agent|ISSUES': false, 'field_agent|OPERATIONS': true, 'field_agent|READY': false, 'field_agent|COMPLETED': false, 'field_agent|ARCHIVED': false,
    // Reporter
    'reporter|INTAKE': false, 'reporter|ISSUES': false, 'reporter|OPERATIONS': true, 'reporter|READY': true, 'reporter|COMPLETED': true, 'reporter|ARCHIVED': false,
    // Inactive
    'inactive staff|INTAKE': false, 'inactive staff|ISSUES': false, 'inactive staff|OPERATIONS': false, 'inactive staff|READY': false, 'inactive staff|COMPLETED': false, 'inactive staff|ARCHIVED': false,
  };

  const results: any[] = [];
  let allPassed = true;

  console.log('\n--- Evaluating Access Matrix ---');

  for (const [roleName, persona] of Object.entries(personas)) {
    for (const [state, requests] of Object.entries(stateGroups)) {
      if (state === 'UNKNOWN') continue;
      
      const req = requests[0]; // Take one sample from each state
      if (!req) {
        results.push({ role: roleName, state, expected: '-', actual: '-', verdict: 'SKIPPED', reason: 'No data' });
        continue;
      }

      // Snapshot original assignment state
      const originalAssignment = {
        assigned_reviewer_staff_id: req.assigned_reviewer_staff_id,
        reviewer_assignment_status: req.reviewer_assignment_status,
        reviewer_assigned_at: req.reviewer_assigned_at,
        reviewer_assigned_by_staff_id: req.reviewer_assigned_by_staff_id
      };

      // Handle Assignment for DAL visibility
      const isAssignedTest = roleName === 'assigned reviewer';
      if (isAssignedTest) {
        const { error } = await adminClient.from('requests').update({ 
          assigned_reviewer_staff_id: persona.id,
          reviewer_assignment_status: 'assigned',
          reviewer_assigned_at: new Date().toISOString()
        }).eq('id', req.id);
        
        if (error) console.error(`[DB ERROR] Failed to assign: ${error.message}`);
        
        // Verify update
        const { data: verify } = await adminClient.from('requests').select('assigned_reviewer_staff_id').eq('id', req.id).single();
        if (verify?.assigned_reviewer_staff_id !== persona.id) {
          console.error(`[DB ERROR] Assignment verification failed! Expected ${persona.id}, got ${verify?.assigned_reviewer_staff_id}`);
        }
      } else if (roleName === 'unassigned reviewer' && req.assigned_reviewer_staff_id === persona.id) {
        // Ensure unassigned reviewer is actually unassigned
        await adminClient.from('requests').update({ 
          assigned_reviewer_staff_id: null,
          reviewer_assignment_status: 'unassigned',
          reviewer_assigned_at: null
        }).eq('id', req.id);
      }

      let expected = matrix[`${roleName}|${state}`];
      
      // Special case for assigned reviewer in ISSUES
      if (roleName === 'assigned reviewer' && state === 'ISSUES') {
        expected = req.reviewer_decision === 'needs_clarification';
      }

      let actual = false;
      let reason = '';

      try {
        // 1. Inactive check (equivalent to page.tsx logic)
        if (!persona.is_active) {
          actual = false;
          reason = 'Inactive staff';
        } else {
          // 2. Call DAL (Server-side guards)
          const workspaceData = await getRequestFullWorkspace(req.id, persona);
          
          if (!workspaceData) {
            actual = false;
            reason = 'DAL returned null (Blocked or Archived)';
          } else {
            // 3. Page-level guards (equivalent to page.tsx logic)
            const permissions = getStaffUiPermissions(persona);
            const isAssigned = workspaceData.request.assigned_reviewer_staff_id === persona.id;
            
            // Re-fetch state for page logic consistency
            const pageState = workspaceData.state as RequestState;
            const isAdmin = permissions.isAdmin;
            const isResearcher = permissions.canResearch;
            const isFieldAgent = permissions.canSourceOffline;
            const isReporter = permissions.canReport;

            let canAccessWorkspace = false;
            if (isAdmin) {
              canAccessWorkspace = pageState !== 'ARCHIVED';
            } else {
              if (pageState === 'INTAKE') {
                canAccessWorkspace = permissions.canReviewIntake && isAssigned;
              } else if (pageState === 'ISSUES') {
                canAccessWorkspace = permissions.canReviewIntake && isAssigned && workspaceData.request.reviewer_decision === 'needs_clarification';
              } else if (pageState === 'OPERATIONS') {
                canAccessWorkspace = isResearcher || isFieldAgent || isReporter;
              } else if (pageState === 'READY' || pageState === 'COMPLETED') {
                canAccessWorkspace = isReporter;
              }
            }

            actual = canAccessWorkspace;
            reason = actual ? 'Allowed' : 'Blocked by Page Guard';
          }
        }
      } catch (err: any) {
        actual = false;
        reason = `DAL Error: ${err.message}`;
      }

      // Restore original assignment state strictly
      await adminClient.from('requests').update(originalAssignment).eq('id', req.id);

      const verdict = actual === expected ? 'PASS' : 'FAIL';
      if (verdict === 'FAIL') allPassed = false;

      results.push({
        role: roleName,
        state,
        expected: expected ? 'ALLOW' : 'BLOCK',
        actual: actual ? 'ALLOW' : 'BLOCK',
        verdict,
        reason
      });
    }
  }

  console.table(results);

  if (allPassed) {
    console.log('\n[VERDICT] SUCCESS: Role/state access matrix passed.');
  } else {
    console.error('\n[VERDICT] FAILED: Role/state access matrix violations found.');
    process.exit(1);
  }
}

verifyAccessMatrix().catch(err => {
  console.error('Regression crashed:', err);
  process.exit(1);
});
