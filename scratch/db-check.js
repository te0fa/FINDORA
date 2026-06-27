const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  console.log('Connecting to:', url);
  const supabase = createClient(url, key);

  // 1. Get row count
  const { count, error: countError } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error fetching count:', countError);
    return;
  }
  console.log('Total rows in financial_transactions:', count);

  // 2. Fetch all transactions to see types, amount values
  const { data: txs, error: txsError } = await supabase
    .from('financial_transactions')
    .select('type, amount');

  if (txsError) {
    console.error('Error fetching transactions:', txsError);
    return;
  }

  const types = new Set();
  let negativeCount = 0;
  let minAmount = Infinity;
  let maxAmount = -Infinity;

  for (const tx of txs) {
    types.add(tx.type);
    const amt = Number(tx.amount);
    if (amt < 0) {
      negativeCount++;
    }
    if (amt < minAmount) minAmount = amt;
    if (amt > maxAmount) maxAmount = amt;
  }

  console.log('Unique types:', Array.from(types));
  console.log('Negative amount count:', negativeCount);
  console.log('Min amount:', minAmount);
  console.log('Max amount:', maxAmount);

  // Print first 5 transactions
  console.log('First 5 transactions sample:', txs.slice(0, 5));
}

run().catch(console.error);
