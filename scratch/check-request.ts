
import { createClient } from '@supabase/supabase-js';

async function checkRequest() {
  const adminClient = createClient(
    'https://knsjvttjkbdztxmtjxpz.supabase.co',
    'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
  );

  const { data: requests, error } = await adminClient
    .from('requests')
    .select('*')
    .ilike('title', '%E2E_TEST_STAFF_MUTATION%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching request:', error.message);
    return;
  }

  if (!requests || requests.length === 0) {
    console.log('No E2E test request found');
    return;
  }

  console.log('Last E2E Request:', JSON.stringify(requests[0], null, 2));
}

checkRequest();
