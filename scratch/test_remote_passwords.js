const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const passwords = [
  '123456',
  'Password123',
  'postgres123',
  'mostafa',
  'nada',
  'findora',
  'foundora',
  'tradeora',
  'admin123',
  'root123',
  'postgres',
  'Password123!',
  'mostafa123',
  'nada123'
];

async function tryConnect(password) {
  const client = new Client({
    connectionString: `postgresql://postgres.knsjvttjkbdztxmtjxpz:${encodeURIComponent(password)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`✅ SUCCESS: password=${password}`);
    await client.end();
    return true;
  } catch (err) {
    // console.log(`Failed: password=${password} - Error: ${err.message}`);
    await client.end().catch(() => {});
    return false;
  }
}

async function run() {
  console.log("Brute-forcing remote Supabase DB password...");
  for (const pwd of passwords) {
    const success = await tryConnect(pwd);
    if (success) {
      console.log(`Found password: ${pwd}`);
      break;
    }
  }
  console.log("Brute force finished.");
}

run();
