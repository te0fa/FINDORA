const { Client } = require('pg');

async function main() {
  // Clear any PG env vars to prevent pg from using them
  delete process.env.PGUSER;
  delete process.env.PGPASSWORD;
  delete process.env.PGHOST;
  delete process.env.PGPORT;
  delete process.env.PGDATABASE;

  const password = '123456';
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: password,
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    // 1. Check constraints on source_reveals
    const constQuery = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'source_reveals'::regclass;
    `);
    console.log('--- Constraints on source_reveals ---');
    console.log(JSON.stringify(constQuery.rows, null, 2));

    // 2. Column definitions for payments
    const payCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payments' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('--- Columns for payments ---');
    console.log(payCols.rows);

    // 3. Column definitions for payment_intents
    const piCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payment_intents' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('--- Columns for payment_intents ---');
    console.log(piCols.rows);

  } catch (err) {
    console.error('❌ Query failed:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
