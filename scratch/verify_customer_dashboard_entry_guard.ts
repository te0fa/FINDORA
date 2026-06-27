import { createAdminClient } from '../src/lib/dal/customers';
import { randomUUID } from 'crypto';
import { getCustomerRequests } from '../src/lib/dal/requests';
import { releaseRequestToCustomer, prepareRequestClientBundle } from '../src/lib/dal/staff';

async function main() {
  console.log('--- STARTING CUSTOMER DASHBOARD ENTRY GUARD VERIFICATION ---');
  const adminClient = await createAdminClient();

  // 1. Resolve test customer and staff
  const { data: testCusts } = await adminClient
    .from('customers')
    .select('id, auth_user_id, full_name')
    .not('auth_user_id', 'is', null)
    .limit(1);

  if (!testCusts || testCusts.length === 0) {
    console.error('❌ Failed to find an authenticated customer for testing.');
    process.exit(1);
  }
  const testCust = testCusts[0];

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

  console.log(`Using Customer: ${testCust.full_name} (${testCust.id})`);
  console.log(`Using Staff Actor: ${activeStaff.id}`);

  let allPassed = true;
  const allIds: string[] = [];

  try {
    // SCENARIO 1: UNRELEASED + HAS SNAPSHOTS
    console.log('\n--- SCENARIO 1: UNRELEASED + HAS SNAPSHOTS ---');
    const requestId1 = randomUUID();
    const reportId1 = randomUUID();
    allIds.push(requestId1);
  
  const { error: ins1Err } = await adminClient.from('requests').insert({
    id: requestId1,
    title: '[DASH_GUARD_TEST] Unreleased',
    request_code: `DG-${randomUUID().substring(0, 6)}`,
    customer_id: testCust.id,
    current_status: 'client_ready',
    raw_description: 'Test description',
    is_archived: false
  });
  if (ins1Err) throw ins1Err;

  await adminClient.from('reports').insert({ id: reportId1, request_id: requestId1 });
  await adminClient.from('report_option_snapshots').insert({
    request_id: requestId1,
    report_id: reportId1,
    display_title: 'Test Option',
    highlight_summary: 'Test summary',
    display_rank: 1,
    reveal_locked: true
  });

  // Wait for consistency
  await new Promise(resolve => setTimeout(resolve, 1500));

  const reqs1 = await getCustomerRequests(testCust.id);
  const req1 = reqs1.find(r => r.request_id === requestId1);

  if (req1) {
    const isReleased = !!req1.client_released_at;
    const hasSnapshots = Number(req1.snapshot_count ?? 0) > 0;
    const reportTarget = (isReleased && hasSnapshots)
      ? `/en/reports/${req1.request_id}`
      : null;
    
    if (!reportTarget) {
      console.log('✅ PASSED: Correctly blocked link to unreleased report.');
    } else {
      console.error(`❌ FAILED: Unexpected link to unreleased report. (isReleased=${isReleased}, hasSnapshots=${hasSnapshots})`);
      allPassed = false;
    }
  } else {
    console.error(`❌ FAILED: Request ${requestId1} not found in DAL.`);
    allPassed = false;
  }

    // SCENARIO 2: RELEASED + 0 SNAPSHOTS
    console.log('\n--- SCENARIO 2: RELEASED + 0 SNAPSHOTS ---');
    const requestId2 = randomUUID();
    allIds.push(requestId2);
  await adminClient.from('requests').insert({
    id: requestId2,
    title: '[DASH_GUARD_TEST] Released 0 Snaps',
    request_code: `DG-${randomUUID().substring(0, 6)}`,
    customer_id: testCust.id,
    current_status: 'client_ready',
    raw_description: 'Test description',
    is_archived: false
  });

  // Try to release it (it has no snapshots)
  try {
    await releaseRequestToCustomer({
      p_request_id: requestId2,
      p_actor_user_id: activeStaff.auth_user_id
    });
    console.error('❌ FAILED: DAL allowed releasing a request with 0 snapshots.');
    allPassed = false;
  } catch (err: any) {
    if (err.message.includes('no report snapshots exist')) {
      console.log('✅ PASSED: DAL correctly blocked release of request with 0 snapshots.');
    } else {
      console.error('❌ FAILED: Unexpected error during release attempt:', err.message);
      allPassed = false;
    }
  }

  // Double check UI logic would still block if somehow released
  const reqs2 = await getCustomerRequests(testCust.id);
  const req2 = reqs2.find(r => r.request_id === requestId2);
  if (req2) {
    const isReleased = !!req2.client_released_at;
    const hasSnapshots = Number(req2.snapshot_count ?? 0) > 0;
    const reportTarget = (isReleased && hasSnapshots) ? `/en/reports/${req2.request_id}` : null;
    if (!reportTarget) {
      console.log('✅ PASSED: Dashboard logic correctly blocks link (isReleased=false, hasSnapshots=false).');
    } else {
      console.error('❌ FAILED: Dashboard logic unexpectedly allowed link.');
      allPassed = false;
    }
  }

    // SCENARIO 3: RELEASED + HAS SNAPSHOTS (Positive Case)
    console.log('\n--- SCENARIO 3: RELEASED + HAS SNAPSHOTS ---');
    const requestId3 = randomUUID();
    const reportId3 = randomUUID();
    allIds.push(requestId3);
    
    // 1. Create request with valid metadata
    const { error: reqErr3 } = await adminClient.from('requests').insert({
      id: requestId3,
      title: '[DASH_GUARD_TEST] Released Full',
      request_code: `DG-${randomUUID().substring(0, 6)}`,
      customer_id: testCust.id,
      current_status: 'client_ready',
      request_kind: 'everyday_purchase', // Validated via check_request_kind.ts
      raw_description: 'Deterministic test for full pipeline',
      is_archived: false
    });
    if (reqErr3) throw new Error(`Failed to insert request: ${reqErr3.message}`);

    // 2. Insert/upsert preferences (required for some transitions)
    const { error: prefErr } = await adminClient.from('request_preferences').upsert({
      request_id: requestId3,
      urgency_level: 'normal',
      search_scope: 'online_only'
    }, { onConflict: 'request_id' });
    if (prefErr) throw new Error(`Failed to upsert preferences: ${prefErr.message}`);

    // 3. Create research run
    const runId = randomUUID();
    const { error: runErr } = await adminClient.from('research_runs').insert({
      id: runId,
      request_id: requestId3,
      run_kind: 'online_search',
      status: 'completed',
      query_text: '[DASH_GUARD_TEST] Scenario 3 query',
      results_count: 1,
    });
    if (runErr) throw new Error(`Failed to insert research run: ${runErr.message}`);

    // 4. Create research item
    const itemId = randomUUID();
    const { error: itemErr } = await adminClient.from('research_items').insert({
      id: itemId,
      research_run_id: runId,
      request_id: requestId3,
      source_name: '[DASH_GUARD_TEST] Source',
      source_type: 'retailer',
      listing_url: 'https://test.example.com',
      option_label: '[DASH_GUARD_TEST] Option',
      product_title: '[DASH_GUARD_TEST] Product',
      price_amount: 1000,
      currency_code: 'EGP',
      availability_status: 'in_stock',
      is_candidate: true,
      is_shortlisted: true,
      trust_score: 80,
      value_score: 80,
      fit_score: 80,
      final_score: 80,
    });
    if (itemErr) throw new Error(`Failed to insert research item: ${itemErr.message}`);
    
    // 5. Create shortlist item
    const { error: slErr } = await adminClient.from('request_candidate_shortlists').insert({
      request_id: requestId3,
      candidate_channel: 'online',
      research_item_id: itemId,
      ranking_position: 1,
      option_label: '[DASH_GUARD_TEST] Option',
      trust_score: 80,
      value_score: 80,
      fit_score: 80,
      final_score: 80,
      reason_summary: 'Test reason',
      customer_summary: 'Test customer summary',
      reveal_locked: true,
      is_recommended: true,
      is_active: true
    });
    if (slErr) throw new Error(`Failed to insert shortlist item: ${slErr.message}`);

    // 6. Create report record
    const { error: repErr } = await adminClient.from('reports').insert({ id: reportId3, request_id: requestId3 });
    if (repErr) throw new Error(`Failed to insert report: ${repErr.message}`);

    // 7. Prepare bundle
    console.log('⏳ Preparing client bundle...');
    await prepareRequestClientBundle({
      p_request_id: requestId3,
      p_report_id: reportId3,
      p_actor_user_id: activeStaff.auth_user_id
    });

    // 8. ASSERT: Snapshots created (direct DB check)
    const { count: snapCount } = await adminClient
      .from('report_option_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', reportId3);
    
    if (!snapCount || snapCount === 0) {
      throw new Error(`❌ FAILED: prepareRequestClientBundle did not create snapshots for report ${reportId3}`);
    }
    console.log(`✅ Snapshots created: ${snapCount}`);

    // 9. Release
    console.log('⏳ Releasing to customer...');
    await releaseRequestToCustomer({
      p_request_id: requestId3,
      p_actor_user_id: activeStaff.auth_user_id
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 10. Verify via DAL
    const reqs3 = await getCustomerRequests(testCust.id);
    const req3 = reqs3.find(r => r.request_id === requestId3);

    if (req3) {
      const isReleased = !!req3.client_released_at;
      const hasSnapshots = Number(req3.snapshot_count ?? 0) > 0;
      const reportTarget = (isReleased && hasSnapshots)
        ? `/en/reports/${req3.request_id}`
        : null;
      
      if (isReleased && hasSnapshots && reportTarget === `/en/reports/${requestId3}`) {
        console.log('✅ PASSED: Scenario 3 fully verified.');
        console.log(`   - client_released_at: ${req3.client_released_at}`);
        console.log(`   - snapshot_count: ${req3.snapshot_count}`);
        console.log(`   - Link: ${reportTarget}`);
      } else {
        console.error(`❌ FAILED: Scenario 3 validation failed. (isReleased=${isReleased}, hasSnapshots=${hasSnapshots}, target=${reportTarget})`);
        allPassed = false;
      }
    } else {
      console.error(`❌ FAILED: Request ${requestId3} not found in DAL.`);
      allPassed = false;
    }

  } finally {
    // CLEANUP
    console.log('\n--- CLEANUP & AUDIT PRESERVATION ---');
    if (allIds.length > 0) {
      // 1. Deactivate mutable records (shortlists, research items)
      await adminClient.from('request_candidate_shortlists')
        .update({ is_active: false })
        .in('request_id', allIds);
      
      await adminClient.from('research_items')
        .update({ is_candidate: false, is_shortlisted: false })
        .in('request_id', allIds);

      // 2. Archive requests to preserve audit history
      const { data: currentReqs } = await adminClient
        .from('requests')
        .select('id, title')
        .in('id', allIds);

      for (const req of (currentReqs || [])) {
        await adminClient
          .from('requests')
          .update({
            is_archived: true,
            title: `${req.title} (COMPLETED)`
          })
          .eq('id', req.id);
      }
      
      console.log('✅ Cleanup complete: Requests archived, mutable artifacts deactivated, audit history preserved.');
    }
  }

  if (!allPassed) {
    console.error('\n[VERDICT] FAILED: One or more entry guard checks failed.');
    process.exit(1);
  }

  console.log('\n[VERDICT] SUCCESS: Customer dashboard entry guard verified.');
}

main().catch(err => {
  console.error('\n[VERDICT] FAILED: Unexpected error during verification.');
  console.error(err);
  process.exit(1);
});

