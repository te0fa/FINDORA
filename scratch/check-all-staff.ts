import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function checkAllStaff() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
    return
  }

  const db = createClient(url, key)

  console.log('--- FETCHING ALL STAFF MEMBERS ---')
  const { data: staffMembers, error: staffErr } = await db
    .from('staff_members')
    .select('*')

  if (staffErr) {
    console.error('Error fetching staff members:', staffErr.message)
    return
  }

  console.log(`Total Staff Members found: ${staffMembers.length}`)

  console.log('\n--- FETCHING ALL ASSIGNED ROLES ---')
  const { data: assignedRoles, error: rolesErr } = await db
    .from('staff_member_roles')
    .select('*')

  if (rolesErr) {
    console.error('Error fetching assigned roles:', rolesErr.message)
    return
  }

  console.log(`Total Assigned Roles found: ${assignedRoles.length}`)

  // Analyze staff members
  console.log('\n--- STAFF MEMBERS & ROLES ANALYSIS ---')
  for (const staff of staffMembers) {
    const rolesForStaff = assignedRoles.filter(r => r.staff_member_id === staff.id)
    const activeRoles = rolesForStaff.filter(r => r.is_active).map(r => r.role_code)
    
    console.log(`\n- Staff: ${staff.full_name} (${staff.staff_role || 'No primary role'})`)
    console.log(`  Active: ${staff.is_active ? 'YES' : 'NO'}`)
    console.log(`  Permissions: Approve=${staff.can_approve_requests}, Merchants=${staff.can_manage_merchants}, Finance=${staff.can_view_financials}`)
    console.log(`  Extra Roles: ${activeRoles.join(', ') || 'None'}`)
    
    if (!staff.staff_role && activeRoles.length === 0) {
      console.log('  ⚠️ WARNING: This staff member has NO roles assigned (completely inactive/unprivileged)!')
    }
  }

  // Get all unique role codes defined in the schema/DB
  // Let's query information_schema or unique role_code from staff_member_roles
  const { data: uniqueRoleCodesRes } = await db
    .from('staff_member_roles')
    .select('role_code')
  
  const roleCodesInDB = Array.from(new Set((uniqueRoleCodesRes || []).map(r => r.role_code)))
  console.log('\n--- UNIQUE ROLE CODES DETECTED IN DB ---')
  console.log(roleCodesInDB.join(', ') || 'None')
}

checkAllStaff().catch(console.error)
