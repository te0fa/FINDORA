
import { createClient } from '@supabase/supabase-js';

async function grantAllRoles() {
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
    .select('id')
    .eq('auth_user_id', staffUser.id)
    .single();

  if (!staff) {
    console.log('Staff member not found');
    return;
  }

  const roles = ['reviewer', 'researcher', 'field_agent', 'reporter', 'admin'];
  
  for (const role of roles) {
    const { error } = await adminClient
      .from('staff_member_roles')
      .upsert({
        staff_member_id: staff.id,
        role_code: role,
        is_active: true
      }, { onConflict: 'staff_member_id,role_code' });

    if (error) {
      console.error(`Failed to grant role ${role}:`, error.message);
    } else {
      console.log(`Granted role: ${role}`);
    }
  }

  // Also update primary role
  await adminClient
    .from('staff_members')
    .update({ staff_role: 'admin' })
    .eq('id', staff.id);

  console.log('All roles granted successfully');
}

grantAllRoles();
