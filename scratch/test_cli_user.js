const { Client } = require('pg');

async function main() {
  console.log('Connecting to remote Supabase pooler using cli_login_postgres...');
  const client = new Client({
    user: 'cli_login_postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT 1;');
    console.log('Result:', res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch(console.error);
