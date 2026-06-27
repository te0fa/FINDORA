const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  const db = createClient(url, key);

  console.log('Testing general select from tables...');
  const { data: customers, error: cErr } = await db.from('customers').select('count');
  if (cErr) {
    console.error('Customers check failed:', cErr);
  } else {
    console.log('Customers count query succeeded!');
  }

  // Let's test a simple SQL execution RPC if we can query pg_proc
  console.log('Fetching functions from database via RPC if possible, or via select...');
  const { data: funcs, error: fErr } = await db.rpc('execute_sql_query', { 
    sql: "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;"
  });

  if (fErr) {
    console.log('execute_sql_query RPC failed:', fErr.message);
  } else {
    console.log('Functions list:', funcs);
  }

  // Let's try to query pg_proc using postgrest directly if possible (unlikely unless view/table exists)
}

run();
