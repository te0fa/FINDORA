// scratch/check_ai_migration_status.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createAdminClient } from '../src/lib/dal/customers'

async function checkStatus() {
  const db = await createAdminClient()
  
  console.log('Checking ai_agent_configs...')
  const { error: err1 } = await db.from('ai_agent_configs').select('count', { count: 'exact', head: true })
  if (err1) {
    console.log(`❌ ai_agent_configs table not found or error: ${err1.message}`)
  } else {
    console.log('✅ ai_agent_configs table exists.')
  }

  console.log('Checking ai_copilot_runs...')
  const { error: err2 } = await db.from('ai_copilot_runs').select('count', { count: 'exact', head: true })
  if (err2) {
    console.log(`❌ ai_copilot_runs table not found or error: ${err2.message}`)
  } else {
    console.log('✅ ai_copilot_runs table exists.')
  }
}

checkStatus().catch(console.error)
