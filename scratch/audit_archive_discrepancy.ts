import { createAdminClient } from '../src/lib/dal/customers'

async function audit() {
  const adminClient = await createAdminClient()
  
  const { count: archivedCount } = await adminClient
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('is_archived', true)

  const { count: terminalStatusCount } = await adminClient
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .or('current_status.eq.closed,reviewer_decision.eq.reject')
    .eq('is_archived', false)

  console.log('--- DB AUDIT ---')
  console.log('Requests with is_archived = true:', archivedCount)
  console.log('Non-archived requests with terminal status (closed/reject):', terminalStatusCount)
  
  // Check first 50 requests
  const { data: first50 } = await adminClient
    .from('requests')
    .select('id, is_archived, current_status, reviewer_decision')
    .order('created_at', { ascending: false })
    .range(0, 49)
    
  const archivedInFirst50 = first50?.filter(r => r.is_archived).length
  console.log('Archived requests in first 50 rows:', archivedInFirst50)
}

audit().catch(console.error)
