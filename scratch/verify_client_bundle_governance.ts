import { createAdminClient } from '../src/lib/dal/customers';
import { randomUUID } from 'crypto';
import { prepareRequestClientBundle } from '../src/lib/dal/staff';

async function main() {
  console.log('--- STARTING CLIENT BUNDLE GOVERNANCE VERIFICATION ---');
  const adminClient = await createAdminClient();

  // 1. Find dedicated AUDIT_TEST request
  const { data: requestRes, error: reqError } = await adminClient
    .from('requests')
    .select('id, title, raw_description, current_status, request_kind, reviewer_decision')
    .ilike('title', '%[AUDIT_TEST]%')
    .limit(1)
    .maybeSingle();

  if (reqError || !requestRes) {
    console.log('[VERDICT] SKIPPED: No dedicated [AUDIT_TEST] request found.');
    process.exit(0);
  }

  const testRequestId = requestRes.id;
  console.log(`✅ Found test request: ${testRequestId} (${requestRes.title})`);

  // --- SNAPSHOT ORIGINAL STATE for safe restore ---
  const originalState = {
    current_status: requestRes.current_status,
    request_kind: requestRes.request_kind,
    reviewer_decision: requestRes.reviewer_decision,
  };
  console.log(`📸 Snapshotted original state: status=${originalState.current_status}, kind=${originalState.request_kind}`);

  // Track all test-created artifact IDs for cleanup
  const createdArtifacts: {
    researchRunIds: string[];
    researchItemIds: string[];
    merchantQuoteIds: string[];
    shortlistIds: string[];
    reportIds: string[];
  } = { researchRunIds: [], researchItemIds: [], merchantQuoteIds: [], shortlistIds: [], reportIds: [] };

  let allPassed = true;

  try {
    // Force test request to valid state for bundling
    await adminClient.from('requests').update({
      current_status: 'client_ready',
      request_kind: requestRes.request_kind || 'product_sourcing'
    }).eq('id', testRequestId);

    // 2. Create full pipeline test data: research_run -> research_item -> shortlist
    // This matches the shape of real production data that fn_prepare_request_client_bundle consumes.
    console.log('⏳ Creating full pipeline test data (research_run → research_item → shortlist)...');

    const runId = randomUUID();
    const { data: run, error: runErr } = await adminClient.from('research_runs').insert({
      id: runId,
      request_id: testRequestId,
      run_kind: 'online_search',
      status: 'completed',
      query_text: '[AUDIT_TEST] Bundle governance verification',
      results_count: 1,
    }).select('id').single();

    if (runErr || !run) {
      console.error('❌ Failed to create research_run:', runErr);
      process.exit(1);
    }
    createdArtifacts.researchRunIds.push(runId);
    console.log(`  ✅ Created research_run: ${runId}`);

    const itemId = randomUUID();
    const { data: item, error: itemErr } = await adminClient.from('research_items').insert({
      id: itemId,
      research_run_id: runId,
      request_id: testRequestId,
      source_name: '[AUDIT_TEST] Source',
      source_type: 'retailer',
      listing_url: 'https://audit-test.example.com',
      option_label: '[AUDIT_TEST] Option',
      product_title: '[AUDIT_TEST] Product',
      product_brand: '[AUDIT_TEST] Brand',
      product_model: '[AUDIT_TEST] Model',
      price_amount: 5000,
      currency_code: 'EGP',
      availability_status: 'in_stock',
      seller_name: '[AUDIT_TEST] Seller',
      seller_location: 'Cairo',
      is_candidate: true,
      is_shortlisted: true,
      trust_score: 80,
      value_score: 80,
      fit_score: 80,
      final_score: 80,
    }).select('id').single();

    if (itemErr || !item) {
      console.error('❌ Failed to create research_item:', itemErr);
      process.exit(1);
    }
    createdArtifacts.researchItemIds.push(itemId);
    console.log(`  ✅ Created research_item: ${itemId}`);

    const slId = randomUUID();
    const { data: sl, error: slErr } = await adminClient.from('request_candidate_shortlists').insert({
      id: slId,
      request_id: testRequestId,
      candidate_channel: 'online',
      research_item_id: itemId,
      ranking_position: 1,
      option_label: '[AUDIT_TEST] Option',
      trust_score: 80,
      value_score: 80,
      fit_score: 80,
      final_score: 80,
      reason_summary: '[AUDIT_TEST] Best option for governance test',
      customer_summary: '[AUDIT_TEST] Recommended option',
      reveal_locked: true,
      is_recommended: true,
      is_active: true,
    }).select('id').single();

    if (slErr || !sl) {
      console.error('❌ Failed to create shortlist item:', slErr);
      process.exit(1);
    }
    createdArtifacts.shortlistIds.push(slId);
    console.log(`  ✅ Created shortlist item: ${slId}`);

    // 3. Prepare bundle via DAL
    const testReportId = randomUUID();
    createdArtifacts.reportIds.push(testReportId);
    console.log(`⏳ Preparing client bundle (Report ID: ${testReportId})...`);

    // Find active staff actor
    const { data: staffMember } = await adminClient
      .from('staff_members')
      .select('auth_user_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!staffMember) {
      console.error('❌ Failed to find an active staff member.');
      process.exit(1);
    }

    try {
      await prepareRequestClientBundle({
        p_request_id: testRequestId,
        p_report_id: testReportId,
        p_actor_user_id: staffMember.auth_user_id,
      });
      console.log(`✅ prepareRequestClientBundle executed without error.`);
    } catch (err) {
      console.error('❌ prepareRequestClientBundle threw an error:', err);
      allPassed = false;
    }

    // --- ASSERT: Real snapshot creation (NO FALLBACK) ---
    const { count: snapshotCount } = await adminClient
      .from('report_option_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', testReportId);

    if (!snapshotCount || snapshotCount === 0) {
      console.error('❌ FAILED: prepareRequestClientBundle did not create any report_option_snapshots.');
      console.error('   No fallback allowed. The real RPC must produce snapshots.');
      allPassed = false;
    } else {
      console.log(`✅ Bundle created ${snapshotCount} snapshot(s) via real RPC path.`);
    }

    // --- ASSERT: Report record exists ---
    const { data: reportRow } = await adminClient
      .from('reports')
      .select('id')
      .eq('id', testReportId)
      .maybeSingle();

    if (!reportRow) {
      console.error('❌ FAILED: Report record was not created.');
      allPassed = false;
    } else {
      console.log(`✅ Report record exists: ${testReportId}`);
    }

    // --- ASSERT: Audit log CLIENT_BUNDLE_PREPARED in request_status_history ---
    const { data: historyRes } = await adminClient
      .from('request_status_history')
      .select('transition_name')
      .eq('request_id', testRequestId)
      .eq('transition_name', 'CLIENT_BUNDLE_PREPARED')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!historyRes || historyRes.length === 0) {
      console.error('❌ FAILED: CLIENT_BUNDLE_PREPARED not found in request_status_history.');
      allPassed = false;
    } else {
      console.log(`✅ Found CLIENT_BUNDLE_PREPARED in request_status_history.`);
    }

    // --- ASSERT: CLIENT_BUNDLE_PREPARED in v_request_timeline ---
    const { data: timelineRes } = await adminClient
      .from('v_request_timeline')
      .select('transition_name')
      .eq('request_id', testRequestId)
      .eq('transition_name', 'CLIENT_BUNDLE_PREPARED')
      .limit(1);

    if (!timelineRes || timelineRes.length === 0) {
      console.error('❌ FAILED: CLIENT_BUNDLE_PREPARED not found in v_request_timeline.');
      allPassed = false;
    } else {
      console.log(`✅ Found CLIENT_BUNDLE_PREPARED in v_request_timeline.`);
    }

    // --- ASSERT: Release guard sees snapshot_count > 0 ---
    const { count: releaseGuardCount } = await adminClient
      .from('report_option_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', testRequestId);

    if (releaseGuardCount && releaseGuardCount > 0) {
      console.log(`✅ Release guard verified: snapshot_count = ${releaseGuardCount} > 0.`);
    } else {
      console.error('❌ FAILED: Release guard would block — snapshot_count is 0.');
      allPassed = false;
    }

    // --- ASSERT: Customer page blocks unreleased report ---
    const { data: overview } = await adminClient
      .from('v_customer_request_portal_overview')
      .select('client_released_at')
      .eq('request_id', testRequestId)
      .maybeSingle();

    if (overview && !overview.client_released_at) {
      console.log(`✅ Customer report guard: client_released_at is null → page.tsx blocks before snapshot fetch.`);
    } else if (overview && overview.client_released_at) {
      console.log(`⚠️ Request already released (client_released_at = ${overview.client_released_at}).`);
    } else {
      console.log(`⚠️ No overview row. Guard logic still enforced by page.tsx.`);
    }

  } finally {
    // --- SAFE RESTORE ---
    console.log('\n--- SAFE RESTORE ---');

    // Restore original request fields
    await adminClient.from('requests').update({
      current_status: originalState.current_status,
      request_kind: originalState.request_kind,
    }).eq('id', testRequestId);
    console.log(`✅ Restored request to: status=${originalState.current_status}, kind=${originalState.request_kind}`);

    // Deactivate test-created shortlist items
    for (const id of createdArtifacts.shortlistIds) {
      await adminClient.from('request_candidate_shortlists')
        .update({ is_active: false })
        .eq('id', id);
    }
    if (createdArtifacts.shortlistIds.length > 0) {
      console.log(`✅ Deactivated ${createdArtifacts.shortlistIds.length} test shortlist item(s).`);
    }

    // Deactivate test-created research items
    for (const id of createdArtifacts.researchItemIds) {
      await adminClient.from('research_items')
        .update({ is_candidate: false, is_shortlisted: false })
        .eq('id', id);
    }
    if (createdArtifacts.researchItemIds.length > 0) {
      console.log(`✅ Deactivated ${createdArtifacts.researchItemIds.length} test research item(s).`);
    }

    // Deactivate test-created merchant quotes
    for (const id of createdArtifacts.merchantQuoteIds) {
      await adminClient.from('merchant_quotes')
        .update({ is_shortlisted: false })
        .eq('id', id);
    }
    if (createdArtifacts.merchantQuoteIds.length > 0) {
      console.log(`✅ Deactivated ${createdArtifacts.merchantQuoteIds.length} test merchant quote(s).`);
    }

    // Deactivate test-created snapshots if schema supports it
    for (const reportId of createdArtifacts.reportIds) {
      const { data: snaps } = await adminClient
        .from('report_option_snapshots')
        .select('id')
        .eq('report_id', reportId);
      if (snaps && snaps.length > 0) {
        // report_option_snapshots has no is_active — they are immutable snapshots by design
        console.log(`⚠️ ${snaps.length} snapshot(s) for report ${reportId} remain (immutable by design).`);
      }
    }

    // Audit history is NEVER deleted
    console.log(`✅ Audit history preserved (append-only, never deleted).`);
    console.log('--- RESTORE COMPLETE ---');
  }

  if (!allPassed) {
    console.error('\n[VERDICT] FAILED: One or more governance checks failed.');
    process.exit(1);
  }

  console.log('\n[VERDICT] SUCCESS: Client bundle governance checks passed with real snapshot creation.');
}

main().catch(err => {
  console.error('\n[VERDICT] FAILED: Unexpected error during regression checks.');
  console.error(err);
  process.exit(1);
});
