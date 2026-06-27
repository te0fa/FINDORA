const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://knsjvttjkbdztxmtjxpz.supabase.co',
  'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
);

async function main() {
  // Query a row from customers or get table details
  const { data: customerRow, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .limit(1);

  if (cErr) {
    console.error('Error fetching customer:', cErr);
  } else {
    console.log('Customer row keys:', customerRow ? Object.keys(customerRow[0] || {}) : 'No rows');
  }

  const { data: requestRow, error: rErr } = await supabase
    .from('requests')
    .select('*')
    .limit(1);

  if (rErr) {
    console.error('Error fetching request:', rErr);
  } else {
    console.log('Request row keys:', requestRow ? Object.keys(requestRow[0] || {}) : 'No rows');
  }
}

main();
