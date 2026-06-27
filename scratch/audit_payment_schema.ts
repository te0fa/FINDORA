import { createAdminClient } from '../src/lib/dal/customers';

type ColumnRow = {
  column_name: string;
};

async function safeInspectColumns(supabase: any, tableName: string) {
  try {
    const { data, error } = await supabase.rpc('inspect_table_columns', {
      table_name: tableName,
    });

    if (error) {
      console.log(`[${tableName}] Column inspect skipped: ${error.message}`);
      return null;
    }

    return data as ColumnRow[];
  } catch (err: any) {
    console.log(`[${tableName}] Column inspect failed: ${err.message}`);
    return null;
  }
}

async function audit() {
  const supabase = await createAdminClient();

  console.log('--- SCHEMA AUDIT ---');

  const tables = [
    'payments',
    'payment_intents',
    'payment_audit_events',
    'requests',
    'reports',
    'report_option_snapshots',
    'source_reveals',
    'outbound_messages',
    'platform_events',
    'customer_intelligence_events',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        console.log(`[${table}] Error: ${error.message}`);
        continue;
      }

      console.log(`[${table}] EXISTS. Rows: ${data?.length ?? 0}`);

      if (table === 'requests' || table === 'reports' || table === 'source_reveals' || table === 'payments') {
        const cols = await safeInspectColumns(supabase, table);

        if (cols) {
          console.log(
            `Columns for ${table}:`,
            cols.map((c) => c.column_name).join(', ')
          );
        }
      }
    } catch (err: any) {
      console.log(`[${table}] FAILED: ${err.message}`);
    }
  }
}

audit().catch((err) => {
  console.error('Audit failed:', err);
  process.exitCode = 1;
});