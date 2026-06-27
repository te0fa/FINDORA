const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function main() {
  console.log("Inspecting DB schemas...");
  try {
    const { data: firstReq, error: err2 } = await supabase.from('requests').select('*').limit(1);
    console.log("Request columns:", firstReq && firstReq.length > 0 ? Object.keys(firstReq[0]) : "No rows found in requests");
    if (!firstReq || firstReq.length === 0) {
      // Let's query information_schema if we can, or just inspect another table
      console.log("No request rows, let's inspect the customers columns");
      const { data: custs } = await supabase.from('customers').select('*').limit(1);
      console.log("Customer columns:", custs && custs.length > 0 ? Object.keys(custs[0]) : "No customer rows");
    }
  } catch (err) {
    console.error("Error inspecting:", err);
  }
}

main().catch(console.error);
