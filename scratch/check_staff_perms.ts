import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  const db = createClient(url, key)

  const email = process.env.E2E_STAFF_EMAIL!

  // 1. Get user by email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    console.error('List users failed:', listErr.message)
    return
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    console.error(`No user found with email ${email}`)
    return
  }

  console.log(`Auth User found: ID=${user.id}, Email=${user.email}`)

  // 2. Query staff_members
  const { data: staff, error: staffErr } = await db
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (staffErr) {
    console.error('Query staff_members failed:', staffErr.message)
    return
  }

  if (!staff) {
    console.error('No staff_members record found!')
    return
  }

  console.log('Staff Member Record:', staff)

  // 3. Query staff_member_roles
  const { data: roles, error: rolesErr } = await db
    .from('staff_member_roles')
    .select('*')
    .eq('staff_member_id', staff.id)

  if (rolesErr) {
    console.error('Query staff_member_roles failed:', rolesErr.message)
    return
  }

  console.log('Roles:', roles)
}

check().catch(console.error)
