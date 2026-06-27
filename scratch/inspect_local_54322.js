const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres' });
  try {
    await client.connect();
    console.log('✅ Connected to localhost:54322!');
    const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    // Inspect columns of payments
    const payCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payments' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('--- Columns for payments ---');
    console.log(payCols.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main().catch(console.error);
