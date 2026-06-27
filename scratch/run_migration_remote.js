const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const password = process.env.SUPABASE_SECRET_KEY;
  if (!password) {
    console.error('❌ SUPABASE_SECRET_KEY is missing in .env.local');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.knsjvttjkbdztxmtjxpz:${encodeURIComponent(password)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
  console.log('Connecting to remote Supabase database pooler...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    // Check if ai_usage_log table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_log'
      );
    `);
    const tableExists = tableCheck.rows[0].exists;

    // Check if columns exist in economy_config
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'economy_config' 
      AND column_name IN ('status', 'daily_limit', 'monthly_limit');
    `);
    const existingCols = colCheck.rows.map(r => r.column_name);
    const hasAllCols = existingCols.length === 3;

    console.log(`Table ai_usage_log exists: ${tableExists}`);
    console.log(`economy_config has status/limits columns: ${hasAllCols} (found: ${existingCols.join(', ')})`);

    if (!tableExists || !hasAllCols) {
      console.log('Applying 20260623020000_019_ai_control_panel.sql...');
      const sqlPath = path.join(__dirname, '../supabase/migrations/20260623020000_019_ai_control_panel.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration applied successfully.');
    } else {
      console.log('✅ Migration already applied.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Database operations failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
