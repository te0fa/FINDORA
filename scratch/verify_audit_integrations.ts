import { createAdminClient } from '../src/lib/dal/customers';
import { saveMerchantQuote, addToShortlist } from '../src/lib/dal/staff';
import { addManualResearchItem } from '../src/lib/dal/research';

async function verifyIntegrations() {
  const adminClient = await createAdminClient();

  async function getTableColumns(tableName: string): Promise<Set<string>> {
    const { data, error } = await adminClient
      .from(tableName)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return new Set();
    return new Set(Object.keys(data));
  }

  // 1. Setup Context with Strict Isolation
  console.log('--- Setup ---');
  
  // Search for dedicated [AUDIT_TEST] request
  const { data: testReq } = await adminClient
    .from('requests')
    .select('id, title, raw_description')
    .or('title.ilike.%[AUDIT_TEST]%,raw_description.ilike.%[AUDIT_TEST]%')
    .limit(1)
    .maybeSingle();

  if (!testReq) {
    console.log('\nSKIPPED: No dedicated [AUDIT_TEST] request found.');
    console.log('Create a request with "[AUDIT_TEST]" in the title or description before running this regression.');
    return;
  }

  const { data: staff } = await adminClient.from('staff_members').select('id, auth_user_id').limit(1).maybeSingle();

  if (!staff) {
    console.error('No staff found to test with.');
    process.exit(1);
  }

  console.log(`Selected Request ID: ${testReq.id}`);
  console.log(`Safety Rationale:   Dedicated test request (Matched: "${testReq.title}")`);
  console.log(`Staff ID:           ${staff.id} (${staff.auth_user_id})`);

  // 2. Test Offline Quote Integration
  console.log('\n--- Testing OFFLINE_QUOTE_ADDED ---');
  const quote = await saveMerchantQuote({
    request_id: testReq.id,
    merchant_name: '[AUDIT_TEST] Merchant',
    product_title: '[AUDIT_TEST] Product',
    price_amount: 99.99,
    captured_by_staff_id: staff.id
  });
  console.log(`Quote saved: ${quote.id}`);

  // 3. Test Online Finding Integration
  console.log('\n--- Testing ONLINE_FINDING_ADDED ---');
  const finding = await addManualResearchItem({
    request_id: testReq.id,
    source_name: '[AUDIT_TEST] Source',
    product_title: '[AUDIT_TEST] Finding',
    captured_by_staff_id: staff.id
  });
  console.log(`Finding saved: ${finding.id}`);

  // 4. Test Shortlist Integration
  console.log('\n--- Testing SHORTLIST_ITEM_ADDED ---');
  const item = await addToShortlist({
    request_id: testReq.id,
    candidate_channel: 'online',
    research_item_id: finding.id,
    reason_summary: '[AUDIT_TEST] integration test item',
    selected_by_user_id: staff.auth_user_id
  });
  console.log(`Shortlist item saved: ${item.id}`);

  // 5. Verification Summary
  console.log('\n--- Verifying Audit History (with Artifact IDs) ---');
  const { data: logs, error } = await adminClient
    .from('request_status_history')
    .select('*')
    .eq('request_id', testReq.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching logs:', error.message);
    return;
  }

  const required = [
    { event: 'OFFLINE_QUOTE_ADDED', id: quote.id, key: 'merchant_quote_id' },
    { event: 'ONLINE_FINDING_ADDED', id: finding.id, key: 'research_item_id' },
    { event: 'SHORTLIST_ITEM_ADDED', id: item.id, key: 'shortlist_id' }
  ];

  const results: any[] = [];
  let allPassed = true;

  required.forEach(reqCheck => {
    const log = logs?.find(l => 
      l.transition_name === reqCheck.event && 
      l.metadata?.[reqCheck.key] === reqCheck.id
    );

    if (log) {
      results.push({ event: reqCheck.event, status: 'PASS', artifact_id: reqCheck.id, verified: 'ID Match' });
      console.log(`[PASS] ${reqCheck.event} found with correct ID: ${reqCheck.id}`);
    } else {
      results.push({ event: reqCheck.event, status: 'FAIL', artifact_id: reqCheck.id, verified: 'Not found or ID mismatch' });
      console.error(`[FAIL] ${reqCheck.event} NOT found for ID: ${reqCheck.id}`);
      allPassed = false;
    }
  });

  // 6. Schema-Aware Cleanup (Deactivate artifacts, preserve history)
  console.log('\n--- Cleanup Mutable Artifacts ---');
  
  // Merchant Quotes cleanup
  const quoteCols = await getTableColumns('merchant_quotes');
  const quotePayload: any = {};
  if (quoteCols.has('is_active')) quotePayload.is_active = false;
  if (quoteCols.has('is_shortlisted')) quotePayload.is_shortlisted = false;
  
  if (Object.keys(quotePayload).length > 0) {
    const { error: err } = await adminClient.from('merchant_quotes').update(quotePayload).eq('id', quote.id);
    console.log(`Quote Cleanup: ${err ? 'FAIL: ' + err.message : 'SUCCESS (' + Object.keys(quotePayload).join(', ') + ')'}`);
  } else {
    console.log('WARN: merchant_quotes has no cleanup visibility columns.');
  }

  // Research Items cleanup
  const findCols = await getTableColumns('research_items');
  const findPayload: any = {};
  if (findCols.has('is_active')) findPayload.is_active = false;
  if (findCols.has('is_candidate')) findPayload.is_candidate = false;
  if (findCols.has('is_shortlisted')) findPayload.is_shortlisted = false;

  if (Object.keys(findPayload).length > 0) {
    const { error: err } = await adminClient.from('research_items').update(findPayload).eq('id', finding.id);
    console.log(`Finding Cleanup: ${err ? 'FAIL: ' + err.message : 'SUCCESS (' + Object.keys(findPayload).join(', ') + ')'}`);
  } else {
    console.log('WARN: research_items has no deactivation column; [AUDIT_TEST] finding may remain visible in research history.');
  }

  // Shortlist Item cleanup
  const shortCols = await getTableColumns('request_candidate_shortlists');
  const shortPayload: any = {};
  if (shortCols.has('is_active')) shortPayload.is_active = false;

  if (Object.keys(shortPayload).length > 0) {
    const { error: err } = await adminClient.from('request_candidate_shortlists').update(shortPayload).eq('id', item.id);
    console.log(`Shortlist Item Cleanup: ${err ? 'FAIL: ' + err.message : 'SUCCESS (' + Object.keys(shortPayload).join(', ') + ')'}`);
  } else {
    console.log('WARN: request_candidate_shortlists has no is_active cleanup column.');
  }

  // 7. Strengthen Timeline Confirmation
  console.log('\n--- Final Timeline Visibility Confirmation (Exact IDs) ---');
  const { data: timelineData } = await adminClient
    .from('v_request_timeline')
    .select('*')
    .eq('request_id', testReq.id);

  required.forEach(reqCheck => {
    const visible = timelineData?.some(t => 
      t.transition_name === reqCheck.event && 
      t.metadata?.[reqCheck.key] === reqCheck.id
    );
    console.log(`Timeline ${reqCheck.event} exact artifact visibility: ${visible ? 'PASS' : 'FAIL'}`);
    if (!visible) allPassed = false;
  });

  console.log('\n--- Final IDs Summary ---');
  console.log(`Request ID:    ${testReq.id}`);
  console.log(`Created Quote: ${quote.id}`);
  console.log(`Created Find:  ${finding.id}`);
  console.log(`Created Short: ${item.id}`);
  console.log('NOTE: Audit history (request_status_history) remains preserved and immutable.');

  console.log('\n--- Verification Results ---');
  console.table(results);

  if (!allPassed) {
    console.error('\n[VERDICT] FAILED: Audit regression checks failed.');
    process.exit(1);
  }

  console.log('\n[VERDICT] SUCCESS: Audit regression checks passed with exact artifact traceability.');
}

verifyIntegrations().catch(err => {
  console.error('Integration test crashed:', err);
  process.exit(1);
});
