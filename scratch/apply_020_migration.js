// Clear PG environment variables at the very beginning of execution
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGHOST;
delete process.env.PGPORT;
delete process.env.PGDATABASE;

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  console.log('Connecting to remote Supabase pooler...');
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  console.log('✅ Connected successfully!');

  try {
    console.log('Applying 20260624000000_020_unify_payment_system.sql...');
    const sqlPath = path.join(__dirname, '../supabase/migrations/20260624000000_020_unify_payment_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Database operations failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
