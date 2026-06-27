
import { createClient } from '@supabase/supabase-js';

async function debugResearch() {
  const adminClient = createClient(
    'https://knsjvttjkbdztxmtjxpz.supabase.co',
    'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
  );

  const { data: requests } = await adminClient
    .from('requests')
    .select('id, current_status, reviewer_decision')
    .ilike('title', '%E2E_TEST_STAFF_MUTATION%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!requests || requests.length === 0) {
    console.log('No E2E test request found');
    return;
  }

  const requestId = requests[0].id;
  console.log('Checking Request:', requestId, 'Status:', requests[0].current_status);

  const { data: runs } = await adminClient
    .from('research_runs')
    .select('*, research_items(*)')
    .eq('request_id', requestId);

  console.log('Research Runs Count:', runs?.length);
  runs?.forEach(run => {
    console.log(`Run ID: ${run.id}, Kind: ${run.run_kind}, Items: ${run.research_items?.length}`);
  });

  const { data: quotes } = await adminClient
    .from('merchant_quotes')
    .select('*')
    .eq('request_id', requestId);
  
  console.log('Merchant Quotes Count:', quotes?.length);
}

debugResearch();
