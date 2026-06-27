const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- VALIDATING LEGACY QUERIES ON payments VIEW ---');

  // Query 1: Actions, Growth, North-Star, Roadmap, Moat-Tracker count
  console.log('Querying: payments count (confirmed)');
  const q1 = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed');
  if (q1.error) console.log('❌ Q1 Error:', q1.error.message);
  else console.log('✅ Q1 Success. Count:', q1.count);

  // Query 2: CRM page
  console.log('Querying: payments details for CRM');
  const q2 = await supabase.from('payments').select('id, amount_egp, payment_status, created_at').eq('payment_status', 'confirmed');
  if (q2.error) console.log('❌ Q2 Error:', q2.error.message);
  else console.log('✅ Q2 Success. Rows returned:', q2.data.length);

  // Query 3: Network page
  console.log('Querying: payments details for Network');
  const q3 = await supabase.from('payments').select('id, request_id, amount, payment_status, created_at');
  if (q3.error) console.log('❌ Q3 Error:', q3.error.message);
  else console.log('✅ Q3 Success. Rows returned:', q3.data.length);

  // Query 4: Archive DAL
  console.log('Querying: payments by request_id');
  const q4 = await supabase.from('payments').select('*').eq('request_id', '00000000-0000-0000-0000-000000000000');
  if (q4.error) console.log('❌ Q4 Error:', q4.error.message);
  else console.log('✅ Q4 Success. Rows returned:', q4.data.length);

  // Query 5: Intelligence Dashboard
  console.log('Querying: payments for dashboard');
  const q5 = await supabase.from('payments').select('id, request_id, payment_status, amount, currency_code');
  if (q5.error) console.log('❌ Q5 Error:', q5.error.message);
  else console.log('✅ Q5 Success. Rows returned:', q5.data.length);

  // Query 6: Marketing DAL
  console.log('Querying: payments for marketing');
  const q6 = await supabase.from('payments').select('request_id, amount').eq('payment_status', 'confirmed');
  if (q6.error) console.log('❌ Q6 Error:', q6.error.message);
  else console.log('✅ Q6 Success. Rows returned:', q6.data.length);

  // Query 7: Scoring DAL
  console.log('Querying: payments for scoring');
  const q7 = await supabase.from('payments').select('amount, status').eq('customer_id', '00000000-0000-0000-0000-000000000000');
  if (q7.error) console.log('❌ Q7 Error:', q7.error.message);
  else console.log('✅ Q7 Success. Rows returned:', q7.data.length);
}

main().catch(console.error);
