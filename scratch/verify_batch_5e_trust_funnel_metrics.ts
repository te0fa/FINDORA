import { getTrustFunnelMetricsAdmin } from '../src/lib/dal/intelligence-dashboard';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

function assertNumber(value: unknown, path: string) {
  assert(typeof value === 'number', `${path} must be a number`);
  assert(!isNaN(value as number), `${path} must not be NaN`);
  assert(isFinite(value as number), `${path} must not be Infinity`);
}

function assertRate(value: unknown, path: string) {
  assertNumber(value, path);
  const num = value as number;
  assert(num >= 0 && num <= 100, `${path} must be between 0 and 100, got ${num}`);
}

async function run() {
  console.log('--- STARTING BATCH 5E VERIFICATION ---');

  console.log('Fetching Trust Funnel Metrics...');
  const metrics = await getTrustFunnelMetricsAdmin();
  assert(metrics, 'Metrics should not be null');

  console.log('Verifying Counts...');
  const counts = metrics.counts;
  assertNumber(counts.submitted_requests, 'counts.submitted_requests');
  assertNumber(counts.priced_requests, 'counts.priced_requests');
  assertNumber(counts.reports_prepared, 'counts.reports_prepared');
  assertNumber(counts.report_option_previews_created, 'counts.report_option_previews_created');
  assertNumber(counts.payment_intents_created, 'counts.payment_intents_created');
  assertNumber(counts.confirmed_payments, 'counts.confirmed_payments');
  assertNumber(counts.source_reveals_unlocked, 'counts.source_reveals_unlocked');
  assertNumber(counts.completed_requests, 'counts.completed_requests');

  console.log('Verifying Conversion Rates...');
  const rates = metrics.conversion_rates;
  assertRate(rates.submitted_to_priced_rate, 'rates.submitted_to_priced_rate');
  assertRate(rates.priced_to_report_rate, 'rates.priced_to_report_rate');
  assertRate(rates.report_to_payment_intent_rate, 'rates.report_to_payment_intent_rate');
  assertRate(rates.payment_intent_to_confirmed_payment_rate, 'rates.payment_intent_to_confirmed_payment_rate');
  assertRate(rates.preview_to_unlock_rate, 'rates.preview_to_unlock_rate');
  assertRate(rates.submitted_to_paid_rate, 'rates.submitted_to_paid_rate');

  console.log('Verifying Revenue Metrics...');
  const revenue = metrics.revenue;
  assertNumber(revenue.confirmed_revenue_total, 'revenue.confirmed_revenue_total');
  assertNumber(revenue.pending_payment_amount, 'revenue.pending_payment_amount');
  assertNumber(revenue.average_confirmed_payment_amount, 'revenue.average_confirmed_payment_amount');
  
  // Check record types
  assert(typeof revenue.confirmed_revenue_by_request_kind === 'object', 'revenue.confirmed_revenue_by_request_kind');
  assert(typeof revenue.confirmed_revenue_by_pricing_model === 'object', 'revenue.confirmed_revenue_by_pricing_model');
  assert(typeof revenue.confirmed_revenue_by_payment_policy === 'object', 'revenue.confirmed_revenue_by_payment_policy');

  console.log('Verifying Breakdowns...');
  const kindBreakdown = metrics.breakdown_by_request_kind;
  assert(Array.isArray(kindBreakdown), 'breakdown_by_request_kind must be an array');
  assert(kindBreakdown.length === 3, 'breakdown_by_request_kind must have 3 items');
  
  kindBreakdown.forEach(b => {
    assert(b.request_kind, 'breakdown item missing request_kind');
    assertNumber(b.submitted, `breakdown.${b.request_kind}.submitted`);
    assertNumber(b.priced, `breakdown.${b.request_kind}.priced`);
    assertNumber(b.reports, `breakdown.${b.request_kind}.reports`);
    assertNumber(b.previews, `breakdown.${b.request_kind}.previews`);
    assertNumber(b.payment_intents, `breakdown.${b.request_kind}.payment_intents`);
    assertNumber(b.confirmed_payments, `breakdown.${b.request_kind}.confirmed_payments`);
    assertNumber(b.source_unlocks, `breakdown.${b.request_kind}.source_unlocks`);
    assertNumber(b.revenue, `breakdown.${b.request_kind}.revenue`);
    assertRate(b.conversion_rate, `breakdown.${b.request_kind}.conversion_rate`);
  });

  const policyBreakdown = metrics.breakdown_by_payment_policy;
  assert(Array.isArray(policyBreakdown), 'breakdown_by_payment_policy must be an array');
  assert(policyBreakdown.length === 5, 'breakdown_by_payment_policy must have 5 items');
  
  policyBreakdown.forEach(b => {
    assert(b.payment_policy, 'breakdown item missing payment_policy');
    assertNumber(b.requests, `breakdown.${b.payment_policy}.requests`);
    assertNumber(b.payment_intents, `breakdown.${b.payment_policy}.payment_intents`);
    assertNumber(b.confirmed_payments, `breakdown.${b.payment_policy}.confirmed_payments`);
    assertNumber(b.revenue, `breakdown.${b.payment_policy}.revenue`);
    assertRate(b.conversion_rate, `breakdown.${b.payment_policy}.conversion_rate`);
  });

  console.log('Verifying Source Reveal Metrics...');
  const reveals = metrics.source_reveals;
  assertNumber(reveals.total_unlocks, 'reveals.total_unlocks');
  assert(typeof reveals.unlocks_by_reveal_type === 'object', 'reveals.unlocks_by_reveal_type must be object');
  assert(Array.isArray(reveals.latest_unlocks_list), 'reveals.latest_unlocks_list must be an array');

  console.log('✅ ALL METRICS VERIFIED SUCCESSFULLY');
  console.log('Sample Data:');
  console.log(JSON.stringify(metrics.counts, null, 2));
  console.log(JSON.stringify(metrics.conversion_rates, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
