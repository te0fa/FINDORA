// scratch/test-pg.js
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const password = process.env.SUPABASE_SECRET_KEY;
  const connectionString = `postgresql://postgres.knsjvttjkbdztxmtjxpz:${encodeURIComponent(password)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully using service key as password!");
    await client.end();
  } catch (err) {
    console.error("Failed to connect using service key:", err.message);
  }
}

run();
