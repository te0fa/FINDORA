const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260625145000_unified_pricing_architecture.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to local tradeora database...');
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/tradeora'
  });

  try {
    await client.connect();
    console.log('Connected. Running migration SQL...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration executed successfully on local tradeora DB!');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration execution failed:', err);
  } finally {
    await client.end();
  }
}

main();
