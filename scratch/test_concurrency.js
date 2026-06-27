const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Use the existing wallet we found
const WALLET_ID = '316218ea-a326-4f08-9e65-9cd09ec0a565';
const CONTRIBUTOR_ID = '790bf460-5b55-4af7-ac02-aae6e029359f';

async function testConcurrency() {
  console.log('--- STARTING WALLET CONCURRENCY VERIFICATION TEST ---');
  
  // 1. Get initial balance
  const { data: initialWallet, error: initErr } = await supabase
    .from('contributor_wallets')
    .select('balance_egp')
    .eq('id', WALLET_ID)
    .single();
    
  if (initErr) {
    console.error('Error fetching initial wallet:', initErr);
    return;
  }
  
  const initialBalance = Number(initialWallet.balance_egp);
  console.log(`[Initial State] Wallet ID: ${WALLET_ID}`);
  console.log(`[Initial State] Current Balance: ${initialBalance} EGP`);
  
  // We will fire 10 concurrent inserts to wallet_transactions
  const amounts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const expectedTotalIncrease = amounts.reduce((a, b) => a + b, 0);
  
  console.log(`[Test Action] Launching 10 concurrent insertions in parallel...`);
  console.log(`[Test Action] Total expected increase: ${expectedTotalIncrease} EGP`);
  
  const startTime = Date.now();
  
  // Map each amount to an insert promise
  const promises = amounts.map((amount, index) => {
    return supabase
      .from('wallet_transactions')
      .insert({
        contributor_id: CONTRIBUTOR_ID,
        wallet_id: WALLET_ID,
        tx_type: 'task_reward',
        amount_egp: amount,
        reference_type: 'task',
        description_en: `Concurrency Test Transaction #${index + 1}`
      })
      .then(res => {
        if (res.error) {
          console.error(`[TX #${index + 1}] Failed with amount ${amount}:`, res.error.message);
          return { success: false, amount, error: res.error.message };
        }
        console.log(`[TX #${index + 1}] Successfully inserted amount: ${amount}`);
        return { success: true, amount };
      });
  });
  
  // Run all in parallel
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  console.log(`[Test Action] All parallel requests finished in ${duration}ms.`);
  
  // Calculate actually succeeded additions
  let actualAdded = 0;
  results.forEach(r => {
    if (r.success) {
      actualAdded += r.amount;
    }
  });
  
  // 3. Get final balance
  const { data: finalWallet, error: finalErr } = await supabase
    .from('contributor_wallets')
    .select('balance_egp')
    .eq('id', WALLET_ID)
    .single();
    
  if (finalErr) {
    console.error('Error fetching final wallet:', finalErr);
    return;
  }
  
  const finalBalance = Number(finalWallet.balance_egp);
  console.log('\n--- RESULTS SUMMARY ---');
  console.log(`Initial Balance: ${initialBalance} EGP`);
  console.log(`Total Succeeded Inserts: ${actualAdded} EGP`);
  console.log(`Expected Final Balance: ${initialBalance + actualAdded} EGP`);
  console.log(`Actual Final Balance: ${finalBalance} EGP`);
  
  const difference = finalBalance - (initialBalance + actualAdded);
  console.log(`Difference (Error/Lost Updates): ${difference} EGP`);
  
  if (difference === 0) {
    console.log('\n✅ VERDICT: SAFE. No lost updates or race conditions occurred.');
  } else {
    console.error('\n❌ VERDICT: UNSAFE. Lost updates or race conditions detected!');
  }
}

testConcurrency().catch(console.error);
