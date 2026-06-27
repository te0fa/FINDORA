import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ SUPABASE_SECRET_KEY is missing in .env.local');
    process.exit(1);
  }

  console.log('Connecting to remote Supabase database pooler on port 6543 with cli_login_postgres...');
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'cli_login_postgres.knsjvttjkbdztxmtjxpz',
    password: secretKey,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260626030000_unify_sourcing_demand_flow.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.connect();
    console.log(`Connected. Applying migration SQL...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Migration successfully applied via PostgreSQL connection!`);
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
