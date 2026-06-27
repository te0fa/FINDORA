const { Client } = require('pg');

async function listTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('Tables:', res.rows.map(r => r.table_name));
  await client.end();
}
listTables().catch(console.error);
