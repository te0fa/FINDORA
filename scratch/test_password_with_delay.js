const { Client } = require('pg');

const host = 'aws-1-eu-west-1.pooler.supabase.com';
const passwords = [
  'Password123',
  'findora',
  'mostafa',
  'nada',
  '123456',
  'postgres'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPassword(password) {
  console.log(`Testing password: ${password}...`);
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: password,
    host: host,
    port: 5432,
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
    if (success) {
      console.log('Match found! Exiting.');
      return;
    }
    console.log('Waiting 5 seconds before next attempt...');
    await sleep(5000);
  }
  console.log('No passwords matched.');
}

main().catch(console.error);
