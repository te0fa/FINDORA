import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createAdminClient } from '../src/lib/dal/customers';
import { createPaymentIntentAdmin } from '../src/lib/dal/payments';
import { getTrustFunnelMetricsAdmin } from '../src/lib/dal/intelligence-dashboard';
import crypto from 'node:crypto';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`❌ ASSERTION FAILED: ${message}`);
}

async function verifyRegressionLock() {
  const adminClient = await createAdminClient();
  console.log('--- BATCH 6D REGRESSION LOCK VERIFICATION START ---');

  const testId = crypto.randomUUID().slice(0, 8);
  const testCustomerId = crypto.randomUUID();
  const testRequestId = crypto.randomUUID();
  
  try {
    // 1. Enum Validation (Static check via type system if possible, but here we check DB constraints via probe)
    console.log('Step 1: Validating Allowed Enums...');
    // We'll try to insert invalid values and expect failure, but since we can't change schema, 
    // we just verify that we can insert the ALLOWED ones.
    const allowedRequestKinds = ['everyday_purchase', 'high_value_deals', 'projects_supplies'];
    const allowedPricingModels = ['fixed_fee', 'percentage_fee', 'fixed_plus_percentage', 'custom_quote', 'retainer'];
    const allowedPaymentPolicies = ['pay_after_preview', 'upfront_deposit', 'milestone_plan', 'custom_agreement', 'retainer'];

    console.log(' - Checking Request Kinds...');
    for (const kind of allowedRequestKinds) {
        const { error } = await adminClient.from('requests').insert({
            id: crypto.randomUUID(),
            customer_id: '00000000-0000-0000-0000-000000000000', // Mock UUID
            request_code: `ENUM-TEST-${crypto.randomUUID().slice(0,8)}`,
            request_kind: kind
        }).select('id');
        // We expect failure because of customer_id FK, but we check if it's a TYPE error or FK error
        if (error && error.message.includes('invalid input value for enum')) {
            throw new Error(`Enum value ${kind} rejected by database but should be allowed.`);
        }
    }
    console.log(' ✅ Allowed enums accepted by type system logic.');

    // 2. Static Leftover Check
    console.log('Step 2: Checking for static synthetic leftovers...');
    const staticIds = [
        '3bee044d-c3a9-499f-803f-f5d323f1d873',
        'e59f6465-5afd-4008-a110-f3d455dd3870'
    ];
    for (const id of staticIds) {
        const { data: cust } = await adminClient.from('customers').select('id').eq('id', id).maybeSingle();
        assert(!cust, `Static leftover found: Customer ${id}. Cleanup required.`);
        const { data: req } = await adminClient.from('requests').select('id').eq('id', id).maybeSingle();
        assert(!req, `Static leftover found: Request ${id}. Cleanup required.`);
    }
    console.log(' ✅ No static leftovers found.');

    // 3. Communication Deduplication Check
    console.log('Step 3: Validating Communication Deduplication...');
    const { data: staff } = await adminClient.from('staff_members').select('id').eq('is_active', true).limit(1).maybeSingle();
    if (!staff) throw new Error('BLOCKED: No active staff member found.');

    // Create fresh synthetic request
    const { error: custErr } = await adminClient.from('customers').insert({
        id: testCustomerId,
        full_name: `Lock Test Customer ${testId}`,
        email: `lock_${testId}@example.com`,
        customer_code: `C-LOCK-${testId.toUpperCase()}`
    });
    if (custErr) throw new Error(`Customer setup failed: ${custErr.message}`);

    const { error: reqErr } = await adminClient.from('requests').insert({
        id: testRequestId,
        customer_id: testCustomerId,
        request_code: `REQ-LOCK-${testId.toUpperCase()}`,
        title: `Lock Test Request ${testId}`,
        request_kind: 'everyday_purchase',
        raw_description: 'Regression lock verification'
    });
    if (reqErr) throw new Error(`Request setup failed: ${reqErr.message}`);

    // First Intent -> First Draft
    console.log(' - Creating first intent...');
    await createPaymentIntentAdmin({
        requestId: testRequestId,
        customerId: testCustomerId,
        intentType: 'request_fee',
        amount: 100,
        actorStaffId: staff.id
    });

    const { data: comms1 } = await adminClient.from('outbound_messages').select('id').eq('request_id', testRequestId).eq('template_code', 'payment_required');
    assert(comms1 && comms1.length === 1, 'Exactly one payment_required draft should exist.');

    // Second Intent -> Should NOT create second draft
    console.log(' - Creating second intent (dedupe check)...');
    await createPaymentIntentAdmin({
        requestId: testRequestId,
        customerId: testCustomerId,
        intentType: 'request_fee',
        amount: 200,
        actorStaffId: staff.id
    });

    const { data: comms2 } = await adminClient.from('outbound_messages').select('id').eq('request_id', testRequestId).eq('template_code', 'payment_required');
    assert(comms2 && comms2.length === 1, 'Deduplication failed: Duplicate payment_required draft created.');
    console.log(' ✅ Communication deduplication verified.');

    // 4. Metrics Sanity Check
    console.log('Step 4: Validating Trust Funnel Metrics...');
    const metrics = await getTrustFunnelMetricsAdmin();
    const checkValue = (val: any, label: string) => {
        assert(typeof val === 'number' && !isNaN(val) && isFinite(val), `${label} is invalid: ${val}`);
    };

    checkValue(metrics.counts.submitted_requests, 'submitted_requests');
    checkValue(metrics.conversion_rates.submitted_to_priced_rate, 'submitted_to_priced_rate');
    checkValue(metrics.conversion_rates.submitted_to_paid_rate, 'submitted_to_paid_rate');
    console.log(' ✅ Trust funnel metrics are sane.');

    console.log(' ✅ BATCH 6D REGRESSION LOCK PASSED');
  } catch (err: any) {
    console.error(' ❌ REGRESSION LOCK FAILED: ' + err.message);
    process.exit(1);
  } finally {
    console.log('Step 5: Cleanup...');
    await adminClient.from('payment_intents').delete().eq('request_id', testRequestId);
    await adminClient.from('outbound_messages').delete().eq('request_id', testRequestId);
    await adminClient.from('platform_events').delete().eq('request_id', testRequestId);
    await adminClient.from('requests').delete().eq('id', testRequestId);
    await adminClient.from('customers').delete().eq('id', testCustomerId);
    console.log(' ✅ Cleanup complete.');
  }
}

verifyRegressionLock();
