const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const db = createClient(url, key);

  const possibleRpcs = [
    'execute_sql_query', 
    'fn_exec_sql', 
    'fn_execute_sql', 
    'execute_sql', 
    'run_sql', 
    'exec_sql', 
    'fn_execute_query', 
    'fn_run_sql'
  ];
  const argNames = ['sql', 'p_sql', 'query'];

  const filePath = path.join(__dirname, '../supabase/migrations/20260624000000_020_unify_payment_system.sql');
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Applying 020_unify_payment_system.sql via RPCs...`);

  let success = false;
  for (const rpcName of possibleRpcs) {
    for (const argName of argNames) {
      console.log(`Trying RPC: ${rpcName} with arg: ${argName}...`);
      try {
        const { data, error } = await db.rpc(rpcName, { [argName]: sql });
        if (!error) {
          console.log(`✅ SUCCESS: Applied migration via RPC ${rpcName} (${argName})!`);
          success = true;
          break;
        } else {
          console.log(`❌ RPC ${rpcName} (${argName}) error: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ RPC ${rpcName} (${argName}) exception: ${err.message}`);
      }
    }
    if (success) break;
  }

  if (!success) {
    console.error('Failed to apply migration via any RPC function.');
    process.exit(1);
  }
}

run().catch(console.error);
