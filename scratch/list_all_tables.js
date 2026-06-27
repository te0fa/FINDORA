const { Client } = require('pg');

async function listAllTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `);
  console.log('Tables across all schemas:', res.rows);
  await client.end();
}
listAllTables().catch(console.error);
