const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  console.log("Cleaning up all TEST-PERF-LIFECYCLE mock data in chunks with loop...");

  while (true) {
    const { data: testReqs, error: fetchErr } = await supabase
      .from('requests')
      .select('id')
      .like('title', 'TEST-PERF-LIFECYCLE%')
      .limit(100);

    if (fetchErr) {
      console.error("Error fetching test records:", fetchErr);
      break;
    }

    if (!testReqs || testReqs.length === 0) {
      console.log("No more test records found.");
      break;
    }

    const ids = testReqs.map(r => r.id);
    console.log(`Deleting next chunk of ${ids.length} records...`);

    // Delete operational states first due to foreign keys
    const { error: delOpErr } = await supabase
      .from('request_operational_states')
      .delete()
      .in('request_id', ids);

    if (delOpErr) {
      console.error("Error deleting operational states:", delOpErr);
    }

    // Delete requests
    const { error: delReqErr } = await supabase
      .from('requests')
      .delete()
      .in('id', ids);

    if (delReqErr) {
      console.error("Error deleting requests:", delReqErr);
    }
  }

  console.log("Cleanup loop finished.");

  // Print final count
  const { data: finalReqs } = await supabase.from('requests').select('id');
  console.log(`Final requests count in database: ${finalReqs.length}`);
}
run();
