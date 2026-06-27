const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const db = createClient(url, key);

  const filePath = path.join(__dirname, '../supabase/migrations/20260623020000_019_ai_control_panel.sql');
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('Calling RPC fn_exec_sql on Supabase remote DB...');
  
  try {
    const { data, error } = await db.rpc('fn_exec_sql', { p_sql: sql });
    if (error) {
      console.error('❌ RPC error:', error.message);
    } else {
      console.log('✅ SUCCESS: Migration applied successfully via RPC fn_exec_sql!');
      console.log('Result:', data);
    }
  } catch (err) {
    console.error('❌ Exception during RPC call:', err.message);
  }
}

main().catch(console.error);
