const { Client } = require('pg');

const host = 'aws-1-eu-west-1.pooler.supabase.com';
const passwords = ['123456', 'Password123', 'postgres', 'admin', 'findora', 'findora123', 'findora_password'];

async function testPassword(password) {
  console.log(`Testing password: ${password}...`);
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: password,
    host: host,
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`>>> SUCCESS: Correct password is: ${password}!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  for (const pw of passwords) {
    const success = await testPassword(pw);
    if (success) return;
  }
}

main();
