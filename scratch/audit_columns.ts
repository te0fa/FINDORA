import { createAdminClient } from '../src/lib/dal/customers';

async function audit() {
  const supabase = await createAdminClient();
  
  const tables = ['payments', 'requests', 'reports', 'source_reveals'];
  
  for (const table of tables) {
    console.log(`\n--- COLUMNS FOR ${table} ---`);
    const { data, error } = await supabase.rpc('fn_probe_columns', { p_table_name: table });
    if (error) {
        // Try direct query if rpc doesn't exist
        const { data: cols, error: err2 } = await supabase.from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', table)
            .eq('table_schema', 'public');
        
        if (err2) {
            console.log(`Error: ${err2.message}`);
        } else {
            console.log(cols.map((c: any) => `${c.column_name} (${c.data_type})`).join(', '));
        }
    } else {
        console.log(data);
    }
  }
}

audit();
