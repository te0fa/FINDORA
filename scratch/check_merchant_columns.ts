import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkMerchantsColumns() {
  const { data, error } = await adminDb.from('merchants').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Merchant columns:', Object.keys(data?.[0] || {}));
  }
}

checkMerchantsColumns();
