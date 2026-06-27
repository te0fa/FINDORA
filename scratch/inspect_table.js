const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("Querying request_operational_states columns...");
  // Querying with an invalid column to check error, or query select(*)
  const { data, error } = await supabase
    .from('request_operational_states')
    .select('request_id, client_released_at')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Columns exist. Row data:", data);
  }
}
run();
