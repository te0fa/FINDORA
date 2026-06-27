import { createAdminClient } from '../src/lib/dal/customers';

async function auditChildren() {
  const adminClient = await createAdminClient();
  
  console.log('--- CHILD TABLES AUDIT ---');

  const tables = ['request_preferences', 'research_runs', 'research_items', 'reports', 'report_option_snapshots', 'request_candidate_shortlists', 'merchant_quotes'];
  for (const table of tables) {
    const { data } = await adminClient.from(table).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(`${table} columns:`, Object.keys(data[0]).join(', '));
    } else {
      // If empty, try to get column names via empty select
      const { data: cols } = await adminClient.from(table).select('*').limit(0);
      // Postgrest doesn't return column names on empty list usually.
      console.log(`${table}: EMPTY`);
    }
  }
}

auditChildren().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
