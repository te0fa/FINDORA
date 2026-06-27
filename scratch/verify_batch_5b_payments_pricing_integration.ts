import { createAdminClient } from '../src/lib/dal/customers';
import * as DAL from '../src/lib/dal/payments';
import crypto from 'node:crypto';

async function verify() {
  console.log('--- BATCH 5B PAYMENTS & PRICING INTEGRATION VERIFICATION ---');
  const supabase = await createAdminClient();

  const testId = crypto.randomUUID().slice(0, 8);
  const testCustomerId = crypto.randomUUID();
  const testRequestId = crypto.randomUUID();
  const testRequestCode = `REQ-5B-${testId.toUpperCase()}`;
  const testCustomerCode = `C-5B-${testId.toUpperCase()}`;
  const testEmail = `verify5b_${testId}_${Date.now()}@example.com`;

  // 0. Fetch active staff
  const { data: staff } = await supabase.from('staff_members').select('id').eq('is_active', true).limit(1).maybeSingle();
  if (!staff?.id) {
    throw new Error('BLOCKED: No active staff member found.');
  }

  // 1. Setup synthetic data
  console.log('[0] Setting up fresh synthetic request with service_fee_amount...');
  const { error: custErr } = await supabase.from('customers').insert({
    id: testCustomerId,
    full_name: `Batch 5B Test Customer ${testId}`,
    email: testEmail,
    customer_code: testCustomerCode
  });
  if (custErr) throw custErr;

  const { error: reqErr } = await supabase.from('requests').insert({
    id: testRequestId,
    customer_id: testCustomerId,
    request_code: testRequestCode,
    title: `Verify 5B Request ${testId}`,
    request_kind: 'everyday_purchase',
    current_status: 'open',
    raw_description: 'Batch 5B Verification Request',
    service_fee_amount: 250,
    pricing_decision: 'pending_review',
    pricing_notes: `Automated test fee ${testId}`
  });
  if (reqErr) throw reqErr;

  // 2. Verify getRequestsNeedingPaymentAdmin
  console.log('[1] Verifying Needs Payment detection...');
  const needsRes = await DAL.getRequestsNeedingPaymentAdmin({ limit: 10 });
  const foundReq = needsRes.items.find(r => r.id === testRequestId);
  if (!foundReq) throw new Error('Request with fee not found in Needs Payment list');
  console.log('✅ Found request in Needs Payment list.');

  // 3. Create Intent from Request
  console.log('[2] Creating payment intent from request...');
  const intent = await DAL.createPaymentIntentAdmin({
    requestId: testRequestId,
    customerId: testCustomerId,
    intentType: 'request_fee',
    amount: foundReq.service_fee_amount,
    actorStaffId: staff.id
  });
  console.log(`✅ Created intent: ${intent.id}`);

  // 4. Verify communication drafts
  console.log('[2.1] Verifying payment_required draft for fresh request...');
  const { data: commsFresh } = await supabase.from('outbound_messages')
    .select('template_code')
    .eq('request_id', testRequestId)
    .eq('template_code', 'payment_required');
  if (!commsFresh || commsFresh.length !== 1) throw new Error('Fresh request should have exactly one payment_required draft');
  console.log('✅ Fresh request has one payment_required draft.');

  // 4.5 Test Deduplication
  console.log('[2.2] Testing communication deduplication...');
  // Try to create another intent for the same request, which should trigger queueCommunication again
  await DAL.createPaymentIntentAdmin({
    requestId: testRequestId,
    customerId: testCustomerId,
    intentType: 'request_fee',
    amount: 10, // Small amount
    actorStaffId: staff.id
  });
  
  const { data: commsDedupe } = await supabase.from('outbound_messages')
    .select('template_code')
    .eq('request_id', testRequestId)
    .eq('template_code', 'payment_required');
  if (commsDedupe && commsDedupe.length > 1) throw new Error('Deduplication failed: multiple payment_required drafts found for same request');
  console.log('✅ Communication deduplication verified (no duplicate drafts).');

  // 5. Confirm Payment
  console.log('[3] Confirming payment manually...');
  await DAL.confirmPaymentIntentAdmin({
    id: intent.id,
    actorStaffId: staff.id,
    externalReference: `REF-5B-${testId.toUpperCase()}`
  });
  console.log('✅ Payment confirmed.');

  // 6. Verify request now hidden from Needs Payment
  const needsRes3 = await DAL.getRequestsNeedingPaymentAdmin({ limit: 10 });
  if (needsRes3.items.find(r => r.id === testRequestId)) {
    throw new Error('Request should be removed from Needs Payment after confirmation');
  }
  console.log('✅ Request successfully removed from Needs Payment list.');

  // 7. Verify Ledger
  console.log('[4] Verifying Ledger entry...');
  const ledger = await DAL.listConfirmedPaymentsLedgerAdmin({ limit: 10 });
  const ledgerEntry = ledger.items.find(p => p.request_id === testRequestId);
  if (!ledgerEntry) throw new Error('Legacy payment row not found');
  console.log('✅ Legacy payments row synced successfully.');

  // 8. Verify Intelligence & Comms
  console.log('[5] Verifying intelligence and communication drafts...');
  const { data: events } = await supabase.from('platform_events').select('id').eq('request_id', testRequestId);
  if (!events || events.length === 0) throw new Error('Platform event not logged');
  
  const { data: comms } = await supabase.from('outbound_messages').select('template_code').eq('request_id', testRequestId);
  const templates = comms?.map(c => c.template_code) || [];
  if (!templates.includes('payment_required')) throw new Error('payment_required draft missing');
  if (!templates.includes('payment_received')) throw new Error('payment_received draft missing');
  console.log('✅ Intelligence and Comms verified.');

  // 9. Cleanup
  console.log('[6] Cleaning up synthetic data...');
  await supabase.from('source_reveals').delete().eq('request_id', testRequestId);
  await supabase.from('payment_audit_events').delete().eq('request_id', testRequestId);
  await supabase.from('payment_intents').delete().eq('request_id', testRequestId);
  await supabase.from('payments').delete().eq('request_id', testRequestId);
  await supabase.from('outbound_messages').delete().eq('request_id', testRequestId);
  await supabase.from('platform_events').delete().eq('request_id', testRequestId);
  await supabase.from('customer_intelligence_events').delete().eq('customer_id', testCustomerId);
  await supabase.from('request_status_history').delete().eq('request_id', testRequestId);
  await supabase.from('request_preferences').delete().eq('request_id', testRequestId);
  await supabase.from('requests').delete().eq('id', testRequestId);
  await supabase.from('communication_preferences').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_score_snapshots').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_segments').delete().eq('customer_id', testCustomerId);
  await supabase.from('customers').delete().eq('id', testCustomerId);

  // Assertions
  const assertEmpty = async (table: string, col: string, val: string) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, val);
    if (count && count > 0) throw new Error(`Cleanup failed: ${count} rows remain in ${table} for ${col}=${val}`);
  };

  await assertEmpty('source_reveals', 'request_id', testRequestId);
  await assertEmpty('payment_audit_events', 'request_id', testRequestId);
  await assertEmpty('payment_intents', 'request_id', testRequestId);
  await assertEmpty('payments', 'request_id', testRequestId);
  await assertEmpty('outbound_messages', 'request_id', testRequestId);
  await assertEmpty('platform_events', 'request_id', testRequestId);
  await assertEmpty('requests', 'id', testRequestId);
  await assertEmpty('customers', 'id', testCustomerId);
  
  console.log('\n[VERDICT] SUCCESS: Batch 5B Payments & Pricing Integration verified.');
}

verify().catch(err => {
  console.error('\n[VERDICT] FAILED:', err.message);
  process.exitCode = 1;
});
