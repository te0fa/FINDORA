const { Client } = require('pg');

const regions = [
  'eu-north-1',      // Stockholm
  'ap-northeast-3'   // Osaka
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Testing region: ${region} (${host})...`);
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: host,
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`>>> SUCCESS: Found region: ${region}!`);
    await client.query("SELECT 1;");
    await client.end();
    return true;
  } catch (err) {
    console.log(`Region ${region} failed: ${err.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`Database is in ${region}`);
      break;
    }
  }
}

main();
