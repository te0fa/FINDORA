import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);

async function checkShortlistChannels() {
  const { data, error } = await adminDb.from('request_candidate_shortlists').select('candidate_channel').limit(10);
  
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Current candidate_channel values:', [...new Set((data || []).map(r => r.candidate_channel))]);
  }
}

checkShortlistChannels();
