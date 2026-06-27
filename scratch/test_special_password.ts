import { Client } from 'pg';

async function test() {
  const password = '1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw';
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🎉 SUCCESS: password works!');
    await client.end();
  } catch (err: any) {
    console.log('❌ Failed:', err.message);
    await client.end().catch(() => {});
  }
}

test();
