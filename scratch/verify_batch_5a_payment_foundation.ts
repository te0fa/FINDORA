import { createAdminClient } from '../src/lib/dal/customers';
import * as DAL from '../src/lib/dal/payments';
import crypto from 'node:crypto';

async function verify() {
  console.log('--- BATCH 5A PAYMENT FOUNDATION VERIFICATION ---');
  const supabase = await createAdminClient();

  const testId = crypto.randomUUID().slice(0, 8);
  const testCustomerId = crypto.randomUUID();
  const testRequestId = crypto.randomUUID();
  const testRequestCode = `REQ-5A-${testId.toUpperCase()}`;
  const testCustomerCode = `C-5A-${testId.toUpperCase()}`;
  const testEmail = `verify5a_${testId}_${Date.now()}@example.com`;

  // 1. Setup synthetic data
  console.log('[0] Fetching active staff...');
  const { data: staffMember, error: staffErr } = await supabase
    .from('staff_members')
    .select('id, auth_user_id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  if (staffErr || !staffMember) {
    throw new Error('BLOCKED: No active staff member found.');
  }
  const testStaffId = staffMember.id;
  console.log(`✅ Using staff: ${testStaffId}`);

  console.log('[0.1] Creating synthetic test customer...');
  const { error: custErr } = await supabase.from('customers').insert({
    id: testCustomerId,
    full_name: `Batch 5A Test Customer ${testId}`,
    email: testEmail,
    customer_code: testCustomerCode
  });
  if (custErr) throw new Error(`Setup failed (customer): ${custErr.message}`);

  console.log('[0.2] Creating synthetic test request...');
  const { error: reqErrSetup } = await supabase.from('requests').insert({
    id: testRequestId,
    customer_id: testCustomerId,
    request_code: testRequestCode,
    title: `Verify 5A Request ${testId}`,
    request_kind: 'everyday_purchase',
    current_status: 'open',
    raw_description: 'Batch 5A Verification Request'
  });
  if (reqErrSetup) throw new Error(`Setup failed (request): ${reqErrSetup.message}`);

  console.log('[0.3] Ensuring test request has a report...');
  const { data: report, error: repErr } = await supabase.from('reports').insert({
    request_id: testRequestId,
    report_version: 1,
    report_status: 'ready'
  }).select('id').maybeSingle();
  if (repErr || !report) throw new Error('Failed to create report snapshot');

  // 2. Create Payment Intent
  console.log('[1] Creating payment intent...');
  const intent = await DAL.createPaymentIntentAdmin({
    requestId: testRequestId,
    customerId: testCustomerId,
    intentType: 'report_unlock',
    amount: 150,
    currencyCode: 'EGP',
    actorStaffId: testStaffId,
    metadata: { batch: '5a_verify', testId }
  });
  console.log('✅ Created intent:', intent.id);

  // 3. Verify payment_required draft message queued
  console.log('[2] Verifying payment_required draft message...');
  const { data: msgs } = await supabase
    .from('outbound_messages')
    .select('id, status')
    .eq('request_id', testRequestId)
    .eq('template_code', 'payment_required')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (msgs && msgs.length > 0 && msgs[0].status === 'draft') {
    console.log('✅ Found draft payment_required message.');
  } else {
    throw new Error('❌ Draft payment_required message not found or wrong status.');
  }

  // 4. Confirm Payment Manually
  console.log('[3] Confirming payment manually...');
  await DAL.confirmPaymentIntentAdmin({
    id: intent.id,
    actorStaffId: testStaffId,
    notes: `Verified in Batch 5A test ${testId}`,
    externalReference: `MOCK-5A-${testId.toUpperCase()}`
  });
  
  const confirmedIntent = await DAL.getPaymentIntentAdmin(intent.id);
  if (confirmedIntent.status === 'confirmed') {
    console.log('✅ Payment confirmed successfully.');
  } else {
    throw new Error('Payment confirmation failed.');
  }

  // 5. Verify payment audit event exists
  console.log('[4] Verifying audit events...');
  const { data: auditEvents } = await supabase
    .from('payment_audit_events')
    .select('event_type')
    .eq('payment_intent_id', intent.id);
  
  const hasConfirmedEvent = auditEvents?.some(e => e.event_type === 'PAYMENT_CONFIRMED');
  if (hasConfirmedEvent) {
    console.log('✅ Found PAYMENT_CONFIRMED audit event.');
  } else {
    throw new Error('Audit event missing.');
  }

  // 6. Verify intelligence events
  console.log('[5] Verifying intelligence events...');
  const [platformEvents, intelEvents] = await Promise.all([
    supabase.from('platform_events').select('event_type').eq('request_id', testRequestId).eq('event_type', 'payment_recorded'),
    supabase.from('customer_intelligence_events').select('event_type').eq('customer_id', testCustomerId).eq('event_type', 'payment_made')
  ]);

  if (platformEvents.data?.length && intelEvents.data?.length) {
    console.log('✅ Intelligence events logged correctly.');
  } else {
    throw new Error('Intelligence events missing.');
  }

  // 7. Verify payment_received draft message queued
  console.log('[6] Verifying payment_received draft message...');
  const { data: receivedMsgs } = await supabase
    .from('outbound_messages')
    .select('id, status')
    .eq('request_id', testRequestId)
    .eq('template_code', 'payment_received')
    .order('created_at', { ascending: false })
    .limit(1);

  if (receivedMsgs && receivedMsgs.length > 0 && receivedMsgs[0].status === 'draft') {
    console.log('✅ Found draft payment_received message.');
  } else {
    throw new Error('❌ Draft payment_received message not found or wrong status.');
  }

  // 8. Unlock Report
  console.log('[7] Testing report unlock...');
  const unlock = await DAL.unlockReportAfterPaymentAdmin({
    requestId: testRequestId,
    customerId: testCustomerId,
    paymentIntentId: intent.id,
    unlockType: 'report_full',
    actorStaffId: testStaffId,
    revealText: `VERIFIER-UNLOCK-${testId}`
  });
  console.log('✅ Report unlocked:', unlock.id);

  // 9. Cleanup
  console.log('[8] Cleaning up synthetic data...');
  await supabase.from('source_reveals').delete().eq('request_id', testRequestId);
  await supabase.from('payment_audit_events').delete().eq('request_id', testRequestId);
  await supabase.from('payment_intents').delete().eq('request_id', testRequestId);
  await supabase.from('payments').delete().eq('request_id', testRequestId);
  await supabase.from('report_option_snapshots').delete().eq('request_id', testRequestId);
  await supabase.from('reports').delete().eq('request_id', testRequestId);
  await supabase.from('merchant_performance_events').delete().eq('request_id', testRequestId);
  await supabase.from('merchant_quotes').delete().eq('request_id', testRequestId);
  await supabase.from('outbound_messages').delete().eq('request_id', testRequestId);
  await supabase.from('platform_events').delete().eq('request_id', testRequestId);
  await supabase.from('customer_intelligence_events').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_score_snapshots').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_segments').delete().eq('customer_id', testCustomerId);
  await supabase.from('request_status_history').delete().eq('request_id', testRequestId);
  await supabase.from('request_preferences').delete().eq('request_id', testRequestId);
  await supabase.from('requests').delete().eq('id', testRequestId);
  await supabase.from('communication_preferences').delete().eq('customer_id', testCustomerId);
  await supabase.from('customers').delete().eq('id', testCustomerId);

  // 10. Final Assertions
  console.log('[9] Running final assertions...');
  const assertEmpty = async (table: string, col: string, val: string) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, val);
    if (count && count > 0) throw new Error(`Cleanup failed: ${count} rows remain in ${table} for ${col}=${val}`);
  };

  await assertEmpty('source_reveals', 'request_id', testRequestId);
  await assertEmpty('payment_audit_events', 'request_id', testRequestId);
  await assertEmpty('payment_intents', 'request_id', testRequestId);
  await assertEmpty('payments', 'request_id', testRequestId);
  await assertEmpty('reports', 'request_id', testRequestId);
  await assertEmpty('requests', 'id', testRequestId);
  await assertEmpty('customers', 'id', testCustomerId);

  console.log('\n[VERDICT] SUCCESS: Batch 5A Payment Foundation verified.');
}

verify().catch(err => {
  console.error('\n[VERDICT] FAILED:', err.message);
  process.exitCode = 1;
});
