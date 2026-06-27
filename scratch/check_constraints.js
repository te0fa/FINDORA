const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.wallet_transactions'::regclass;
  ` });
  
  if (error) {
    // If exec_sql doesn't exist, we can query it another way, or just list the columns
    console.error('RPC Error:', error);
  } else {
    console.log('Constraints:', data);
  }
}

main().catch(console.error);
