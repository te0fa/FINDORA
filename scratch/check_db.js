const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('requests')
    .select('id, current_status, reviewer_decision, is_archived');
  
  if (error) {
    console.error(error);
    return;
  }

  console.log('Total Requests:', data.length);
  console.log('Sample Data:', JSON.stringify(data.slice(0, 5), null, 2));
  
  const ready = data.filter(r => r.current_status === 'client_ready' && !r.is_archived);
  console.log('Ready (not archived):', ready.length);
  
  const processed = data.filter(r => (r.reviewer_decision === 'reject' || r.reviewer_decision === 'needs_clarification' || r.current_status === 'closed') && !r.is_archived);
  console.log('Processed (not archived):', processed.length);

  const archived = data.filter(r => r.is_archived);
  console.log('Archived:', archived.length);
}

check();
