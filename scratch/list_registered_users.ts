import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function run() {
  const adminClient = createAdminClient()

  console.log('--- FETCHING FROM AUTH.USERS ---')
  const { data: { users }, error: authErr } = await adminClient.auth.admin.listUsers()
  if (authErr) {
    console.error('Error fetching auth users:', authErr)
    return
  }

  console.log(`Total users in Auth: ${users?.length || 0}\n`)

  console.log('--- FETCHING FROM CUSTOMERS ---')
  const { data: customers, error: custErr } = await adminClient
    .from('customers')
    .select('id, full_name, email, phone_number_normalized, auth_user_id, status')
  if (custErr) {
    console.error('Error fetching customers:', custErr)
  }

  console.log('--- FETCHING FROM STAFF_MEMBERS ---')
  const { data: staff, error: staffErr } = await adminClient
    .from('staff_members')
    .select('id, full_name, auth_user_id, staff_role, is_active')
  if (staffErr) {
    console.error('Error fetching staff members:', staffErr)
  }

  console.log('--- FETCHING FROM VENDORS ---')
  const { data: vendors, error: vendorErr } = await adminClient
    .from('vendors')
    .select('id, display_name, auth_user_id, portal_email, system_status')
  if (vendorErr) {
    console.error('Error fetching vendors:', vendorErr)
  }

  console.log('\n==================================================')
  console.log('1. ALL AUTH USERS (Supabase Auth)')
  console.log('==================================================')
  if (!users || users.length === 0) {
    console.log('No users found in Auth.')
  } else {
    users.forEach((u, i) => {
      console.log(`${i+1}. Email: ${u.email} | ID: ${u.id}`)
    })
  }

  console.log('\n==================================================')
  console.log('2. CUSTOMERS TABLE (customers)')
  console.log('==================================================')
  if (!customers || customers.length === 0) {
    console.log('No customers found.')
  } else {
    customers.forEach((c, i) => {
      console.log(`${i+1}. Name: ${c.full_name} | Email: ${c.email || 'N/A'} | Phone: ${c.phone_number_normalized || 'N/A'} | Auth ID: ${c.auth_user_id || 'Guest'} | Status: ${c.status}`)
    })
  }

  console.log('\n==================================================')
  console.log('3. STAFF MEMBERS TABLE (staff_members)')
  console.log('==================================================')
  if (!staff || staff.length === 0) {
    console.log('No staff members found.')
  } else {
    staff.forEach((s, i) => {
      console.log(`${i+1}. Name: ${s.full_name} | Role: ${s.staff_role} | Active: ${s.is_active} | Auth ID: ${s.auth_user_id}`)
    })
  }

  console.log('\n==================================================')
  console.log('4. VENDORS TABLE (vendors)')
  console.log('==================================================')
  if (!vendors || vendors.length === 0) {
    console.log('No vendors found.')
  } else {
    vendors.forEach((v, i) => {
      console.log(`${i+1}. Name: ${v.display_name} | Portal Email: ${v.portal_email || 'N/A'} | Status: ${v.system_status} | Auth ID: ${v.auth_user_id || 'N/A'}`)
    })
  }
}

run()
