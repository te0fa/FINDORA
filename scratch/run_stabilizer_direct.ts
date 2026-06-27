import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function check() {
  const db = createAdminClient()
  console.log("Calling fn_run_economy_stabilizer...")
  const { data, error } = await db.rpc('fn_run_economy_stabilizer')
  if (error) {
    console.error("RPC Error:", error)
  } else {
    console.log("RPC Success, Data:", data)
  }

  console.log("Calling fn_get_stabilizer_multiplier...")
  const { data: mult, error: multErr } = await db.rpc('fn_get_stabilizer_multiplier')
  if (multErr) {
    console.error("Multiplier RPC Error:", multErr)
  } else {
    console.log("Multiplier RPC Success, Data:", mult)
  }
}

check().catch(console.error)
