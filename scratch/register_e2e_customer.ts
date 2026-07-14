import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseSecret = process.env.SUPABASE_SECRET_KEY

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
      if (key === 'SUPABASE_SECRET_KEY') supabaseSecret = value
    }
  })
}

async function run() {
  if (!supabaseUrl || !supabaseSecret) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseSecret)
  const phone = '+201005044755'
  const email = 'e2e-returning-customer@findora.io'

  console.log(`Checking auth users for phone: ${phone}...`)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  let authUser = users.find(u => u.phone === phone || u.email === email)

  if (!authUser) {
    console.log('Creating auth user in Supabase Auth...')
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      phone,
      password: 'Password123',
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: '[E2E_TEST] Browser Customer' }
    })
    if (createError) {
      console.error('Failed to create auth user:', createError.message)
      process.exit(1)
    }
    authUser = user
    console.log('Auth user created successfully with ID:', authUser?.id)
  } else {
    console.log('Auth user already exists with ID:', authUser.id)
  }

  if (authUser) {
    console.log('Updating customer table to link auth_user_id...')
    const { data: customer, error: selectError } = await supabase
      .from('customers')
      .select('id, auth_user_id')
      .eq('phone_number_normalized', phone)
      .maybeSingle()

    if (selectError) {
      console.error('Failed to query customers:', selectError.message)
      process.exit(1)
    }

    if (!customer) {
      console.log('No customer found in DB. Creating customer record...')
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          auth_user_id: authUser.id,
          full_name: '[E2E_TEST] Browser Customer',
          customer_code: 'CUST-E2E-RET',
          phone_number_raw: phone,
          phone_number_normalized: phone,
          email,
          status: 'active'
        })
        .select()
        .single()
      if (insertError) {
        console.error('Failed to insert customer record:', insertError.message)
        process.exit(1)
      }
      console.log('Customer record created and linked.')
    } else {
      console.log('Found customer record:', customer)
      if (customer.auth_user_id !== authUser.id) {
        console.log(`Updating customer auth_user_id to: ${authUser.id}`)
        const { error: updateError } = await supabase
          .from('customers')
          .update({ auth_user_id: authUser.id })
          .eq('id', customer.id)
        if (updateError) {
          console.error('Failed to update customer record:', updateError.message)
          process.exit(1)
        }
        console.log('Customer record successfully linked.')
      } else {
        console.log('Customer record is already correctly linked.')
      }
    }
  }

  console.log('Setup finished.')
}

run().catch(console.error)
