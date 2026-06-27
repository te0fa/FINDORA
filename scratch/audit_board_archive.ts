import { createAdminClient } from '../src/lib/dal/customers'

async function audit() {
  const adminClient = await createAdminClient()
  
  const { count: boardArchivedCount } = await adminClient
    .from('v_request_admin_board')
    .select('*', { count: 'exact', head: true })
    .eq('is_archived', true)

  console.log('Archived requests in v_request_admin_board:', boardArchivedCount)
}

audit().catch(console.error)
