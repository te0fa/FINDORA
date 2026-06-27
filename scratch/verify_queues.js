const { 
  getIntakeQueueRequests, 
  getReadyQueueRequests, 
  getCompletedQueueRequests, 
  getIssuesQueueRequests, 
  getRejectedQueueRequests, 
  getOperationsQueueRequests 
} = require('../src/lib/dal/requests');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Old JS implementation simulator
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
  console.log("Executing Test 4: Queue IDs Match Check");
  console.log("=========================================");

  // Get baseline of all requests via old JS logic simulator
  const { data: requests } = await supabase.from('requests').select('*');
  const { data: opStates } = await supabase.from('request_operational_states').select('*');
  const opMap = new Map(opStates.map(o => [o.request_id, o.client_released_at]));

  // Categorize request IDs by old JS state
  const oldQueues = {
    INTAKE: [],
    READY: [],
    COMPLETED: [],
    ISSUES: [],
    REJECTED: [],
    OPERATIONS: []
  };

  for (const r of requests) {
    const client_released_at = opMap.get(r.id) || null;
    const state = resolveRequestStateJS({ ...r, client_released_at });
    if (oldQueues[state]) {
      oldQueues[state].push(r.id);
    }
  }

  // Get results of new queries
  const newIntake = (await getIntakeQueueRequests()).map(r => r.id);
  const newReady = (await getReadyQueueRequests()).map(r => r.id);
  const newCompleted = (await getCompletedQueueRequests()).map(r => r.id);
  const newIssues = (await getIssuesQueueRequests()).map(r => r.id);
  const newRejected = (await getRejectedQueueRequests()).map(r => r.id);
  const newOperations = (await getOperationsQueueRequests()).map(r => r.id);

  function compare(name, oldIds, newIds) {
    const oldSorted = [...oldIds].sort();
    const newSorted = [...newIds].sort();
    const match = JSON.stringify(oldSorted) === JSON.stringify(newSorted);
    console.log(`  - Queue ${name}: ${match ? 'PASS' : 'FAIL'} (JS count: ${oldIds.length}, DB count: ${newIds.length})`);
    if (!match) {
      console.error(`    Mismatch in ${name} queue:`);
      console.error(`      Old:`, oldSorted);
      console.error(`      New:`, newSorted);
      process.exit(1);
    }
  }

  compare("INTAKE", oldQueues.INTAKE, newIntake);
  compare("READY", oldQueues.READY, newReady);
  compare("COMPLETED", oldQueues.COMPLETED, newCompleted);
  compare("ISSUES", oldQueues.ISSUES, newIssues);
  compare("REJECTED", oldQueues.REJECTED, newRejected);
  compare("OPERATIONS", oldQueues.OPERATIONS, newOperations);

  console.log("\n=========================================");
  console.log("Executing Test 3: New Query Performance");
  console.log("=========================================");

  async function measure(name, fn) {
    const start = performance.now();
    const res = await fn();
    const end = performance.now();
    console.log(`  - ${name}: ${(end - start).toFixed(2)} ms (Returned: ${res.length} rows)`);
  }

  await measure("getIntakeQueueRequests", () => getIntakeQueueRequests());
  await measure("getReadyQueueRequests", () => getReadyQueueRequests());
  await measure("getCompletedQueueRequests", () => getCompletedQueueRequests());
  await measure("getIssuesQueueRequests", () => getIssuesQueueRequests());
  await measure("getRejectedQueueRequests", () => getRejectedQueueRequests());
  await measure("getOperationsQueueRequests", () => getOperationsQueueRequests());
}

run();
