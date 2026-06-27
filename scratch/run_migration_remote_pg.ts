import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: process.env.SUPABASE_SECRET_KEY,
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connecting to remote database via pg on port 5432...");
  await client.connect();
  console.log("Connected successfully!");

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260626030000_unify_sourcing_demand_flow.sql');
  const migrationSql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log("Executing migration SQL...");
  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log("Migration executed successfully!");
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error("Migration script failed:", e);
  process.exit(1);
});
