// scratch/grant_ai_manager.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { assignAIManagerRole } from '../src/lib/dal/ai-control'

async function main() {
  const staffId = '9cc1caae-0288-4553-b6ad-5b790ada7bee'
  console.log(`Granting ai_manager role to staff member: ${staffId}...`)
  await assignAIManagerRole(staffId)
  console.log('✅ Successfully granted ai_manager role!')
}

main().catch(err => {
  console.error('Failed to grant role:', err)
  process.exit(1)
})
