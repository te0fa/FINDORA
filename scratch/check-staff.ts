

import { createClient } from '@supabase/supabase-js';

async function checkStaff() {
  const adminClient = createClient(
    'https://knsjvttjkbdztxmtjxpz.supabase.co',
    'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
  );

  const staffEmail = 'zrzortrials@gmail.com';
  const { data: userRes } = await adminClient.auth.admin.listUsers();
  const staffUser = userRes.users.find(u => u.email === staffEmail);
  
  if (!staffUser) {
    console.log('Staff user not found for email:', staffEmail);
    return;
  }

  const { data: staff } = await adminClient
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', staffUser.id)
    .single();

  console.log('Staff Member:', JSON.stringify(staff, null, 2));
}

checkStaff();
