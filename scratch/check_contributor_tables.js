const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY")
    return
  }

  const db = createClient(url, key)
  
  console.log("Checking contributors table...")
  const { data: contribs, error: err1 } = await db.from('contributors').select('id, full_name, role, status').limit(5)
  if (err1) {
    console.error("❌ contributors table error:", err1.message)
  } else {
    console.log("✅ contributors table exists! Rows found:", contribs.length)
    console.log("Sample:", contribs)
  }

  console.log("Checking contributor_wallets table...")
  const { data: wallets, error: err2 } = await db.from('contributor_wallets').select('id, balance_egp').limit(5)
  if (err2) {
    console.error("❌ contributor_wallets table error:", err2.message)
  } else {
    console.log("✅ contributor_wallets table exists! Rows found:", wallets.length)
  }
}

run().catch(console.error)
