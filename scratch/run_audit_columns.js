const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tables = ['payments', 'payment_intents', 'source_reveals'];
  for (const table of tables) {
    console.log(`\n--- COLUMNS FOR ${table} ---`);
    const { data, error } = await supabase.rpc('fn_probe_columns', { p_table_name: table });
    if (error) {
      console.log(`RPC Error for ${table}:`, error.message);
      // Try direct query
      const { data: cols, error: err2 } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', table)
        .eq('table_schema', 'public');
      
      if (err2) {
        console.log(`Direct query Error for ${table}:`, err2.message);
      } else {
        console.log(`Direct query success:`, cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      }
    } else {
      console.log(`RPC success:`, data);
    }
  }
}

main().catch(console.error);
