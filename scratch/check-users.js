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

const client = createClient(supabaseUrl, supabaseSecret);

async function run() {
  console.log('Fetching customers...');
  const { data: customers } = await client.from('customers').select('id, full_name, email, auth_user_id');
  console.log('Customers Count:', customers?.length);
  console.log('Sample Customers:', customers?.slice(0, 10));

  console.log('Fetching staff members...');
  const { data: staff } = await client.from('staff_members').select('id, full_name, email, auth_user_id');
  console.log('Staff Count:', staff?.length);
  console.log('Staff List:', staff);
}

run();
