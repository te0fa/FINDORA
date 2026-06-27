const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  console.log('Connecting to remote Supabase pooler...');
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  console.log('✅ Connected successfully!');

  try {
    // 1. Check if ai_usage_log table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_log'
      );
    `);
    const tableExists = tableCheck.rows[0].exists;

    // 2. Check if columns exist in economy_config
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
      console.log('Migration is missing. Applying 20260623020000_019_ai_control_panel.sql...');
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
    console.error('❌ Database operations failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
