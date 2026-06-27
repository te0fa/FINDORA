// scratch/make_staff_admin.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createAdminClient } from '../src/lib/dal/customers'

async function main() {
  const staffId = '9cc1caae-0288-4553-b6ad-5b790ada7bee'
  console.log(`Updating primary staff_role to 'admin' for E2E user: ${staffId}...`)
  
  const db = await createAdminClient()
  const { error } = await db
    .from('staff_members')
    .update({ staff_role: 'admin' })
    .eq('id', staffId)

  if (error) {
    throw new Error(error.message)
  }
  
  console.log('✅ Successfully updated primary role to admin!')
}

main().catch(err => {
  console.error('Failed to update role:', err)
  process.exit(1)
})
