import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';
import fs from 'fs';
import path from 'path';

async function run() {
  const db = await createAdminClient();

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

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260626030000_unify_sourcing_demand_flow.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Trying to apply migration via Supabase RPCs...`);

  let applied = false;
  for (const rpcName of possibleRpcs) {
    for (const argName of argNames) {
      try {
        const { data, error } = await db.rpc(rpcName, { [argName]: sql });
        if (!error) {
          console.log(`✅ SUCCESS: Applied migration via RPC ${rpcName} (${argName})!`);
          applied = true;
          break;
        } else {
          console.log(`❌ RPC ${rpcName} (${argName}) error: ${error.message}`);
        }
      } catch (err: any) {
        console.log(`❌ RPC ${rpcName} (${argName}) exception: ${err.message}`);
      }
    }
    if (applied) break;
  }

  if (!applied) {
    console.error('Failed to apply migration via any RPC function.');
    process.exit(1);
  }
}

run();
