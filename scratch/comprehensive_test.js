const { createClient } = require('@supabase/supabase-js');
const { 
  getIntakeQueueRequests, 
  getReadyQueueRequests, 
  getCompletedQueueRequests, 
  getIssuesQueueRequests, 
  getRejectedQueueRequests, 
  getOperationsQueueRequests 
} = require('../src/lib/dal/requests');
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

  const customerId = 'b347c389-6355-4e26-a566-1a50d81b8f41';
  const prefix = 'TEST-PERF-LIFECYCLE';

  const { data: initialReqs } = await supabase.from('requests').select('id');
  console.log(`Initial requests count in DB: ${initialReqs.length}`);

  console.log("\n1. Generating mock requests for the 7 lifecycle states...");

  const scenarios = [
    { name: 'ARCHIVED (via is_archived)', is_archived: true, current_status: 'open', reviewer_decision: null, released: false },
    { name: 'ARCHIVED (via cancelled status)', is_archived: false, current_status: 'cancelled', reviewer_decision: null, released: false },
    { name: 'COMPLETED (via closed status)', is_archived: false, current_status: 'closed', reviewer_decision: null, released: false },
    { name: 'COMPLETED (via client_released_at)', is_archived: false, current_status: 'in_progress', reviewer_decision: 'approve', released: true },
    { name: 'READY', is_archived: false, current_status: 'client_ready', reviewer_decision: null, released: false },
    { name: 'REJECTED', is_archived: false, current_status: 'submitted', reviewer_decision: 'reject', released: false },
    { name: 'ISSUES (needs_clarification)', is_archived: false, current_status: 'submitted', reviewer_decision: 'needs_clarification', released: false },
    { name: 'ISSUES (client_feedback_pending)', is_archived: false, current_status: 'client_feedback_pending', reviewer_decision: null, released: false },
    { name: 'ISSUES (client_feedback_pending with approve decision)', is_archived: false, current_status: 'client_feedback_pending', reviewer_decision: 'approve', released: false },
    { name: 'OPERATIONS', is_archived: false, current_status: 'research', reviewer_decision: 'approve', released: false },
    { name: 'INTAKE', is_archived: false, current_status: 'open', reviewer_decision: null, released: false }
  ];

  const insertedIds = [];
  const stateMappings = [];

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const { data: req, error } = await supabase
      .from('requests')
      .insert({
        customer_id: customerId,
        request_code: `REQ-MOCK-${i}-${Date.now().toString().slice(-4)}`,
        title: `${prefix}-${sc.name}`,
        raw_description: '',
        current_status: sc.current_status,
        reviewer_decision: sc.reviewer_decision,
        is_archived: sc.is_archived
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to insert scenario ${sc.name}:`, error);
      continue;
    }

    insertedIds.push(req.id);
    stateMappings.push({ request_id: req.id, expected: sc.name, is_released: sc.released });

    await supabase
      .from('request_operational_states')
      .insert({
        request_id: req.id,
        client_released_at: sc.released ? new Date().toISOString() : null
      });
  }

  console.log(`Inserted ${insertedIds.length} scenario test rows.`);

  console.log("\n2. Executing Test 1: Verification per State (0% Tolerance)...");
  
  const { data: updatedReqs } = await supabase
    .from('requests')
    .select('id, title, canonical_state, current_status, reviewer_decision, is_archived')
    .in('id', insertedIds);

  const { data: updatedOpStates } = await supabase
    .from('request_operational_states')
    .select('request_id, client_released_at')
    .in('request_id', insertedIds);

  const opMap = new Map(updatedOpStates.map(o => [o.request_id, o.client_released_at]));

  let failures = 0;
  for (const mapping of stateMappings) {
    const req = updatedReqs.find(r => r.id === mapping.request_id);
    const client_released_at = opMap.get(req.id);
    const expected = resolveRequestStateJS({ ...req, client_released_at });
    const actual = req.canonical_state;

    const pass = expected === actual;
    console.log(`  - State [${mapping.expected}] -> Expected JS: ${expected} | Actual DB: ${actual} -> ${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) failures++;
  }

  if (failures > 0) {
    console.error(`Test 1 FAILED with ${failures} state mismatches!`);
  } else {
    console.log("Test 1 SUCCESS: All lifecycle states match perfectly.");
  }

  console.log("\n3. Executing Test 4: Queue IDs Match Check...");
  const expectedQueues = { INTAKE: [], READY: [], COMPLETED: [], ISSUES: [], REJECTED: [], OPERATIONS: [] };
  for (const req of updatedReqs) {
    const client_released_at = opMap.get(req.id);
    const state = resolveRequestStateJS({ ...req, client_released_at });
    if (expectedQueues[state]) expectedQueues[state].push(req.id);
  }

  const intakeList = (await getIntakeQueueRequests()).map(r => r.id);
  const readyList = (await getReadyQueueRequests()).map(r => r.id);
  const completedList = (await getCompletedQueueRequests()).map(r => r.id);
  const issuesList = (await getIssuesQueueRequests()).map(r => r.id);
  const rejectedList = (await getRejectedQueueRequests()).map(r => r.id);
  const operationsList = (await getOperationsQueueRequests()).map(r => r.id);

  function checkQueue(name, expectedIds, actualList) {
    const filteredActual = actualList.filter(id => insertedIds.includes(id));
    const match = JSON.stringify([...expectedIds].sort()) === JSON.stringify([...filteredActual].sort());
    console.log(`  - Queue [${name}]: ${match ? 'PASS' : 'FAIL'} (Expected: ${expectedIds.length}, Actual: ${filteredActual.length})`);
  }

  checkQueue("INTAKE", expectedQueues.INTAKE, intakeList);
  checkQueue("READY", expectedQueues.READY, readyList);
  checkQueue("COMPLETED", expectedQueues.COMPLETED, completedList);
  checkQueue("ISSUES", expectedQueues.ISSUES, issuesList);
  checkQueue("REJECTED", expectedQueues.REJECTED, rejectedList);
  checkQueue("OPERATIONS", expectedQueues.OPERATIONS, operationsList);

  console.log("\n4. Generating 1000 additional mock records for Test 3 (Performance)...");
  const bulkSize = 1000;
  const bulkInserts = [];
  
  for (let i = 0; i < bulkSize; i++) {
    // Generate a distribution of states
    let current_status = 'open';
    let reviewer_decision = null;
    let is_archived = false;

    if (i % 6 === 0) {
      current_status = 'cancelled';
    } else if (i % 6 === 1) {
      current_status = 'closed';
    } else if (i % 6 === 2) {
      current_status = 'client_ready';
    } else if (i % 6 === 3) {
      reviewer_decision = 'reject';
    } else if (i % 6 === 4) {
      current_status = 'client_feedback_pending';
      reviewer_decision = 'approve';
    } else {
      current_status = 'research';
      reviewer_decision = 'approve';
    }

    bulkInserts.push({
      customer_id: customerId,
      request_code: `REQ-BULK-${i}-${Date.now().toString().slice(-4)}`,
      title: `${prefix}-BULK-${i}`,
      raw_description: '',
      current_status,
      reviewer_decision,
      is_archived
    });
  }

  const { data: bulkData, error: bulkErr } = await supabase
    .from('requests')
    .insert(bulkInserts)
    .select('id');

  if (bulkErr) {
    console.error("Bulk insert failed:", bulkErr);
  } else {
    console.log(`Successfully inserted ${bulkData.length} bulk records.`);
    const bulkIds = bulkData.map(r => r.id);
    insertedIds.push(...bulkIds);

    const opInserts = bulkIds.map(id => ({ request_id: id, client_released_at: null }));
    await supabase.from('request_operational_states').insert(opInserts);

    console.log("\nMeasuring retrieval times (Old JS implementation simulator vs New SQL canonical_state query):");
    
    const startAllFetch = performance.now();
    const { data: allReqs } = await supabase.from('requests').select('*');
    const { data: allOps } = await supabase.from('request_operational_states').select('*');
    const opMapAll = new Map(allOps.map(o => [o.request_id, o.client_released_at]));
    const endAllFetch = performance.now();
    const baseFetchTime = endAllFetch - startAllFetch;

    const queuesToTest = [
      { name: 'INTAKE', fn: getIntakeQueueRequests },
      { name: 'READY', fn: getReadyQueueRequests },
      { name: 'COMPLETED', fn: getCompletedQueueRequests },
      { name: 'ISSUES', fn: getIssuesQueueRequests },
      { name: 'REJECTED', fn: getRejectedQueueRequests },
      { name: 'OPERATIONS', fn: getOperationsQueueRequests }
    ];

    for (const q of queuesToTest) {
      const startOld = performance.now();
      const oldFiltered = allReqs.filter(r => resolveRequestStateJS({ ...r, client_released_at: opMapAll.get(r.id) }) === q.name);
      const endOld = performance.now();
      const oldTime = baseFetchTime + (endOld - startOld);

      const startNew = performance.now();
      const newFiltered = await q.fn();
      const endNew = performance.now();
      const newTime = endNew - startNew;

      console.log(`\n  Queue [${q.name}]:`);
      console.log(`    - Old JS Filtering method: ${oldTime.toFixed(2)} ms (Returned: ${oldFiltered.length} rows)`);
      console.log(`    - New SQL Query method:     ${newTime.toFixed(2)} ms (Returned: ${newFiltered.length} rows)`);
      console.log(`    - Performance Improvement:  ${(oldTime - newTime).toFixed(2)} ms faster`);
    }
  }

  console.log("\n5. Cleaning up mock data...");
  
  const { error: delOpErr } = await supabase
    .from('request_operational_states')
    .delete()
    .in('request_id', insertedIds);

  const { error: delReqErr } = await supabase
    .from('requests')
    .delete()
    .in('id', insertedIds);

  if (delOpErr || delReqErr) {
    console.error("Cleanup error:", delOpErr, delReqErr);
  } else {
    console.log("Cleanup executed successfully.");
  }

  const { data: finalReqs } = await supabase.from('requests').select('id');
  console.log(`Final requests count in DB: ${finalReqs.length}`);
  if (finalReqs.length === initialReqs.length) {
    console.log("PASS: Database restored to pristine initial state.");
  } else {
    console.error("WARNING: Row count mismatch after cleanup!");
  }
}

run();
