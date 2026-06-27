import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkShortlistColumns() {
  const { data, error } = await adminDb.from('request_candidate_shortlists').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Shortlist columns:', Object.keys(data?.[0] || {}));
  }
}

checkShortlistColumns();
