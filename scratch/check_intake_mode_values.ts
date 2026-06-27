import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkRequestsData() {
  const { data, error } = await adminDb.from('requests').select('intake_mode').limit(10);
  
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Current intake_mode values:', [...new Set((data || []).map(r => r.intake_mode))]);
  }
}

checkRequestsData();
