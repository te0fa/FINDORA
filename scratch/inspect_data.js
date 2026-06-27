const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("Checking if client_released_at is a column in requests...");

  const { data, error } = await supabase
    .from('requests')
    .select('id, client_released_at')
    .limit(1);

  if (error) {
    console.error("Error fetching client_released_at from requests:", error);
  } else {
    console.log("Successfully fetched client_released_at from requests:", data);
  }
}
run();
