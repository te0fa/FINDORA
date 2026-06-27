const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const email = process.env.E2E_STAFF_EMAIL || 'zrzortrials@gmail.com';
  const password = process.env.E2E_STAFF_PASSWORD || '123456';

  const supabase = createClient(url, key);

  console.log(`Signing in as: ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`Auth success. User ID: ${userId}`);

  const { data: staff, error } = await supabase
    .from('staff_members')
    .select('id, full_name, staff_role, is_active')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching staff member:', error.message);
    return;
  }

  if (!staff) {
    console.log('No staff member found in staff_members table for this auth user.');
    return;
  }

  console.log('Staff member found:', staff);

  // Check extra roles
  const { data: extraRoles, error: rolesError } = await supabase
    .from('staff_member_roles')
    .select('role_code, is_active')
    .eq('staff_member_id', staff.id)
    .eq('is_active', true);

  if (rolesError) {
    console.error('Error fetching extra roles:', rolesError.message);
  } else {
    console.log('Extra active roles:', extraRoles.map(r => r.role_code));
  }
}

main().catch(console.error);
