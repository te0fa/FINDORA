const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'cli_login_postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
    console.log("Applied migrations on remote database:");
    res.rows.forEach(row => {
      console.log(`  ${row.version}`);
    });
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
