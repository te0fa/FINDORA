const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'e:\\FINDORA\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars!");
  console.log("Url:", supabaseUrl);
  console.log("Key:", supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('economy_config').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
run();
