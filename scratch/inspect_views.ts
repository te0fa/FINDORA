import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '../src/lib/supabase/admin'

async function inspectViews() {
  const db = createAdminClient()
  console.log("=== Checking Views and Tables ===")

  // Querying information_schema.tables to see what we have
  // Since we cannot run raw sql directly without an RPC, let's check if there's any existing view by selecting from it.
  const check = async (name: string) => {
    const { error } = await db.from(name).select('*').limit(1)
    if (error) {
      console.log(`- ${name}: Error (${error.message})`)
    } else {
      console.log(`- ${name}: EXISTS!`)
    }
  }

  await check('requests')
  await check('customer_requests')
  await check('vendors')
  await check('merchants')
  await check('merchant_profiles')
}

inspectViews().catch(console.error)
