import { createAdminClient } from '../src/lib/dal/customers';
import { calculateMerchantScore, createMerchantScoreSnapshot } from '../src/lib/dal/scoring/merchant-scoring';
import { calculateCustomerScore, createCustomerScoreSnapshot } from '../src/lib/dal/scoring/customer-scoring';
import { getPlatformKpiSnapshot } from '../src/lib/dal/scoring/platform-scoring';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('--- BATCH 4D SCORING ENGINES VERIFICATION ---');
  const supabase = await createAdminClient();

  // 1. Merchant Scoring
  console.log('[1] Testing Merchant Scoring...');
  const { data: testMerchant } = await supabase.from('merchants').select('id').limit(1).maybeSingle();
  if (testMerchant) {
    const scores = await calculateMerchantScore(testMerchant.id);
    assert(typeof scores.overall_score === 'number', 'Merchant overall score should be a number');
    assert(scores.confidence_score >= 0 && scores.confidence_score <= 1, 'Invalid confidence score');
    
    const snap = await createMerchantScoreSnapshot(testMerchant.id);
    assert(!!snap.id, 'Snapshot ID should be returned');
    console.log(`✅ Merchant scoring and snapshot verified for ${testMerchant.id}.`);
  } else {
    console.log('⚠️ No merchants found, skipping direct merchant test.');
  }

  // 2. Customer Scoring
  console.log('[2] Testing Customer Scoring...');
  const { data: testCustomer } = await supabase.from('customers').select('id').limit(1).maybeSingle();
  if (testCustomer) {
    const scores = await calculateCustomerScore(testCustomer.id);
    assert(typeof scores.seriousness_score === 'number', 'Customer seriousness score should be a number');
    
    const snap = await createCustomerScoreSnapshot(testCustomer.id);
    assert(!!snap.id, 'Snapshot ID should be returned');
    console.log(`✅ Customer scoring and snapshot verified for ${testCustomer.id}.`);
  } else {
    console.log('⚠️ No customers found, skipping direct customer test.');
  }

  // 3. Platform KPI Snapshot
  console.log('[3] Testing Platform KPI Snapshot...');
  const kpi = await getPlatformKpiSnapshot();
  assert(typeof kpi.total_customers === 'number', 'KPI total_customers should be a number');
  assert(kpi.total_requests >= 0, 'KPI total_requests should be non-negative');
  assert(kpi.conversion_rates !== undefined, 'KPI should contain conversion rates');
  console.log('✅ Platform KPI snapshot returned valid metrics.');

  // 4. Persistence Check
  console.log('[4] Verifying Historical Persistence...');
  if (testMerchant) {
    const { count } = await supabase
      .from('merchant_score_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', testMerchant.id);
    assert((count || 0) > 0, 'Snapshots should be persisted');
    console.log(`✅ Persistence verified: ${count} snapshots found for merchant.`);
  }

  console.log('\n[VERDICT] SUCCESS: Batch 4D Scoring Engines verified.');
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
