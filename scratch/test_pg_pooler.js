const { Client } = require('pg');

async function test(port) {
  console.log(`Testing port ${port}...`);
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: port,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`Success on port ${port}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed on port ${port}: ${err.message}`);
    try { await client.end(); } catch(e) {}
    return false;
  }
}

async function main() {
  await test(5432);
  await test(6543);
}

main();
