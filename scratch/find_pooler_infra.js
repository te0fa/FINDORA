const { Client } = require('pg');

const infras = ['aws-0', 'aws-1', 'aws-2', 'aws-3'];
const regions = ['eu-central-1', 'eu-west-1', 'us-east-1'];

async function testHost(infra, region) {
  const host = `${infra}-${region}.pooler.supabase.com`;
  
  // First do a quick DNS check using standard ping/connect to avoid pg hanging if getaddrinfo fails
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
    console.log(`>>> SUCCESS: Found pooler at ${host}!`);
    await client.query("SELECT 1;");
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('tenant/user') && err.message.includes('not found')) {
      console.log(`${host} exists, but tenant not found.`);
    } else {
      console.log(`${host} error: ${err.message}`);
    }
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  for (const infra of infras) {
    for (const region of regions) {
      const success = await testHost(infra, region);
      if (success) {
        console.log(`MATCH FOUND: ${infra}-${region}`);
        return;
      }
    }
  }
}

main();
