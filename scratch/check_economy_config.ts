import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function checkFlags() {
  const db = createAdminClient()
  const { data, error } = await (db.from('economy_config') as any)
    .select('*')
  if (error) {
    console.error('Error fetching economy_config:', error)
  } else {
    console.log('Economy Config Records:', data)
  }
}

checkFlags()
