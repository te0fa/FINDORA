import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkRequestsConstraints() {
  const { data, error } = await adminDb.rpc('fn_exec_sql', { 
    p_sql: "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.requests'::regclass" 
  });
  
  if (error) {
    console.error('Error fetching constraints:', error.message);
  } else {
    console.log('Requests Constraints:');
    console.table(data);
  }
}

checkRequestsConstraints();
