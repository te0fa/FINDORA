const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Import adjustWalletBalance or write its logic
async function testAdjust() {
  const WALLET_ID = '316218ea-a326-4f08-9e65-9cd09ec0a565';
  
  // 1. Get current balance
  const { data: walletBefore } = await supabase
    .from('contributor_wallets')
    .select('balance_egp')
    .eq('id', WALLET_ID)
    .single();
    
  console.log('Balance before:', walletBefore.balance_egp);
  
  // 2. Perform adjustment using direct supabase client (simulating the staff/finance.ts code)
  const amountEgp = 10;
  const newBalanceEgp = Number(walletBefore.balance_egp) + amountEgp;
  
  console.log('Updating wallet to:', newBalanceEgp);
  await supabase
    .from('contributor_wallets')
    .update({ balance_egp: newBalanceEgp })
    .eq('id', WALLET_ID);
    
  console.log('Inserting wallet transaction...');
  await supabase
    .from('wallet_transactions')
    .insert({
      contributor_id: '790bf460-5b55-4af7-ac02-aae6e029359f',
      wallet_id: WALLET_ID,
      tx_type: 'manual_adjustment',
      amount_egp: amountEgp,
      reference_type: 'admin_adjustment',
      description_en: 'Testing double update'
    });
    
  // 3. Get balance after
  const { data: walletAfter } = await supabase
    .from('contributor_wallets')
    .select('balance_egp')
    .eq('id', WALLET_ID)
    .single();
    
  console.log('Balance after:', walletAfter.balance_egp);
}

testAdjust().catch(console.error);
