import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkMerchantsSchema() {
  const { data, error } = await adminDb.rpc('fn_exec_sql', { 
    p_sql: "SELECT column_name, is_nullable, column_default, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'merchants'" 
  });
  
  if (error) {
    console.error('Error fetching schema:', error.message);
  } else {
    console.log('Merchants Schema:');
    console.table(data);
  }
}

checkMerchantsSchema();
