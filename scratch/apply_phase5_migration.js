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

  const migrations = [
    '20260604400000_economy_scarcity_supply_review.sql'
  ]

  // Try DATABASE_URL first
  if (process.env.DATABASE_URL) {
    console.log('Found DATABASE_URL, attempting to run via direct pg client...')
    const { Client } = require('pg')
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    try {
      await client.connect()
      const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations', migrations[0]), 'utf8')
      await client.query(sql)
      console.log('✅ SUCCESS: Applied migration via direct pg client!')
      await client.end()
      return
    } catch (err) {
      console.log('❌ Direct pg client connection failed:', err.message)
    }
  }

  const db = createClient(url, key)

  const possibleRpcs = ['execute_sql_query', 'fn_exec_sql', 'fn_execute_sql', 'execute_sql', 'run_sql', 'exec_sql', 'fn_execute_query', 'fn_run_sql']
  const argNames = ['sql', 'p_sql', 'query']

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
      process.exit(1)
    }
  }
}

run().catch(console.error)
