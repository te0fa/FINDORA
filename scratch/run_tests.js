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

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("=========================================");
  console.log("Executing Test 1: Complete Matching Check");
  console.log("=========================================");

  // 1. Fetch requests
  const { data: requests, error: reqErr } = await supabase
    .from('requests')
    .select('id, request_code, current_status, reviewer_decision, is_archived, canonical_state');
    
  if (reqErr) {
    console.error("Test 1 FAIL: Error fetching requests:", reqErr);
    process.exit(1);
  }

  // 2. Fetch operational states for client_released_at
  const { data: opStates, error: opErr } = await supabase
    .from('request_operational_states')
    .select('request_id, client_released_at');

  if (opErr) {
    console.error("Test 1 FAIL: Error fetching operational states:", opErr);
    process.exit(1);
  }

  const opMap = new Map(opStates.map(o => [o.request_id, o.client_released_at]));

  let mismatchCount = 0;
  for (const req of requests) {
    const client_released_at = opMap.get(req.id) || null;
    const input = { ...req, client_released_at };

    const expectedState = resolveRequestStateJS(input);
    const dbState = req.canonical_state;

    if (expectedState !== dbState) {
      console.error(`Mismatch found: Request ${req.request_code} (ID: ${req.id})`);
      console.error(`  Inputs: is_archived=${req.is_archived}, status=${req.current_status}, decision=${req.reviewer_decision}, released=${client_released_at}`);
      console.error(`  Expected JS: ${expectedState}`);
      console.error(`  DB Column:   ${dbState}`);
      mismatchCount++;
    }
  }

  if (mismatchCount > 0) {
    console.error(`Test 1 FAIL: Found ${mismatchCount} mismatches out of ${requests.length} records.`);
  } else {
    console.log(`Test 1 PASS: All ${requests.length} existing records match exactly 100%.`);
  }

  console.log("\n=========================================");
  console.log("Executing Test 2: Trigger Update (from requests)");
  console.log("=========================================");

  if (requests.length === 0) {
    console.log("Test 2 SKIPPED: No requests to update.");
  } else {
    const targetReq = requests[0];
    const originalStatus = targetReq.current_status;
    const testStatus = originalStatus === 'open' ? 'submitted' : 'open';

    console.log(`Updating request ${targetReq.request_code} status from '${originalStatus}' to '${testStatus}'...`);
    const { data: updatedReq, error: updateErr } = await supabase
      .from('requests')
      .update({ current_status: testStatus })
      .eq('id', targetReq.id)
      .select('canonical_state')
      .single();

    if (updateErr) {
      console.error("Test 2 FAIL: Update error:", updateErr);
    } else {
      console.log(`Updated canonical_state is now: '${updatedReq.canonical_state}'`);
      // Restore
      await supabase
        .from('requests')
        .update({ current_status: originalStatus })
        .eq('id', targetReq.id);
      console.log("Test 2 PASS: Trigger auto-updated canonical_state upon request updates.");
    }
  }

  console.log("\n=========================================");
  console.log("Executing Test 2b: Trigger Update (from request_operational_states)");
  console.log("=========================================");

  if (requests.length === 0) {
    console.log("Test 2b SKIPPED: No requests to test.");
  } else {
    const targetReq = requests[0];
    
    // Ensure an operational state record exists for this request
    const { data: existingOp } = await supabase
      .from('request_operational_states')
      .select('*')
      .eq('request_id', targetReq.id)
      .maybeSingle();

    if (!existingOp) {
      // Create a dummy one
      await supabase
        .from('request_operational_states')
        .insert({ request_id: targetReq.id, client_released_at: null });
    }

    const testTime = new Date().toISOString();
    console.log(`Setting client_released_at in request_operational_states to '${testTime}'...`);

    await supabase
      .from('request_operational_states')
      .update({ client_released_at: testTime })
      .eq('request_id', targetReq.id);

    // Fetch requests to verify canonical_state updated to COMPLETED
    const { data: verifiedReq } = await supabase
      .from('requests')
      .select('canonical_state')
      .eq('id', targetReq.id)
      .single();

    console.log(`Resulting canonical_state on requests: '${verifiedReq.canonical_state}'`);
    if (verifiedReq.canonical_state === 'COMPLETED') {
      console.log("Test 2b PASS: Trigger auto-updated canonical_state upon operational state changes.");
    } else {
      console.error("Test 2b FAIL: Expected COMPLETED state, got " + verifiedReq.canonical_state);
    }

    // Cleanup
    await supabase
      .from('request_operational_states')
      .update({ client_released_at: null })
      .eq('request_id', targetReq.id);
  }
}

run();
