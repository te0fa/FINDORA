import { recalculateAllMerchantScores } from '../src/lib/dal/scoring/merchant-scoring';
import { recalculateAllCustomerScores } from '../src/lib/dal/scoring/customer-scoring';

async function main() {
  console.log('--- RECALCULATING INTELLIGENCE SCORES ---');
  
  console.log('[1] Recalculating Merchant Scores...');
  const mResult = await recalculateAllMerchantScores();
  console.log(`✅ Processed ${mResult.count} merchants.`);

  console.log('[2] Recalculating Customer Scores...');
  const cResult = await recalculateAllCustomerScores();
  console.log(`✅ Processed ${cResult.count} customers.`);

  console.log('\n--- SUMMARY ---');
  console.log(`Merchant Snapshots Created: ${mResult.count}`);
  console.log(`Customer Snapshots Created: ${cResult.count}`);
  console.log('[FINISH] Scores up to date.');
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
