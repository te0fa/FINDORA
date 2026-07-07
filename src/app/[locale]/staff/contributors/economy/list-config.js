const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '../../../../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SECRET_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await db.from('economy_config').select('*');
  if (error) {
    console.error("Error:", error);
    return;
  }
  const filtered = data.map(r => ({ key: r.config_key, val: r.value }));
  console.log("Filtered Keys:", filtered);
}

run();
