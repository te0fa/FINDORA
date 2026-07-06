import { createAdminClient } from '../src/lib/dal/customers'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function run() {
  const db = await createAdminClient()

  // 1. Find user by email
  const { data: { users }, error: authErr } = await db.auth.admin.listUsers()
  if (authErr) {
    console.error('Error fetching users:', authErr)
    return
  }

  const targetUser = users.find(u => u.email === 'zrzortrials@gmail.com')
  if (!targetUser) {
    console.error('User zrzortrials@gmail.com not found in auth.')
    return
  }

  console.log(`Found Auth User: ${targetUser.id}`)

  // 2. Find staff member profile
  const { data: staff, error: staffErr } = await db
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', targetUser.id)
    .single()

  if (staffErr || !staff) {
    console.error('Staff profile not found:', staffErr)
    return
  }

  console.log(`Found Staff Member ID: ${staff.id}, current role: ${staff.staff_role}`)

  // 3. Update staff_role to 'reviewer'
  const { error: updateErr } = await db
    .from('staff_members')
    .update({ staff_role: 'reviewer' })
    .eq('id', staff.id)

  if (updateErr) {
    console.error('Error updating staff role:', updateErr)
    return
  }

  console.log("Updated staff_role to 'reviewer' in staff_members table.")
  console.log('✅ Role change completed successfully!')
}

run().catch(console.error)
