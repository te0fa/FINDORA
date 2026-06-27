import { createAdminClient } from '../src/lib/dal/customers';
import { randomUUID } from 'crypto';
import { getCustomerRequestOverview, getCustomerReportSnapshots } from '../src/lib/dal/reports';

async function main() {
  console.log('--- STARTING CUSTOMER REPORT ACCESS VERIFICATION ---');
  const adminClient = await createAdminClient();

  // 1. Setup Fresh Test Data
  const testTitle = `[ACCESS_TEST] ${randomUUID()}`;
  console.log(`⏳ Creating fresh test request: ${testTitle}`);

  // Find two real authenticated customers
  const { data: testCusts } = await adminClient
    .from('customers')
    .select('id, auth_user_id, full_name')
    .not('auth_user_id', 'is', null)
    .limit(2);

  if (!testCusts || testCusts.length < 2) {
    console.error('❌ Failed to find enough authenticated customers for testing.');
    process.exit(1);
  }

  const ownerCust = testCusts[0];
  const attackerCust = testCusts[1];

  // Create Request (Unreleased)
  const { data: req, error: reqErr } = await adminClient.from('requests').insert({
    title: testTitle,
    request_code: `TEST-${randomUUID().substring(0, 8)}`,
    raw_description: 'Test description',
    customer_id: ownerCust.id,
    current_status: 'submitted'
  }).select().single();
  if (reqErr) { console.error('❌ Failed to create request:', reqErr); process.exit(1); }
  const testRequestId = req.id;

  // Create Report record
  const reportId = randomUUID();
  await adminClient.from('reports').insert({ id: reportId, request_id: testRequestId });

  // Create Research Run & Item (Required for snapshots)
  const { data: run, error: runErr } = await adminClient.from('research_runs').insert({
    request_id: testRequestId,
    run_kind: 'online_search',
    summary: '[ACCESS_TEST] Run'
  }).select().single();
  if (runErr) { console.error('❌ Failed to create run:', runErr); process.exit(1); }

  const { data: item, error: itemErr } = await adminClient.from('research_items').insert({
    research_run_id: run.id,
    request_id: testRequestId,
    source_name: '[ACCESS_TEST] Source',
    product_title: '[ACCESS_TEST] Product',
    listing_url: 'https://access-test.example.com',
    price_amount: 1000,
    availability_status: 'in_stock',
    is_candidate: true
  }).select().single();
  if (itemErr) { console.error('❌ Failed to create item:', itemErr); process.exit(1); }

  // Add shortlist item (Required for bundle)
  await adminClient.from('request_candidate_shortlists').insert({
    request_id: testRequestId,
    candidate_channel: 'online',
    research_item_id: item.id,
    option_label: '[ACCESS_TEST] Product',
    reason_summary: 'Test reason',
    ranking_position: 1,
    reveal_locked: true,
    is_active: true
  });

    // Find an active staff member to use for transitions/system actions
    const { data: staffList } = await adminClient
      .from('staff_members')
      .select('id, auth_user_id')
      .eq('is_active', true)
      .limit(1);

    if (!staffList || staffList.length === 0) {
      console.error('❌ Failed to find an active staff member for testing.');
      process.exit(1);
    }
    const activeStaff = staffList[0];

  // Prepare Bundle (This creates the snapshots)
  console.log('⏳ Preparing client bundle using staff actor...');
  const { data: bundleRes, error: bundleErr } = await adminClient.rpc('fn_prepare_request_client_bundle', {
    p_request_id: testRequestId,
    p_report_id: reportId,
    p_actor_user_id: activeStaff.auth_user_id
  });
  if (bundleErr) { console.error('❌ Failed to prepare bundle:', bundleErr); process.exit(1); }

  console.log(`✅ Context: Request=${testRequestId}, Owner=${ownerCust.auth_user_id}, Attacker=${attackerCust.auth_user_id}`);

  let allPassed = true;

  try {
    // TEST 1: Owner access to UNRELEASED report
    console.log('\n--- TEST 1: Owner access to UNRELEASED report ---');
    const overview1 = await getCustomerRequestOverview(testRequestId, ownerCust.auth_user_id);
    if (overview1 === null) {
      console.log('✅ PASSED: Correctly blocked access to unreleased report.');
    } else {
      console.error('❌ FAILED: Owner was able to see unreleased report overview.');
      allPassed = false;
    }

    const snapshots1 = await getCustomerReportSnapshots(testRequestId, ownerCust.auth_user_id);
    if (snapshots1.length === 0) {
      console.log('✅ PASSED: Correctly returned empty snapshots for unreleased report.');
    } else {
      console.error('❌ FAILED: Owner was able to see unreleased snapshots.');
      allPassed = false;
    }

    const activeStaffId = activeStaff.id;

    // --- RELEASE THE REPORT ---
    console.log('\n⏳ Releasing request via transition engine...');
    // Set to client_ready so transition engine accepts it
    await adminClient.from('requests').update({ current_status: 'client_ready' }).eq('id', testRequestId);

    const { error: transErr } = await adminClient.rpc('fn_execute_request_transition', {
      p_transition_name: 'RELEASE_FINAL',
      p_request_id: testRequestId,
      p_actor_staff_id: activeStaffId,
      p_notes: 'Released for [ACCESS_TEST]'
    });
    if (transErr) { console.error('❌ Failed to release via transition:', transErr); process.exit(1); }

    const { data: checkView } = await adminClient.from('v_request_ui_status').select('client_released_at').eq('request_id', testRequestId).single();
    console.log(`DEBUG: v_request_ui_status.client_released_at = ${checkView?.client_released_at}`);

    // TEST 2: Owner access to RELEASED report
    console.log('\n--- TEST 2: Owner access to RELEASED report ---');
    console.log(`Checking overview for Request: ${testRequestId}, User: ${ownerCust.auth_user_id}`);
    const overview2 = await getCustomerRequestOverview(testRequestId, ownerCust.auth_user_id);
    if (overview2 && overview2.request_id === testRequestId) {
      console.log('✅ PASSED: Owner successfully accessed released report overview.');
    } else {
      console.error('❌ FAILED: Owner could not access their own released report.');
      if (!overview2) console.log('DEBUG: overview2 is null');
      allPassed = false;
    }

    const snapshots2 = await getCustomerReportSnapshots(testRequestId, ownerCust.auth_user_id);
    if (snapshots2.length > 0) {
      console.log(`✅ PASSED: Owner successfully accessed ${snapshots2.length} snapshots.`);
    } else {
      console.error('❌ FAILED: Owner could not access snapshots for released report.');
      allPassed = false;
    }

    // TEST 3: Attacker access to RELEASED report
    console.log('\n--- TEST 3: Attacker access to RELEASED report ---');
    const overview3 = await getCustomerRequestOverview(testRequestId, attackerCust.auth_user_id);
    if (overview3 === null) {
      console.log('✅ PASSED: Attacker blocked from accessing someone else\'s report.');
    } else {
      console.error('❌ FAILED: Attacker successfully accessed someone else\'s report overview.');
      allPassed = false;
    }

    const snapshots3 = await getCustomerReportSnapshots(testRequestId, attackerCust.auth_user_id);
    if (snapshots3.length === 0) {
      console.log('✅ PASSED: Attacker received zero snapshots for someone else\'s report.');
    } else {
      console.error('❌ FAILED: Attacker successfully accessed someone else\'s snapshots.');
      allPassed = false;
    }

    // TEST 4: Invalid Actor (Random UUID)
    console.log('\n--- TEST 4: Invalid Actor (Random UUID) ---');
    const overview4 = await getCustomerRequestOverview(testRequestId, randomUUID());
    if (overview4 === null) {
      console.log('✅ PASSED: Invalid actor blocked from overview.');
    } else {
      console.error('❌ FAILED: Invalid actor accessed overview.');
      allPassed = false;
    }

    const snapshots4 = await getCustomerReportSnapshots(testRequestId, randomUUID());
    if (snapshots4.length === 0) {
      console.log('✅ PASSED: Invalid actor received zero snapshots.');
    } else {
      console.error('❌ FAILED: Invalid actor received snapshots.');
      allPassed = false;
    }

  } finally {
    console.log('\n--- CLEANUP ---');
    await adminClient.from('requests').update({ 
      is_archived: true,
      title: `${testTitle} (COMPLETED)`
    }).eq('id', testRequestId);
    console.log('✅ Test artifacts archived.');
  }

  if (!allPassed) {
    console.error('\n[VERDICT] FAILED: One or more access checks failed.');
    process.exit(1);
  }

  console.log('\n[VERDICT] SUCCESS: Customer report access hardened and verified.');
}

main().catch(err => {
  console.error('\n[VERDICT] FAILED: Unexpected error during verification.');
  console.error(err);
  process.exit(1);
});
