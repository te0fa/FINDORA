// scratch/test_hosted_supabase.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  console.log('Connecting to:', url)
  const db = createClient(url, key)
  const { data, error } = await db.from('specializations').select('id, name_en').limit(5)
  if (error) {
    console.error('❌ Query failed:', error.message)
  } else {
    console.log('✅ Connection successful! Specializations:', data)
  }
}
main()
