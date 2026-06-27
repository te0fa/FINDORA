const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Old JS implementation
function resolveRequestStateJS(input) {
  if (input.is_archived || input.current_status === 'cancelled') return 'ARCHIVED';
  if (input.current_status === 'closed' || (input.client_released_at && input.current_status !== 'closed')) {
    return 'COMPLETED';
  }
  if (input.current_status === 'client_ready' && !input.client_released_at) {
    return 'READY';
  }
  if (input.reviewer_decision === 'reject') {
    return 'REJECTED';
  }
  if (input.reviewer_decision === 'needs_clarification' || input.current_status === 'client_feedback_pending') {
    return 'ISSUES';
  }
  if (
    input.reviewer_decision === 'approve' && 
    ['in_progress', 'research', 'reporting'].includes(input.current_status || '')
  ) {
    return 'OPERATIONS';
  }
  if (
    !input.reviewer_decision && 
    ['submitted', 'open'].includes(input.current_status || '')
  ) {
    return 'INTAKE';
  }
  return 'UNKNOWN';
}

// Translated SQL logic simulator
function resolveRequestStateSQLSimulated(input) {
  const is_archived = !!input.is_archived;
  const current_status = input.current_status;
  const reviewer_decision = input.reviewer_decision;
  const client_released_at = input.client_released_at;

  if (is_archived || current_status === 'cancelled') {
    return 'ARCHIVED';
  }
  if (current_status === 'closed' || (client_released_at !== null && client_released_at !== undefined && current_status !== 'closed')) {
    return 'COMPLETED';
  }
  if (current_status === 'client_ready' && (client_released_at === null || client_released_at === undefined)) {
    return 'READY';
  }
  if (reviewer_decision === 'reject') {
    return 'REJECTED';
  }
  if (reviewer_decision === 'needs_clarification' || current_status === 'client_feedback_pending') {
    return 'ISSUES';
  }
  if (reviewer_decision === 'approve' && ['in_progress', 'research', 'reporting'].includes(current_status)) {
    return 'OPERATIONS';
  }
  if ((reviewer_decision === null || reviewer_decision === undefined) && ['submitted', 'open'].includes(current_status)) {
    return 'INTAKE';
  }
  return 'UNKNOWN';
}

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("=== Test 1: Simulating SQL Logic vs JS Logic ===");
  
  // 1. Fetch requests (excluding canonical_state initially)
  const { data: requests, error: reqErr } = await supabase
    .from('requests')
    .select('id, request_code, current_status, reviewer_decision, is_archived');
    
  if (reqErr) {
    console.error("Error fetching requests:", reqErr);
    return;
  }

  // 2. Fetch operational states for client_released_at
  const { data: opStates, error: opErr } = await supabase
    .from('request_operational_states')
    .select('request_id, client_released_at');

  if (opErr) {
    console.error("Error fetching operational states:", opErr);
    return;
  }

  const opMap = new Map(opStates.map(o => [o.request_id, o.client_released_at]));

  let matchCount = 0;
  let mismatchCount = 0;

  for (const req of requests) {
    const client_released_at = opMap.get(req.id) || null;
    const input = { ...req, client_released_at };

    const stateJS = resolveRequestStateJS(input);
    const stateSQLSim = resolveRequestStateSQLSimulated(input);

    if (stateJS !== stateSQLSim) {
      console.error(`Mismatch found on simulated logic for request ${req.request_code} (ID: ${req.id}):`);
      console.error(`  Inputs: is_archived=${req.is_archived}, status=${req.current_status}, decision=${req.reviewer_decision}, released=${client_released_at}`);
      console.error(`  JS Output:  ${stateJS}`);
      console.error(`  SQL Sim:    ${stateSQLSim}`);
      mismatchCount++;
    } else {
      matchCount++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  - Total processed: ${requests.length}`);
  console.log(`  - Simulated matching: ${matchCount} PASS`);
  if (mismatchCount > 0) {
    console.log(`  - Simulated mismatches: ${mismatchCount} FAIL`);
  }
}

run();
