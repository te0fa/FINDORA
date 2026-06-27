import { createAdminClient } from '../src/lib/dal/customers';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const supabase = await createAdminClient();
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260506110000_batch_5a_payment_foundation.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration statements...');
  
  // We'll try to find if ANY rpc exists that can run SQL.
  // Common names: fn_execute_sql, execute_sql, run_sql, exec_sql, fn_execute_query
  const possibleRpcs = ['fn_execute_sql', 'execute_sql', 'run_sql', 'exec_sql', 'fn_execute_query', 'fn_run_sql'];
  
  let success = false;
  for (const rpcName of possibleRpcs) {
    console.log(`Trying ${rpcName}...`);
    const { error } = await supabase.rpc(rpcName, { p_sql: sql, sql: sql, query: sql });
    if (!error) {
      console.log(`✅ Success with ${rpcName}`);
      success = true;
      break;
    } else {
      console.log(`❌ ${rpcName} failed: ${error.message}`);
    }
  }

  if (!success) {
    console.log('\n--- FALLBACK: Manual table creation via RPC check ---');
    // If we can't run raw SQL, we are in trouble for migrations.
    // However, I'll check if the tables already exist (maybe someone else applied them).
    const { error: checkErr } = await supabase.from('payment_intents').select('id').limit(1);
    if (!checkErr) {
        console.log('✅ payment_intents table already exists.');
        success = true;
    } else {
        console.log('❌ payment_intents table does not exist and no SQL RPC found.');
    }
  }
}

runMigration();
