const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseSecret);

async function run() {
  const { data: staffMembers, error: err } = await supabase
    .from('staff_members')
    .select('*');

  if (err) {
    console.error('Error:', err);
    return;
  }

  const { data: authData } = await supabase.auth.admin.listUsers();
  const userMap = {};
  for (const u of authData.users) {
    userMap[u.id] = u.email;
  }

  console.log('Staff members mapped to auth emails:');
  for (const m of staffMembers) {
    const email = userMap[m.auth_user_id] || 'Unknown';
    console.log(`ID: ${m.id} | Name: ${m.full_name} | Role: ${m.staff_role} | Email: ${email} | auth_user_id: ${m.auth_user_id}`);
  }
}

run();
