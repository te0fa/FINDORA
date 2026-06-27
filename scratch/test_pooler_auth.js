const { Client } = require('pg');

const host = 'aws-0-eu-central-1.pooler.supabase.com';

const combos = [
  { user: 'postgres', db: 'postgres' },
  { user: 'postgres', db: 'knsjvttjkbdztxmtjxpz' },
  { user: 'postgres.knsjvttjkbdztxmtjxpz', db: 'postgres' },
  { user: 'postgres.knsjvttjkbdztxmtjxpz', db: 'knsjvttjkbdztxmtjxpz' },
  { user: 'knsjvttjkbdztxmtjxpz', db: 'postgres' },
  { user: 'knsjvttjkbdztxmtjxpz', db: 'knsjvttjkbdztxmtjxpz' },
];

async function main() {
  for (const combo of combos) {
    console.log(`Testing user=${combo.user} db=${combo.db}...`);
    const client = new Client({
      user: combo.user,
      password: '123456',
      host: host,
      port: 6543,
      database: combo.db,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`>>> SUCCESS with user=${combo.user} db=${combo.db}!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

main();
