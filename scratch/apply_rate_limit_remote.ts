// scratch/apply_rate_limit_remote.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  const migrationFile = '018_rate_limit_tracking.sql'
  const filePath = path.join(process.cwd(), 'supabase/migrations', migrationFile)

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  const sql = fs.readFileSync(filePath, 'utf8')

  if (!url || !key) {
    console.error('Missing Supabase URL or Secret Key in env vars.')
    process.exit(1)
  }

  console.log(`Connecting to Supabase at: ${url}`)
  const db = createClient(url, key)
  const possibleRpcs = ['fn_execute_sql', 'execute_sql_query', 'fn_exec_sql', 'execute_sql', 'run_sql', 'exec_sql']
  const argNames = ['p_sql', 'sql', 'query']

  let applied = false
  for (const rpcName of possibleRpcs) {
    for (const argName of argNames) {
      console.log(`Trying RPC: ${rpcName} with arg: ${argName}...`)
      try {
        const { data, error } = await db.rpc(rpcName, { [argName]: sql })
        if (!error) {
          console.log(`✅ SUCCESS: Applied ${migrationFile} via RPC ${rpcName} (${argName})!`)
          applied = true
          break
        } else {
          console.log(`❌ RPC ${rpcName} (${argName}) error: ${error.message}`)
        }
      } catch (err: any) {
        console.log(`❌ RPC ${rpcName} (${argName}) exception: ${err.message}`)
      }
    }
    if (applied) break
  }

  if (!applied) {
    console.error(`Failed to apply ${migrationFile} via RPC.`)
    process.exit(1)
  }
}

run().catch(console.error)
