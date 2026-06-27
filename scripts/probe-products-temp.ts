import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function probe() {
  const rpcs = ['get_table_columns_metadata', 'inspect_table_columns', 'fn_probe_columns', 'get_table_columns_info']
  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}`)
    try {
      const { data, error } = await supabase.rpc(rpc, { table_name: 'products' })
      if (!error) {
        console.log(`✅ Success with ${rpc}:`, data)
        return
      } else {
        console.log(`❌ ${rpc} error:`, error.message)
      }
    } catch (err: any) {
      console.log(`❌ ${rpc} exception:`, err.message)
    }
  }
}

probe()
