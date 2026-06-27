delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGHOST;
delete process.env.PGPORT;
delete process.env.PGDATABASE;

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const sqlPath = path.join(__dirname, '../supabase/migrations/20260625145000_unified_pricing_architecture.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const secretKey = process.env.SUPABASE_SECRET_KEY;

const configs = [
  {
    name: 'cli_login_postgres on port 6543 with SUPABASE_SECRET_KEY',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'cli_login_postgres.knsjvttjkbdztxmtjxpz',
    password: secretKey
  },
  {
    name: 'cli_login_postgres on port 5432 with SUPABASE_SECRET_KEY',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'cli_login_postgres.knsjvttjkbdztxmtjxpz',
    password: secretKey
  }
];

async function run() {
  for (const config of configs) {
    console.log(`Trying config: ${config.name}...`);
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS with ${config.name}! Running SQL...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration executed successfully!');
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ FAILED ${config.name}: ${err.message}`);
      await client.end().catch(() => {});
    }
  }
}

run();
