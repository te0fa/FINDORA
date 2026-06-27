const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(url, key);

  console.log('Cleaning up performance test rows...');
  const { data, error } = await supabase
    .from('financial_transactions')
    .delete()
    .like('description', 'TEMP_PERF_TEST_%')
    .select();

  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log(`Deleted ${data ? data.length : 0} rows.`);
  }

  const { count } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true });
  console.log('Current count after cleanup:', count);
}

run().catch(console.error);
