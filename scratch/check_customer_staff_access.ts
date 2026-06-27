import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'

async function checkAccess() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const secretKey = process.env.SUPABASE_SECRET_KEY!

  const supabaseAdmin = createClient(url, secretKey)
  const supabase = createClient(url, key)

  // 1. Find a customer user who is not a staff member
  // First get all staff members' auth_user_ids
  const { data: staffData } = await supabaseAdmin
    .from('staff_members')
    .select('auth_user_id')

  const staffIds = staffData?.map(s => s.auth_user_id).filter(Boolean) || []
  console.log('Staff member IDs:', staffIds)

  // Find a customer with an auth_user_id not in staffIds
  const { data: customerData, error: custError } = await supabaseAdmin
    .from('customers')
    .select('auth_user_id, email')
    .not('auth_user_id', 'is', null)
    .limit(10)

  if (custError) {
    console.error('Error fetching customers:', custError)
    return
  }

  const nonStaffCustomer = customerData.find(c => !staffIds.includes(c.auth_user_id))
  let customerEmail = ''
  let customerPassword = 'Password123!'
  let authUserId = ''

  if (nonStaffCustomer) {
    customerEmail = nonStaffCustomer.email || ''
    authUserId = nonStaffCustomer.auth_user_id
    console.log(`Found existing non-staff customer: ${customerEmail} (ID: ${authUserId})`)
  } else {
    // Create a new test customer
    customerEmail = `test_customer_${Date.now()}@example.com`
    console.log(`No existing customer found. Creating a new test customer: ${customerEmail}`)
    const { data: authUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: customerPassword,
      email_confirm: true
    })

    if (signUpError || !authUser.user) {
      console.error('Failed to create auth user:', signUpError)
      return
    }

    authUserId = authUser.user.id

    // Insert into customers table
    const { error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        auth_user_id: authUserId,
        full_name: 'Test Customer',
        customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        phone_number_raw: '+201012345678',
        phone_number_normalized: '+201012345678',
        phone_verified_at: new Date().toISOString(),
        email: customerEmail,
        status: 'active'
      })

    if (insertError) {
      console.error('Failed to insert customer record:', insertError)
      return
    }
    console.log(`Successfully created test customer with ID: ${authUserId}`)
  }

  // 2. Log in as this customer
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: customerEmail,
    password: customerPassword
  })

  let session: any = signInData?.session

  // If password failed (since we might not know an existing customer's password), let's reset password for this user
  if (signInError) {
    console.log(`Sign in failed (${signInError.message}). Resetting password to ${customerPassword}...`)
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: customerPassword
    })
    if (resetError) {
      console.error('Failed to reset password:', resetError)
      return
    }
    // Try again
    const retryResult = await supabase.auth.signInWithPassword({
      email: customerEmail,
      password: customerPassword
    })
    if (retryResult.error) {
      console.error('Failed to sign in after password reset:', retryResult.error)
      return
    }
    session = retryResult.data.session
  }

  if (!session) {
    console.error('No session established')
    return
  }

  console.log(`Signed in successfully as customer: ${customerEmail}`)

  // 3. Format cookies
  const projectRef = url.split('//')[1].split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user
  }
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(sessionData)).toString('base64')

  const headers = {
    'Cookie': `${cookieName}=${cookieValue}`,
    'Content-Type': 'application/json'
  }

  // 4. Try to access /api/staff/feature-flags
  console.log('Sending request to /api/staff/feature-flags as customer...')
  const res = await fetch(`${BASE_URL}/api/staff/feature-flags`, { headers })
  console.log(`Response Status: ${res.status}`)
  try {
    const json = await res.json()
    console.log('Response JSON:', json)
  } catch {
    const text = await res.text()
    console.log('Response text:', text.substring(0, 200))
  }

  // 5. Try to access /api/intelligence/demand
  console.log('\nSending request to /api/intelligence/demand as customer...')
  const resDemand = await fetch(`${BASE_URL}/api/intelligence/demand`, { headers })
  console.log(`Response Status (Demand): ${resDemand.status}`)
  try {
    const json = await resDemand.json()
    console.log('Response JSON (Demand):', json)
  } catch {
    const text = await resDemand.text()
    console.log('Response text (Demand):', text.substring(0, 200))
  }
}

checkAccess().catch(console.error)
