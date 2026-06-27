import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is missing in loaded env config');
    process.exit(1);
  }

  // Mask password for safety
  const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`Using DATABASE_URL: ${masked}`);

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined
  });

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260626030000_unify_sourcing_demand_flow.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.connect();
    console.log(`Connected. Applying migration SQL...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Migration successfully applied via Next.js Env DATABASE_URL!`);
  } catch (err: any) {
    console.error(`❌ Migration failed:`, err.message);
    try {
      await client.query('ROLLBACK');
    } catch {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
