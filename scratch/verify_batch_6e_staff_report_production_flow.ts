import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../src/lib/dal/customers';
import { executeTransition } from '../src/lib/dal/transitions';
import { upsertReportOptionSnapshotAdmin, markReportReadyAdmin, getReportByRequestIdAdmin } from '../src/lib/dal/reports';
import crypto from 'node:crypto';

async function verify() {
  console.log('--- BATCH 6E: STAFF REPORT PRODUCTION FLOW VERIFIER ---');
  const admin = await createAdminClient();
  const testId = crypto.randomUUID().slice(0, 8);

  // 1. Setup Data
  const { data: customer } = await admin.from('customers').insert({
    full_name: `Test Customer 6E ${testId}`,
    email: `test6e_${testId}@example.com`,
    customer_code: `C6E-${testId}`,
    status: 'active'
  }).select().single();

  const { data: staff } = await admin.from('staff_members').select('*').eq('staff_role', 'admin').eq('is_active', true).limit(1).single();
  if (!staff) throw new Error('BLOCKED: No active staff member found.');

  const { data: request, error: rErr } = await admin.from('requests').insert({
    customer_id: customer.id,
    request_code: `REQ-6E-${testId}`,
    title: `Test Request 6E ${testId}`,
    raw_description: 'Need a premium laptop',
    current_status: 'submitted',
    request_kind: 'everyday_purchase',
    pricing_model: 'fixed_fee',
    payment_policy: 'pay_after_preview',
    service_fee_amount: 500,
    source_channel: 'online'
  }).select().single();
  if (rErr) throw new Error(`Request insert failed: ${rErr.message}`);

  console.log('1. Request created:', request.id);

  await admin.from('request_preferences').insert({
    request_id: request.id,
    search_scope: 'all',
    urgency_level: 'normal'
  });
  console.log('1.1 Preferences created');

  // 2. Transition to Operations
  await executeTransition('APPROVE_INTAKE', request.id, staff.id, 'Approved for research');
  console.log('2. Transitioned to Operations (in_progress)');

  await executeTransition('START_RESEARCH', request.id, staff.id, 'Starting research');
  console.log('2.1 Transitioned to Research');

  // 3. Prepare Report Content
  const { data: report, error: repErr } = await admin.from('reports').insert({
    request_id: request.id,
    report_status: 'draft'
  }).select().single();
  if (repErr) throw new Error(`Report insert failed: ${repErr.message}`);

  // 3.1 Satisfy Shortlist Requirement
  const { data: run, error: runErr } = await admin.from('research_runs').insert({
    request_id: request.id,
    status: 'completed',
    run_kind: 'online_search'
  }).select().single();
  if (runErr) throw new Error(`Run insert failed: ${runErr.message}`);

  const { data: item1 } = await admin.from('research_items').insert({
    research_run_id: run.id,
    request_id: request.id,
    product_title: 'Premium Option A',
    source_name: 'Test Source 1',
    is_shortlisted: true
  }).select().single();

  const { data: item2 } = await admin.from('research_items').insert({
    research_run_id: run.id,
    request_id: request.id,
    product_title: 'Value Option B',
    source_name: 'Test Source 2',
    is_shortlisted: true
  }).select().single();

  const { data: item3 } = await admin.from('research_items').insert({
    research_run_id: run.id,
    request_id: request.id,
    product_title: 'Budget Option C',
    source_name: 'Test Source 3',
    is_shortlisted: true
  }).select().single();

  const { error: sErr } = await admin.from('request_candidate_shortlists').insert([
    {
      request_id: request.id,
      research_item_id: item1.id,
      option_label: 'Premium Option A',
      candidate_channel: 'online',
      selected_by_user_id: staff.auth_user_id,
      is_recommended: true,
      is_active: true,
      ranking_position: 1,
      reason_summary: 'Top performance'
    },
    {
      request_id: request.id,
      research_item_id: item2.id,
      option_label: 'Value Option B',
      candidate_channel: 'online',
      selected_by_user_id: staff.auth_user_id,
      is_recommended: true,
      is_active: true,
      ranking_position: 2,
      reason_summary: 'Best value'
    },
    {
      request_id: request.id,
      research_item_id: item3.id,
      option_label: 'Budget Option C',
      candidate_channel: 'online',
      selected_by_user_id: staff.auth_user_id,
      is_recommended: true,
      is_active: true,
      ranking_position: 3,
      reason_summary: 'Cheapest option'
    }
  ]);
  if (sErr) throw new Error(`Shortlist insert failed: ${sErr.message}`);
  console.log('3.1 Shortlist items (3) added');

  const { data: merchant } = await admin.from('merchants').insert({
    merchant_code: `M-${testId}`,
    name: 'Test Premium Merchant',
    merchant_type: 'retailer',
    is_active: true
  }).select().single();

  await admin.from('merchant_quotes').insert({
    request_id: request.id,
    merchant_id: merchant.id,
    product_title: 'Premium Option A',
    price_amount: 45000,
    currency_code: 'EGP',
    availability_status: 'in_stock'
  });
  console.log('3.2 Merchant and quote added');

  const { data: sData } = await admin.from('request_candidate_shortlists').select('id, ranking_position').eq('request_id', request.id);
  const sMap = new Map(sData?.map(s => [s.ranking_position, s.id]) || []);

  await upsertReportOptionSnapshotAdmin({
    report_id: report.id,
    request_id: request.id,
    shortlist_id: sMap.get(1),
    display_title: 'Premium Option A',
    display_rank: 1,
    display_price_amount: 45000,
    highlight_summary: 'Top tier performance, 32GB RAM.',
    hidden_merchant_name: 'Tech Giant Store',
    hidden_contact_notes: 'Ask for Mr. Ahmed at the counter.',
    candidate_channel: 'online',
    reveal_locked: true
  });

  await upsertReportOptionSnapshotAdmin({
    report_id: report.id,
    request_id: request.id,
    shortlist_id: sMap.get(2),
    display_title: 'Value Option B',
    display_rank: 2,
    display_price_amount: 25000,
    highlight_summary: 'Great value for money, 16GB RAM.',
    hidden_merchant_name: 'Budget Gadgets',
    hidden_contact_notes: 'Call +20111222333 for delivery.',
    candidate_channel: 'online',
    reveal_locked: true
  });
  console.log('3. Snapshots added to report');

  // 3.5 Move to Reporting
  await executeTransition('MOVE_TO_REPORTING', request.id, staff.id, 'Moving to reporting stage');
  console.log('3.5 Transitioned to Reporting');

  // 4. Mark Report Ready
  await markReportReadyAdmin(request.id, staff.auth_user_id);
  console.log('4. Report marked ready');

  // 5. Verification
  const { data: finalReq } = await admin.from('requests').select('current_status').eq('id', request.id).single();
  console.log('Final Status:', finalReq?.current_status);
  
  if (finalReq?.current_status !== 'client_ready') {
    throw new Error(`FAILED: Request status should be client_ready, got ${finalReq?.current_status}`);
  }

  const { data: finalReport } = await admin.from('reports').select('report_status').eq('request_id', request.id).single();
  console.log('Final Report Status:', finalReport?.report_status);

  if (finalReport?.report_status !== 'released') {
    throw new Error(`FAILED: Report status should be released, got ${finalReport?.report_status}`);
  }

  // 6. Test Masking
  const maskedReport = await getReportByRequestIdAdmin(request.id);
  console.log('Masked Report Keys:', Object.keys(maskedReport));
  
  if (!maskedReport.snapshots || maskedReport.snapshots.length === 0) {
    // Try fetching snapshots directly to see if they exist
    const { data: directSnaps } = await admin.from('report_option_snapshots').select('*').eq('request_id', request.id);
    console.log('Direct Snapshot Count:', directSnaps?.length);
    throw new Error('FAILED: No snapshots found in masked report');
  }

  const snap1 = maskedReport.snapshots[0];
  console.log('Snap 1 Masked Merchant:', snap1.merchant_name);
  
  if (snap1.merchant_name !== '*** Locked ***') {
    throw new Error(`FAILED: Snapshot should be masked, got ${snap1.merchant_name}`);
  }

  console.log('VERIFICATION SUCCESSFUL');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
