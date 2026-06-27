import { createAdminClient } from '../src/lib/dal/customers';

async function auditDB() {
  const adminClient = await createAdminClient();

  const tables = ['reports', 'report_option_snapshots'];
  for (const table of tables) {
    const { data, error } = await adminClient
      .rpc('get_table_columns_metadata', { p_table_name: table })
      .select('*');
      
    console.log(`\n--- TABLE: ${table} ---`);
    if (error) {
      // fallback to information_schema
      const { data: cols } = await adminClient
        .from('information_schema.columns' as any)
        .select('column_name, data_type')
        .eq('table_name', table)
        .eq('table_schema', 'public');
      console.log(cols);
    } else {
      console.log(data);
    }
  }

  const { data: views } = await adminClient
    .from('information_schema.views' as any)
    .select('view_definition')
    .eq('table_name', 'v_request_ui_status')
    .eq('table_schema', 'public');
  console.log(`\n--- VIEW: v_request_ui_status ---`);
  console.log(views?.[0]?.view_definition);

  const { data: funcs } = await adminClient
    .from('information_schema.routines' as any)
    .select('routine_definition')
    .in('routine_name', ['fn_prepare_request_client_bundle', 'fn_release_request_to_customer', 'fn_unlock_report_option'])
    .eq('specific_schema', 'public');
  
  console.log(`\n--- FUNCTIONS ---`);
  funcs?.forEach(f => console.log(f.routine_definition));
}

auditDB().catch(console.error);
