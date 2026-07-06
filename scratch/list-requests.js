const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SUPABASE_SECRET_KEY') supabaseSecret = value;
    }
  });
}

if (!supabaseUrl || !supabaseSecret) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseSecret);

async function run() {
  const { data: requests, error } = await client
    .from('requests')
    .select('id, title, current_status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error.message);
    return;
  }

  console.log('--- ALL REQUESTS IN SYSTEM ---');
  requests.forEach(r => {
    console.log(`ID: ${r.id} | Title: "${r.title}" | Status: ${r.current_status} | Created: ${r.created_at}`);
  });
}

run();
