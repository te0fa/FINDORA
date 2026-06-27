const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const password = process.env.SUPABASE_SECRET_KEY;
  const connectionString = `postgresql://postgres.knsjvttjkbdztxmtjxpz:${encodeURIComponent(password)}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to port 6543 using service key!");
    await client.end();
  } catch (err) {
    console.error("Failed to connect to port 6543:", err.message);
  }
}

run();
