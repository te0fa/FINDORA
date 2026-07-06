const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SUPABASE_SECRET_KEY') supabaseSecret = value;
    }
  });
}

if (!supabaseUrl || !supabaseSecret) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseSecret);

async function run() {
  console.log('Fetching test requests starting with "["...');
  const { data: testRequests, error: fetchErr } = await client
    .from('requests')
    .select('id, title')
    .like('title', '[%');

  if (fetchErr) {
    console.error('Error fetching:', fetchErr.message);
    return;
  }

  console.log(`Found ${testRequests.length} test requests to delete.`);

  if (testRequests.length === 0) {
    console.log('No test requests found.');
    return;
  }

  const ids = testRequests.map(r => r.id);

  console.log('Deleting associated report_option_snapshots...');
  const { error: snapErr } = await client
    .from('report_option_snapshots')
    .delete()
    .in('request_id', ids);

  if (snapErr) {
    console.error('Error deleting snapshots:', snapErr.message);
  }

  console.log('Deleting associated merchant_quotes...');
  const { error: quoteErr } = await client
    .from('merchant_quotes')
    .delete()
    .in('request_id', ids);

  if (quoteErr) {
    console.error('Error deleting merchant quotes:', quoteErr.message);
  }

  console.log('Deleting associated online_merchant_quotes...');
  const { error: onlineQuoteErr } = await client
    .from('online_merchant_quotes')
    .delete()
    .in('request_id', ids);

  if (onlineQuoteErr) {
    console.error('Error deleting online quotes:', onlineQuoteErr.message);
  }

  console.log('Deleting associated customer_requests...');
  const { error: custErr } = await client
    .from('customer_requests')
    .delete()
    .in('id', ids);

  if (custErr) {
    console.error('Error deleting customer requests:', custErr.message);
  }

  console.log('Deleting requests from requests table...');
  const { error: deleteErr } = await client
    .from('requests')
    .delete()
    .in('id', ids);

  if (deleteErr) {
    console.error('Error deleting requests:', deleteErr.message);
    return;
  }

  console.log('Successfully deleted all test requests and their children!');
}

run();
