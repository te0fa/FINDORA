import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';
import * as DAL from '../src/lib/dal/payments';
import crypto from 'node:crypto';

async function runTests() {
  console.log('=== PAYMENT UNIFICATION E2E TESTS ===');
  const supabase = await createAdminClient();

  const testId = crypto.randomUUID().slice(0, 8);
  const testCustomerId = crypto.randomUUID();
  const testRequestId = crypto.randomUUID();
  const testRequestCode = `REQ-UNI-${testId.toUpperCase()}`;
  const testCustomerCode = `C-UNI-${testId.toUpperCase()}`;
  const testEmail = `verify_uni_${testId}_${Date.now()}@example.com`;

  // Get active staff
  const { data: staffMember, error: staffErr } = await supabase
    .from('staff_members')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (staffErr || !staffMember) {
    throw new Error('BLOCKED: No active staff member found.');
  }
  const testStaffId = staffMember.id;

  // Track initial legacy archive row count
  const { count: initialLegacyCount } = await supabase
    .from('payments_legacy_archive')
    .select('id', { count: 'exact', head: true });

  console.log(`Initial rows in payments_legacy_archive: ${initialLegacyCount || 0}`);

  try {
    // Setup synthetic data
    console.log('[Setup] Creating test customer...');
    await supabase.from('customers').insert({
      id: testCustomerId,
      full_name: `Unification Test Customer ${testId}`,
      email: testEmail,
      customer_code: testCustomerCode
    });

    console.log('[Setup] Creating test request...');
    await supabase.from('requests').insert({
      id: testRequestId,
      customer_id: testCustomerId,
      request_code: testRequestCode,
      title: `Verify Unification Request ${testId}`,
      request_kind: 'everyday_purchase',
      current_status: 'open',
      raw_description: 'Payment Unification Test Request'
    });

    console.log('[Setup] Creating test report...');
    const { data: report } = await supabase.from('reports').insert({
      request_id: testRequestId,
      report_version: 1,
      report_status: 'ready'
    }).select('id').single();

    // ----------------------------------------------------
    // TEST 1 & 2: Full payment flow & zero double-write
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Full Payment Flow ---');
    const intent = await DAL.createPaymentIntentAdmin({
      requestId: testRequestId,
      customerId: testCustomerId,
      intentType: 'report_unlock',
      amount: 250,
      currencyCode: 'EGP',
      actorStaffId: testStaffId,
      metadata: { testId }
    });
    console.log('✅ Created intent:', intent.id);

    console.log('Confirming payment intent...');
    await DAL.confirmPaymentIntentAdmin({
      id: intent.id,
      actorStaffId: testStaffId,
      notes: `Confirming payment for test ${testId}`,
      externalReference: `EXT-UNI-${testId.toUpperCase()}`
    });
    console.log('✅ Intent status updated to confirmed.');

    console.log('Unlocking report snapshot...');
    const reveal = await DAL.unlockReportAfterPaymentAdmin({
      requestId: testRequestId,
      customerId: testCustomerId,
      paymentIntentId: intent.id,
      unlockType: 'report_full',
      actorStaffId: testStaffId,
      revealText: `Unlocked by E2E test ${testId}`
    });
    console.log('✅ source_reveals row created successfully!');
    console.log('Reveal row data:', {
      id: reveal.id,
      payment_id: reveal.payment_id,
      payment_intent_id: reveal.payment_intent_id,
      reveal_type: reveal.reveal_type
    });

    // Check that source_reveals has payment_intent_id populated and payment_id is null
    if (reveal.payment_intent_id === intent.id && (reveal.payment_id === null || reveal.payment_id === undefined)) {
      console.log('PASS: TEST 1 - Report unlocked successfully without legacy payment_id dependency.');
    } else {
      console.log('FAIL: TEST 1 - source_reveals has incorrect payment links.', reveal);
    }

    console.log('\n--- TEST 2: Zero Legacy Double-Write ---');
    const { count: finalLegacyCount } = await supabase
      .from('payments_legacy_archive')
      .select('id', { count: 'exact', head: true });
    
    if ((finalLegacyCount || 0) === (initialLegacyCount || 0)) {
      console.log('PASS: TEST 2 - Zero insertions occurred in legacy payments table.');
    } else {
      console.log(`FAIL: TEST 2 - Row count in payments_legacy_archive increased from ${initialLegacyCount} to ${finalLegacyCount}.`);
    }

    // ----------------------------------------------------
    // TEST 3: VIEW backward compatibility
    // ----------------------------------------------------
    console.log('\n--- TEST 3: VIEW Backward Compatibility ---');
    const { data: viewRows, error: viewErr } = await supabase
      .from('payments')
      .select('id, amount_egp, payment_status, status, created_at')
      .eq('request_id', testRequestId);
    
    if (viewErr) {
      console.log('FAIL: TEST 3 - Querying VIEW failed with error:', viewErr.message);
    } else if (viewRows && viewRows.length === 1) {
      const row = viewRows[0];
      console.log('VIEW Row mapped values:', row);
      if (row.amount_egp === 250 && row.payment_status === 'confirmed' && row.status === 'completed') {
        console.log('PASS: TEST 3 - Mapped VIEW values are fully compatible.');
      } else {
        console.log('FAIL: TEST 3 - VIEW mapped values mismatch.');
      }
    } else {
      console.log('FAIL: TEST 3 - VIEW returned no matching row.');
    }

    // ----------------------------------------------------
    // TEST 4: Explicit failure on confirmation
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Explicit Failure Handling ---');
    try {
      await DAL.confirmPaymentIntentAdmin({
        id: crypto.randomUUID(), // invalid ID
        actorStaffId: testStaffId
      });
      console.log('FAIL: TEST 4 - Confirmation did not fail for invalid ID.');
    } catch (err: any) {
      console.log('PASS: TEST 4 - Errored explicitly with message:', err.message);
    }

  } catch (err: any) {
    console.error('❌ E2E Tests Failed with exception:', err.message);
  } finally {
    // Cleanup synthetic test records
    console.log('\n[Cleanup] Cleaning up test records...');
    await supabase.from('source_reveals').delete().eq('request_id', testRequestId);
    await supabase.from('payment_audit_events').delete().eq('request_id', testRequestId);
    await supabase.from('payment_intents').delete().eq('request_id', testRequestId);
    await supabase.from('reports').delete().eq('request_id', testRequestId);
    await supabase.from('requests').delete().eq('id', testRequestId);
    await supabase.from('customers').delete().eq('id', testCustomerId);
    console.log('✅ Cleanup completed.');
  }
}

runTests().catch(console.error);
