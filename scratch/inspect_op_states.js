const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("Checking if request_operational_states has duplicate request_id rows...");
  
  // We check if any request_id has count > 1
  const { data: countCheck, error: countCheckErr } = await supabase
    .from('request_operational_states')
    .select('request_id');

  if (countCheckErr) {
    console.error("Error fetching data:", countCheckErr);
    return;
  }

  const counts = {};
  let duplicatesFound = false;
  for (const row of countCheck) {
    counts[row.request_id] = (counts[row.request_id] || 0) + 1;
    if (counts[row.request_id] > 1) {
      duplicatesFound = true;
    }
  }

  console.log("Total rows in request_operational_states:", countCheck.length);
  console.log("Duplicates found?", duplicatesFound);
  if (duplicatesFound) {
    console.log("Duplicates list:", Object.entries(counts).filter(([id, cnt]) => cnt > 1));
  }
}
run();
