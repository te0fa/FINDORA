import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  const supabase = await createAdminClient();
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260626030000_unify_sourcing_demand_flow.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying unify_sourcing_demand_flow migration...');
  const { error } = await supabase.rpc('fn_execute_sql', { p_sql: sql });

  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('Migration successfully applied.');
  }
}

applyMigration();
