const { 
  getIntakeQueueRequests, 
  getReadyQueueRequests, 
  getCompletedQueueRequests, 
  getIssuesQueueRequests, 
  getRejectedQueueRequests, 
  getOperationsQueueRequests 
} = require('../src/lib/dal/requests');
require('dotenv').config({ path: '.env.local' });

async function measure(name, fn) {
  const start = performance.now();
  const res = await fn();
  const end = performance.now();
  console.log(`  - ${name}: ${(end - start).toFixed(2)} ms (Returned: ${res.length} rows)`);
  return res;
}

async function run() {
  console.log("=== Performance Test (Baseline / Old JS Filtering) ===");
  try {
    await measure("getIntakeQueueRequests", () => getIntakeQueueRequests());
    await measure("getReadyQueueRequests", () => getReadyQueueRequests());
    await measure("getCompletedQueueRequests", () => getCompletedQueueRequests());
    await measure("getIssuesQueueRequests", () => getIssuesQueueRequests());
    await measure("getRejectedQueueRequests", () => getRejectedQueueRequests());
    await measure("getOperationsQueueRequests", () => getOperationsQueueRequests());
  } catch (err) {
    console.error("Error during performance test:", err);
  }
}
run();
