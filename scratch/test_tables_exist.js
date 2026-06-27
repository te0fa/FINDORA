const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTable(db, tableName) {
  const { data, error } = await db.from(tableName).select('*').limit(1);
  if (error) {
    console.log(`❌ Table ${tableName} error: ${error.message} (Code: ${error.code})`);
  } else {
    console.log(`✅ Table ${tableName} exists and is accessible!`);
  }
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db = createClient(url, key);

  console.log('Checking existence of various tables:');
  await checkTable(db, 'customers');
  await checkTable(db, 'requests');
  await checkTable(db, 'request_messages');
  await checkTable(db, 'ai_usage_log');
  await checkTable(db, 'customer_fee_phases');
  await checkTable(db, 'vendor_fee_phases');
}

run();
