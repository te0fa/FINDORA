// scratch/verify_ai_columns.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createAdminClient } from '../src/lib/dal/customers'

async function verifyColumns() {
  const db = await createAdminClient()
  
  const { data, error } = await db.rpc('get_table_columns_info', { t_name: 'ai_agent_configs' })
  // If rpc doesn't exist, we'll try to select one row and see properties
  if (error) {
    console.log('RPC get_table_columns_info failed, trying select * approach...')
    const { data: row, error: selectError } = await db.from('ai_agent_configs').select('*').limit(1).maybeSingle()
    if (selectError) {
      console.log(`❌ Error fetching row: ${selectError.message}`)
      return
    }
    if (row) {
      console.log('Columns found in ai_agent_configs:', Object.keys(row))
    } else {
      console.log('Table exists but is empty. Cannot verify columns via select *.')
    }
  } else {
    console.log('Columns info:', data)
  }
}

verifyColumns().catch(console.error)
