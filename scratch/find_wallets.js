const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('Querying wallets and contributors...');
  const { data: wallets, error: wErr } = await supabase
    .from('contributor_wallets')
    .select('id, contributor_id, balance_egp')
    .limit(5);

  if (wErr) {
    console.error('Error fetching wallets:', wErr);
    return;
  }

  console.log('Wallets:', wallets);
}

main().catch(console.error);
