import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createAdminClient } from '../src/lib/dal/customers';
import { createSourcingRequest } from '../src/lib/dal/requests';
import { updateRequestPricing } from '../src/lib/dal/staff';
import { maskSourceDetails } from '../src/lib/dal/reports';
import { confirmPaymentIntentAdmin, unlockReportAfterPaymentAdmin } from '../src/lib/dal/payments';
import { getTrustFunnelMetricsAdmin } from '../src/lib/dal/intelligence-dashboard';
import crypto from 'node:crypto';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`❌ ASSERTION FAILED: ${message}`);
}

async function verifyLaunchReadiness() {
  const adminClient = await createAdminClient();

  console.log('--- BATCH 6A LAUNCH READINESS VERIFICATION START ---');

  const testId = crypto.randomUUID().slice(0, 8);
  const phone = `+2010${Math.floor(10000000 + Math.random() * 90000000)}`;
  const customerEmail = `audit_6a_${testId}_${Date.now()}@example.com`;
  const customerCode = `C-6A-${testId.toUpperCase()}`;
  
  let customerId: string | null = null;
  let requestId: string | null = null;
  let paymentIntentId: string | null = null;
  let snapshotId: string | null = null;

  try {
    console.log('Step 1: Synthetic Customer Creation');
    const { data: customer, error: custErr } = await adminClient.from('customers').insert({
      full_name: `Audit 6A ${testId}`,
      customer_code: customerCode,
      phone_number_normalized: phone,
      phone_number_raw: phone,
      email: customerEmail,
      preferred_language: 'ar'
    }).select().single();
    if (custErr) throw custErr;
    customerId = customer.id;
    assert(customerId, 'Customer ID generated');

    console.log('Step 2: Request Creation');
    const request = await createSourcingRequest({
      customerId: customerId!,
      title: `Audit 6A Request ${testId}`,
      rawDescription: 'Audit test for launch readiness.',
      status: 'open',
      channel: 'verifier',
      requestKind: 'everyday_purchase', // Allowed enum
      intakeMode: 'quick',
      preferences: { urgency_level: 'normal' }
    });
    requestId = (request as any).id;
    assert(requestId, 'Request ID generated');

    const { data: dbReq } = await adminClient.from('requests').select('*').eq('id', requestId!).single();
    assert(dbReq.request_kind === 'everyday_purchase', 'request_kind is saved correctly');

    console.log('Step 3: Staff Pricing Update');
    const { data: staff } = await adminClient.from('staff_members').select('id').eq('is_active', true).limit(1).maybeSingle();
    if (!staff?.id) {
        throw new Error('BLOCKED: No active staff member found.');
    }

    await updateRequestPricing({
      requestId: requestId!,
      requestKind: 'everyday_purchase',
      pricingModel: 'percentage_fee', // Allowed enum
      paymentPolicy: 'pay_after_preview', // Allowed enum
      serviceFeeAmount: 500,
      pricingNotes: `Audit 6A Fee ${testId}`,
      staffId: staff.id
    });

    const { data: pricedReq } = await adminClient.from('requests').select('*').eq('id', requestId!).single();
    assert(pricedReq.pricing_model === 'percentage_fee', 'pricing_model updated');
    assert(pricedReq.payment_policy === 'pay_after_preview', 'payment_policy updated');

    console.log('Step 4: Report Source Masking');
    await adminClient.from('requests').update({ current_status: 'reporting' }).eq('id', requestId!);

    const { data: report } = await adminClient.from('reports').insert({
      request_id: requestId!,
      report_status: 'published'
    }).select().single();

    const { data: snapshot } = await adminClient.from('report_option_snapshots').insert({
      report_id: report.id,
      request_id: requestId!,
      display_title: `Secret Brand TV ${testId}`,
      display_rank: 1,
      candidate_channel: 'offline',
      hidden_merchant_name: 'LG Official Store',
      hidden_contact_notes: '01011122233',
      reveal_locked: true
    }).select().single();
    snapshotId = snapshot.id;

    const masked = maskSourceDetails(snapshot);
    assert(masked.reveal_locked === true, 'Snapshot is locked');
    assert(masked.revealedSourceText === '*** Locked ***', 'Merchant masked');

    console.log('Step 5: Payment Intent & Confirmation');
    const { data: intent } = await adminClient.from('payment_intents').insert({
      request_id: requestId!,
      customer_id: customerId!,
      intent_type: 'report_unlock',
      amount: 500,
      status: 'pending_customer'
    }).select().single();
    paymentIntentId = intent.id;

    await confirmPaymentIntentAdmin({
      id: paymentIntentId!,
      actorStaffId: staff.id,
      notes: `Audit 6A Paid ${testId}`,
      externalReference: `REF-6A-${testId.toUpperCase()}`
    });

    const { data: confirmedIntent } = await adminClient
      .from('payment_intents')
      .select('status')
      .eq('id', paymentIntentId!)
      .single();
    assert(confirmedIntent.status === 'confirmed', 'payment intent confirmed');

    console.log('Step 6: Source Reveal Unlock');
    await unlockReportAfterPaymentAdmin({
      requestId: requestId!,
      customerId: customerId!,
      paymentIntentId: paymentIntentId!,
      unlockType: 'report_full',
      actorStaffId: staff.id,
      revealText: 'LG Official Store - 01011122233'
    });

    await adminClient.from('report_option_snapshots').update({ reveal_locked: false }).eq('id', snapshotId!);

    const { data: snapsAfter } = await adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId!);
    const revealed = maskSourceDetails(snapsAfter![0]);
    assert(revealed.reveal_locked === false, 'Snapshot is unlocked');

    console.log('Step 7: Communications Flow');
    const { data: comms } = await adminClient.from('outbound_messages').select('*').eq('request_id', requestId!);
    assert(comms && comms.length > 0, 'Communications generated');
    assert(comms.some((c: any) => c.template_code === 'request_received'), 'request_received queued');

    console.log('Step 8: Trust Funnel Metrics API Check');
    const metrics = await getTrustFunnelMetricsAdmin();
    assert(typeof metrics.counts.submitted_requests === 'number', 'Metrics returns numbers');
    assert(!isNaN(metrics.conversion_rates.submitted_to_priced_rate), 'No NaN rates');

    console.log('✅ ALL LAUNCH READINESS AUDIT STEPS PASSED');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('❌ VERIFICATION FAILED: ' + message);
    process.exit(1);
  } finally {
    console.log('Step 9: Safe FK Cleanup');
    if (requestId) {
      await adminClient.from('source_reveals').delete().eq('request_id', requestId);
      await adminClient.from('payment_audit_events').delete().eq('request_id', requestId);
      await adminClient.from('payments').delete().eq('request_id', requestId);
      await adminClient.from('payment_intents').delete().eq('request_id', requestId);
      await adminClient.from('report_option_snapshots').delete().eq('request_id', requestId);
      await adminClient.from('reports').delete().eq('request_id', requestId);
      await adminClient.from('merchant_performance_events').delete().eq('request_id', requestId);
      await adminClient.from('merchant_quotes').delete().eq('request_id', requestId);
      await adminClient.from('outbound_messages').delete().eq('request_id', requestId);
      await adminClient.from('platform_events').delete().eq('request_id', requestId);
      await adminClient.from('request_status_history').delete().eq('request_id', requestId);
      await adminClient.from('request_preferences').delete().eq('request_id', requestId);
      await adminClient.from('requests').delete().eq('id', requestId);
    }
    if (customerId) {
      await adminClient.from('customer_intelligence_events').delete().eq('customer_id', customerId);
      await adminClient.from('communication_preferences').delete().eq('customer_id', customerId);
      await adminClient.from('customer_score_snapshots').delete().eq('customer_id', customerId);
      await adminClient.from('customer_segments').delete().eq('customer_id', customerId);
      await adminClient.from('customers').delete().eq('id', customerId);
    }
    console.log('Cleanup execution finished.');

    console.log('Step 10: Final Cleanup Assertions');
    const assertEmpty = async (table: string, col: string, val: string) => {
        const { data } = await adminClient.from(table).select('id').eq(col, val);
        assert(data && data.length === 0, `Table ${table} is not clean for ${col}=${val}`);
    };

    if (requestId) {
      await assertEmpty('source_reveals', 'request_id', requestId);
      await assertEmpty('payment_audit_events', 'request_id', requestId);
      await assertEmpty('payment_intents', 'request_id', requestId);
      await assertEmpty('payments', 'request_id', requestId);
      await assertEmpty('report_option_snapshots', 'request_id', requestId);
      await assertEmpty('reports', 'request_id', requestId);
      await assertEmpty('merchant_performance_events', 'request_id', requestId);
      await assertEmpty('merchant_quotes', 'request_id', requestId);
      await assertEmpty('outbound_messages', 'request_id', requestId);
      await assertEmpty('platform_events', 'request_id', requestId);
      await assertEmpty('request_status_history', 'request_id', requestId);
      await assertEmpty('request_preferences', 'request_id', requestId);
      await assertEmpty('requests', 'id', requestId);
    }
    if (customerId) {
      await assertEmpty('customer_intelligence_events', 'customer_id', customerId);
      await assertEmpty('communication_preferences', 'customer_id', customerId);
      await assertEmpty('customer_score_snapshots', 'customer_id', customerId);
      await assertEmpty('customer_segments', 'customer_id', customerId);
      await assertEmpty('customers', 'id', customerId);
    }
    console.log('✅ Final cleanup assertions passed.');
  }
}

verifyLaunchReadiness().catch((err) => {
  console.error(err);
  process.exit(1);
});
