import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkShortlistSourceRef() {
  const { data, error } = await adminDb.from('request_candidate_shortlists').select('source_ref').limit(10);
  
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Current source_ref values:', [...new Set((data || []).map(r => r.source_ref))]);
  }
}

checkShortlistSourceRef();
