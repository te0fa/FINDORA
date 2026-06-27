import { createClient } from '@supabase/supabase-js'

async function setupStaff() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.error('Missing SUPABASE URL or SECRET KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const email = 'staff@findora.io'
  const password = 'Password123'

  console.log(`Setting up staff user: ${email}`)

  // 1. Check if auth user exists
  const { data: users } = await supabase.auth.admin.listUsers()
  let authUser = users.users.find(u => u.email === email)

  if (!authUser) {
    console.log('Creating auth user...')
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Support Agent' }
    })
    if (createError) throw createError
    authUser = newUser.user
    console.log('Auth user created.')
  } else {
    console.log('Auth user already exists.')
  }

  // 2. Check if staff_members row exists
  const { data: staffMember, error: staffError } = await supabase
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (staffMember) {
    console.log('Staff member record already exists.')
  } else {
    console.log('Creating staff member record...')
    const { error: insertError } = await supabase
      .from('staff_members')
      .insert({
        auth_user_id: authUser.id,
        full_name: 'Support Agent',
        staff_role: 'agent',
        is_active: true
      })
    if (insertError) throw insertError
    console.log('Staff member record created.')
  }

  console.log('Setup complete.')
}

setupStaff().catch(console.error)
