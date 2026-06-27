
import { createClient } from '@supabase/supabase-js';

async function checkRequestFields() {
  const adminClient = createClient(
    'https://knsjvttjkbdztxmtjxpz.supabase.co',
    'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
  );

  const { data: requests } = await adminClient
    .from('requests')
    .select('id, current_status, reviewer_decision, pricing_decision')
    .ilike('title', '%E2E_TEST_STAFF_MUTATION%')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('FIELDS:', JSON.stringify(requests[0], null, 2));
}

checkRequestFields();
