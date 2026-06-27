import { createAdminClient } from '../src/lib/dal/customers';

async function audit() {
  const supabase = await createAdminClient();
  
  const tables = ['payments', 'requests', 'reports', 'source_reveals'];
  
  for (const table of tables) {
    console.log(`\n--- DATA FOR ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1).maybeSingle();
    if (error) {
        console.log(`Error: ${error.message}`);
    } else if (data) {
        console.log(Object.keys(data).join(', '));
    } else {
        console.log('No data found, cannot probe columns this way.');
    }
  }
}

audit();
