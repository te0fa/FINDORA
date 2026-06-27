import { createAdminClient } from '../src/lib/dal/customers';

async function auditHistory() {
  const adminClient = await createAdminClient();
  const tables = ['request_status_history'];
  for (const table of tables) {
    const { data } = await adminClient.from(table).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(`${table} columns:`, Object.keys(data[0]).join(', '));
    } else {
      const { data: cols } = await adminClient.from(table).select('*').limit(0);
      console.log(`${table}: EMPTY`);
    }
  }
}

auditHistory().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
