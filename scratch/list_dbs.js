const { Client } = require('pg');

async function listDbs() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  await client.connect();
  const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
  console.log('Databases:', res.rows.map(r => r.datname));
  await client.end();
}
listDbs().catch(console.error);
