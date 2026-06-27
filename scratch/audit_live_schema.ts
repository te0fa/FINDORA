import { createAdminClient } from '../src/lib/dal/customers';

async function auditSchema() {
  const adminClient = await createAdminClient();
  
  console.log('--- DB SCHEMA AUDIT for Request-Related Tables ---');

  // 1. Audit public.requests
  const { data: requestsCols } = await adminClient.from('information_schema.columns' as any).select('column_name').eq('table_schema', 'public').eq('table_name', 'requests');
  console.log('1. public.requests columns:', requestsCols?.map(c => c.column_name).join(', ') || 'NOT FOUND');

  // 2. Audit public.v_request_ui_status
  const { data: viewCols } = await adminClient.from('information_schema.columns' as any).select('column_name').eq('table_schema', 'public').eq('table_name', 'v_request_ui_status');
  console.log('2. public.v_request_ui_status columns:', viewCols?.map(c => c.column_name).join(', ') || 'NOT FOUND');

  // 3. Audit public.request_delete_backups
  const { data: backupCols } = await adminClient.from('information_schema.columns' as any).select('column_name').eq('table_schema', 'public').eq('table_name', 'request_delete_backups');
  console.log('3. public.request_delete_backups columns:', backupCols?.map(c => c.column_name).join(', ') || 'NOT FOUND');

  // 4. Audit public.request_deletion_audit
  const { data: auditCols } = await adminClient.from('information_schema.columns' as any).select('column_name').eq('table_schema', 'public').eq('table_name', 'request_deletion_audit');
  console.log('4. public.request_deletion_audit columns:', auditCols?.map(c => c.column_name).join(', ') || 'NOT FOUND');

  // 5. List all tables with request_id
  const { data: childTables } = await adminClient.from('information_schema.columns' as any).select('table_name').eq('table_schema', 'public').eq('column_name', 'request_id');
  console.log('5. Tables with request_id:', Array.from(new Set(childTables?.map(t => t.table_name))).join(', ') || 'NONE');

  // 6. Inspect research_items specifically
  const { data: itemCols } = await adminClient.from('information_schema.columns' as any).select('column_name').eq('table_schema', 'public').eq('table_name', 'research_items');
  console.log('6. public.research_items columns:', itemCols?.map(c => c.column_name).join(', ') || 'NOT FOUND');
  
  // 7. Check for potential tables mentioned by user
  const otherTables = ['source_reveals', 'approvals', 'offers', 'payments'];
  for (const table of otherTables) {
    const { data: exists } = await adminClient.from('information_schema.tables' as any).select('table_name').eq('table_schema', 'public').eq('table_name', table);
    console.log(`7. Table ${table} exists:`, exists && exists.length > 0 ? 'YES' : 'NO');
  }
}

auditSchema().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
