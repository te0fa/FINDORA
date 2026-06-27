import { createAdminClient } from '../src/lib/dal/customers'
import fs from 'fs'
import path from 'path'

async function applyMigration() {
  const adminClient = await createAdminClient()
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260511_batch_7d_staff_roles.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration...')
  const { error } = await (adminClient as any).rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    // If exec_sql doesn't exist, we might need another way or just report it
    console.error('Error applying migration via exec_sql:', error.message)
    console.log('Please apply the migration manually if possible.')
  } else {
    console.log('Migration applied successfully.')
  }
}

applyMigration()
