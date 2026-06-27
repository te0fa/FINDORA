const { Client } = require('pg');

const regions = [
  'eu-west-1',      // Ireland
  'eu-central-1',   // Frankfurt
  'eu-west-2',      // London
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'sa-east-1'       // Sao Paulo
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
