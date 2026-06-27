const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  await client.connect();

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  for (const file of files) {
    console.log(`Applying migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`✅ Applied ${file}`);
    } catch (err) {
      console.error(`❌ Failed to apply ${file}:`, err.message);
      // We don't stop so that other tables can be created if some migrations are incremental or have dependencies
    }
  }

  await client.end();
  console.log('Finished applying migrations.');
}

run().catch(console.error);
