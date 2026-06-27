const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Checking ai_usage_log table...');
  const { data: logData, error: logError } = await supabase
    .from('ai_usage_log')
    .select('*')
    .limit(1);

  if (logError) {
    console.log(`❌ Table ai_usage_log error: ${logError.message} (Code: ${logError.code})`);
  } else {
    console.log('✅ Table ai_usage_log exists and is accessible.');
  }

  console.log('Checking economy_config table...');
  const { data: configData, error: configError } = await supabase
    .from('economy_config')
    .select('config_key, value, status, daily_limit, monthly_limit')
    .limit(1);

  if (configError) {
    console.log(`❌ Table economy_config error: ${configError.message} (Code: ${configError.code})`);
  } else {
    console.log('✅ Table economy_config exists and contains status, daily_limit, and monthly_limit columns.');
    console.log('Sample row:', configData[0]);
  }
}

main().catch(console.error);
