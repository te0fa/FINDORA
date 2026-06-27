import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  await client.connect();

  console.log('Clearing public schema locally...');
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  console.log('Running database_setup_complete.sql locally...');
  const setupSql = fs.readFileSync(path.join(process.cwd(), 'legacy_sql_archive/database_setup_complete.sql'), 'utf8');
  await client.query(setupSql);

  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files to apply.`);

  for (const file of files) {
    console.log(`Applying migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`✅ Applied ${file}`);
    } catch (err: any) {
      console.error(`❌ Failed to apply ${file}:`, err.message);
    }
  }

  await client.end();
  console.log('Local database setup complete.');
}

run().catch(console.error);
