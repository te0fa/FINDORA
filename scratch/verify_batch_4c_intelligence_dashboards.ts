import { 
  getPlatformIntelligenceOverview, 
  getMerchantIntelligenceList, 
  getCustomerIntelligenceList, 
  getOutboundMessagesList 
} from '../src/lib/dal/intelligence-dashboard';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`❌ ASSERTION FAILED: ${message}`);
}

async function verifyBatch4C() {
  console.log('--- BATCH 4C INTELLIGENCE DASHBOARDS VERIFICATION ---');

  try {
    // 1. Verify Platform Overview
    console.log('[1] Verifying Platform Overview...');
    const overview = await getPlatformIntelligenceOverview();
    assert(typeof overview.totalCustomers === 'number', 'totalCustomers should be a number');
    assert(typeof overview.totalRequests === 'number', 'totalRequests should be a number');
    assert(typeof overview.funnel.submitted === 'number', 'funnel.submitted should be a number');
    console.log('✅ Platform overview returned real metrics.');

    // 2. Verify Merchant List
    console.log('[2] Verifying Merchant List...');
    const merchants = await getMerchantIntelligenceList();
    const uniqueMerchantIds = new Set(merchants.map((m: any) => m.id));
    assert(uniqueMerchantIds.size === merchants.length, 'Merchant list contains duplicate IDs');
    console.log(`✅ Merchant list returned ${merchants.length} unique merchants.`);

    // 3. Verify Customer List
    console.log('[3] Verifying Customer List...');
    const customers = await getCustomerIntelligenceList();
    const uniqueCustomerIds = new Set(customers.map((c: any) => c.id));
    assert(uniqueCustomerIds.size === customers.length, 'Customer list contains duplicate IDs');
    console.log(`✅ Customer list returned ${customers.length} unique customers.`);

    // 4. Verify Communications List
    console.log('[4] Verifying Communications List...');
    const messages = await getOutboundMessagesList();
    if (messages.length > 0) {
      assert(!!messages[0].status, 'Messages should have a status');
      const allowedStatuses = ['draft', 'queued', 'sent', 'failed', 'skipped'];
      assert(allowedStatuses.includes(messages[0].status), 'Invalid message status found');
    }
    console.log(`✅ Communications list returned ${messages.length} messages.`);

    console.log('\n[VERDICT] SUCCESS: Batch 4C Intelligence Dashboards verified.');

  } catch (err: any) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}`);
    process.exit(1);
  }
}

verifyBatch4C();
