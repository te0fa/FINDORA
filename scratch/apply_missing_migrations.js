const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local")
    process.exit(1)
  }

  const db = createClient(url, key)

  const migrations = [
    '20260604100000_vendor_management.sql',
    '20260604200000_unified_specializations.sql'
  ]

  const possibleRpcs = ['fn_exec_sql', 'fn_execute_sql', 'execute_sql', 'run_sql', 'exec_sql', 'fn_execute_query', 'fn_run_sql']
  const argNames = ['p_sql', 'sql', 'query']

  for (const filename of migrations) {
    const filePath = path.join(__dirname, '../supabase/migrations', filename)
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      continue
    }

    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`\n--- Applying ${filename} ---`)

    let success = false
    for (const rpcName of possibleRpcs) {
      for (const argName of argNames) {
        console.log(`Trying RPC: ${rpcName} with arg: ${argName}...`)
        try {
          const { data, error } = await db.rpc(rpcName, { [argName]: sql })
          if (!error) {
            console.log(`✅ SUCCESS: Applied ${filename} via RPC ${rpcName} (${argName})!`)
            success = true
            break
          } else {
            console.log(`❌ RPC ${rpcName} (${argName}) error: ${error.message}`)
          }
        } catch (err) {
          console.log(`❌ RPC ${rpcName} (${argName}) exception: ${err.message}`)
        }
      }
      if (success) break
    }

    if (!success) {
      console.error(`Failed to apply ${filename} via any RPC function.`)
    }
  }
}

run().catch(console.error)
