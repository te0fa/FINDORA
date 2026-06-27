import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from '../src/lib/dal/customers';
import { randomUUID } from 'crypto';
import { getOrCreatePaymentIntentForCustomer, submitPaymentReceipt } from '../src/lib/dal/payments';

import { getCustomerReportSnapshots } from '../src/lib/dal/reports';

async function runTest() {
  console.log('--- STARTING PAYMENT CONFIRMATION FLOW TEST ---');
  const db = await createAdminClient();

  // 1. Fetch a real customer
  const { data: customers } = await db
    .from('customers')
    .select('id, auth_user_id')
    .not('auth_user_id', 'is', null)
    .limit(1);

  if (!customers || customers.length === 0) {
    console.error('❌ No customer found for testing');
    process.exit(1);
  }

  const testCustomer = customers[0];
  console.log(`✅ Using customer: ${testCustomer.id}`);

  // 2. Create mock Request
  const testRequestId = randomUUID();
  const { error: reqErr } = await db.from('requests').insert({
    id: testRequestId,
    title: `[TEST_PAYMENT] Sourcing Request ${testRequestId.substring(0, 8)}`,
    request_code: `TX-${testRequestId.substring(0, 8)}`,
    customer_id: testCustomer.id,
    payment_policy: 'pay_after_preview',
    service_fee_amount: 75.00,
    current_status: 'submitted',
    raw_description: 'Test description'
  });




  if (reqErr) {
    console.error('❌ Failed to create request:', reqErr);
    process.exit(1);
  }
  console.log(`✅ Mock request created: ${testRequestId}`);

  // 3. Create mock Report
  const testReportId = randomUUID();
  const { error: repErr } = await db.from('reports').insert({
    id: testReportId,
    request_id: testRequestId,
    report_status: 'draft'
  });

  if (repErr) {
    console.error('❌ Failed to create report:', repErr);
    await db.from('requests').delete().eq('id', testRequestId);
    process.exit(1);
  }
  console.log(`✅ Mock report created: ${testReportId}`);

  // 4. Create mock Snapshot (locked)
  const testSnapshotId = randomUUID();
  const { error: snapErr } = await db.from('report_option_snapshots').insert({
    id: testSnapshotId,
    request_id: testRequestId,
    report_id: testReportId,
    display_title: 'Test Option',
    highlight_summary: 'Test summary',
    display_rank: 1,
    reveal_locked: true,
    hidden_merchant_name: 'Super Secret Vendor',
    candidate_channel: 'online'
  });

  if (snapErr) {
    console.error('❌ Failed to create snapshot:', snapErr);
    await db.from('reports').delete().eq('id', testReportId);
    await db.from('requests').delete().eq('id', testRequestId);
    process.exit(1);
  }
  console.log(`✅ Mock snapshot created: ${testSnapshotId}`);

  // Find an active staff member to use for transition
  const { data: staffList } = await db
    .from('staff_members')
    .select('id')
    .eq('is_active', true)
    .limit(1);

  if (!staffList || staffList.length === 0) {
    console.error('❌ Failed to find an active staff member for transition.');
    await db.from('report_option_snapshots').delete().eq('request_id', testRequestId);
    await db.from('reports').delete().eq('id', testReportId);
    await db.from('requests').delete().eq('id', testRequestId);
    process.exit(1);
  }
  const activeStaffId = staffList[0].id;

  // Insert candidate shortlist to satisfy release constraints
  await db.from('request_candidate_shortlists').insert({
    request_id: testRequestId,
    candidate_channel: 'online',
    option_label: '[TEST_PAYMENT] Shortlist Item',
    ranking_position: 1
  });

  // Set request to client_ready status to allow release transition
  await db.from('requests').update({ current_status: 'client_ready' }).eq('id', testRequestId);

  // Execute RELEASE_FINAL transition
  const { error: transErr } = await db.rpc('fn_execute_request_transition', {
    p_transition_name: 'RELEASE_FINAL',
    p_request_id: testRequestId,
    p_actor_staff_id: activeStaffId
  });

  if (transErr) {
    console.error('❌ RELEASE_FINAL transition failed:', transErr);
    await db.from('request_candidate_shortlists').delete().eq('request_id', testRequestId);
    await db.from('report_option_snapshots').delete().eq('request_id', testRequestId);
    await db.from('reports').delete().eq('id', testReportId);
    await db.from('requests').delete().eq('id', testRequestId);
    process.exit(1);
  }
  console.log('✅ RELEASE_FINAL transition executed. Request is now visible to client.');

  let success = true;


  try {
    // 5. Test getOrCreatePaymentIntentForCustomer
    console.log('⏳ Running getOrCreatePaymentIntentForCustomer...');
    const intent = await getOrCreatePaymentIntentForCustomer(testRequestId, testCustomer.id);
    console.log(`✅ Intent created/fetched: ID=${intent.id}, Status=${intent.status}, Amount=${intent.amount}`);

    if (intent.status !== 'pending_customer') {
      console.error(`❌ Expected intent status to be pending_customer, got ${intent.status}`);
      success = false;
    }
    if (Number(intent.amount) !== 75) {
      console.error(`❌ Expected intent amount to be 75, got ${intent.amount}`);
      success = false;
    }

    // 6. Test submitPaymentReceipt
    console.log('⏳ Submitting payment receipt...');
    const receiptPath = 'http://example.com/receipt.jpg';
    const updatedIntent = await submitPaymentReceipt({
      paymentIntentId: intent.id,
      receiptImagePath: receiptPath
    });

    console.log(`✅ Receipt submitted. New status: ${updatedIntent.status}`);
    if (updatedIntent.status !== 'submitted') {
      console.error(`❌ Expected intent status to be submitted, got ${updatedIntent.status}`);
      success = false;
    }
    if (updatedIntent.receipt_image_path !== receiptPath) {
      console.error(`❌ Expected receipt_image_path to be ${receiptPath}, got ${updatedIntent.receipt_image_path}`);
      success = false;
    }

    // 7. Verify snapshot has been automatically unlocked
    const rawReqAfter = await db.from('requests').select('*').eq('id', testRequestId).single();
    console.log('🔍 Debug requests table record:', rawReqAfter.data);

    const overview = await db.from('v_request_ui_status').select('*').eq('request_id', testRequestId);
    console.log('🔍 Debug v_request_ui_status record (all rows):', overview.data);

    const snapshots = await getCustomerReportSnapshots(testRequestId, testCustomer.auth_user_id);
    console.log(`🔍 Debug snapshots fetched: ${snapshots ? snapshots.length : 0} items`);


    const targetSnapshot = snapshots.find(s => s.id === testSnapshotId);
    if (!targetSnapshot) {
      console.error('❌ Failed to find the snapshot in customer snapshots list. Snapshot list contents:', snapshots);
      success = false;
    } else {
      console.log(`✅ Snapshot state: reveal_locked=${targetSnapshot.reveal_locked}`);
      if (targetSnapshot.reveal_locked !== false) {
        console.error('❌ Expected snapshot reveal_locked to be false after receipt upload!');
        success = false;
      } else {
        console.log('🎉 Snapshot was successfully unlocked!');
      }
    }

  } catch (err: any) {
    console.error('❌ Unexpected test error:', err);
    success = false;
  } finally {
    // Cleanup
    console.log('⏳ Cleaning up test data...');
    await db.from('request_candidate_shortlists').delete().eq('request_id', testRequestId);
    await db.from('report_option_snapshots').delete().eq('request_id', testRequestId);
    await db.from('payment_audit_events').delete().eq('request_id', testRequestId);
    await db.from('payment_intents').delete().eq('request_id', testRequestId);
    await db.from('reports').delete().eq('id', testReportId);
    await db.from('requests').delete().eq('id', testRequestId);
    console.log('✅ Cleanup finished.');
  }

  if (success) {
    console.log('🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ TEST FAILED');
    process.exit(1);
  }
}

runTest();
