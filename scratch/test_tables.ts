import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  const db = createClient(url, key)

  const tables = [
    'contributors',
    'phone_otp_codes',
    'staff_members',
    'requests',
    'request_preferences',
    'jobs',
    'rate_limit_logs'
  ]

  console.log('Checking tables on remote Supabase...')
  for (const table of tables) {
    const { data, error } = await db.from(table).select('*').limit(1)
    if (error) {
      console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`)
    } else {
      console.log(`✅ ${table}: Exists!`)
    }
  }
}

check().catch(console.error)
