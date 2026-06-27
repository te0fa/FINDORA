const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260625145000_unified_pricing_architecture.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to local database on port 54322...');
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
  });

  try {
    await client.connect();
    console.log('Connected. Running migration SQL...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration executed successfully on port 54322!');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration execution failed:', err);
  } finally {
    await client.end();
  }
}

main();
