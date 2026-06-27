const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Failed:", error.message);
  } else if (data && data.length > 0) {
    console.log("Keys of payment_intents row:", Object.keys(data[0]));
  } else {
    console.log("payment_intents table is empty, trying to fetch columns via RPC or catalog query...");
    // Let's run a select query against information_schema via RPC if possible, or just print that it's empty.
    // Wait, let's insert a dummy row in a transaction and roll back, or we can query information_schema if we have a custom RPC.
    // If not, we can just query a non-existent column to see the error message (which will list the columns sometimes), 
    // or just run a select of a specific column.
    console.log("Table is empty.");
  }
}

main();
