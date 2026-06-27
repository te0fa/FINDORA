const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function run() {
  const { data, error, count } = await supabase
    .from('contributors')
    .select('id, referral_code, status', { count: 'exact' });

  if (error) {
    console.error('Error fetching contributors:', error);
  } else {
    console.log('Total contributors:', count);
    console.log('Contributors:', data);
  }
}

run();
