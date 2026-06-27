const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  try {
    await client.connect();
    console.log("Connected to postgres on localhost:5432");
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log("Databases:", res.rows.map(r => r.datname));
    await client.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
