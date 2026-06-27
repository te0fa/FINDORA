import { getArchiveRequestsAdmin } from '../src/lib/dal/archive'
import { getStaffUiPermissions } from '../src/lib/dal/staff'
import { getIntakeQueueRequests, getReadyQueueRequests, getCompletedQueueRequests, getIssuesQueueRequests, getOperationsQueueRequests } from '../src/lib/dal/requests'

async function verify() {
  console.log('--- VERIFYING BATCH 3A-3 ---')

  // 1. Verify RBAC
  console.log('Verifying Role Permissions...')
  const mockArchiveManager = { staff_role: 'archive_manager' } as any
  const permsAM = getStaffUiPermissions(mockArchiveManager)
  console.log('Archive Manager canManageArchive:', permsAM.canManageArchive)
  console.log('Archive Manager canHardDelete:', permsAM.canHardDelete)
  
  if (!permsAM.canManageArchive || permsAM.canHardDelete) {
    throw new Error('RBAC Verification Failed: Archive Manager should manage but NOT hard delete.')
  }

  const mockAdmin = { staff_role: 'admin' } as any
  const permsAdmin = getStaffUiPermissions(mockAdmin)
  if (!permsAdmin.canHardDelete) {
    throw new Error('RBAC Verification Failed: Admin should be able to hard delete.')
  }
  console.log('Admin RBAC: OK')

  // 2. Operational DAL Verification (TASK C)
  console.log('\nRunning Operational DAL Checks...')
  
  const scenarios = [
    { name: 'ARCHIVED', filter: { status: 'ARCHIVED', limit: 50, offset: 0 } as any },
    { name: 'COMPLETED', filter: { status: 'COMPLETED', limit: 50, offset: 0 } as any },
    { name: 'Backup Missing', filter: { backupStatus: 'missing', limit: 50, offset: 0 } as any },
    { name: 'Backup Prepared', filter: { backupStatus: 'prepared', limit: 50, offset: 0 } as any }
  ]

  for (const scenario of scenarios) {
    console.log(`Checking scenario: ${scenario.name}...`)
    const result = await getArchiveRequestsAdmin(scenario.filter)
    
    console.log(`  Total: ${result.total}, Items: ${result.items.length}`)
    
    // Verify duplicate IDs
    const ids = result.items.map(i => i.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      throw new Error(`Duplicate IDs found in ${scenario.name} result!`)
    }

    // Verify Pagination Consistency
    if (result.total < scenario.filter.limit) {
      if (result.items.length !== result.total) {
        throw new Error(`Pagination mismatch in ${scenario.name}: Total ${result.total} but returned ${result.items.length}`)
      }
    } else {
      if (result.items.length > scenario.filter.limit) {
        throw new Error(`Limit overflow in ${scenario.name}: Limit ${scenario.filter.limit} but returned ${result.items.length}`)
      }
    }

    // Verify State Consistency
    for (const item of result.items) {
      if (scenario.filter.status === 'ARCHIVED') {
        if (item.state !== 'ARCHIVED') throw new Error(`Non-archived item ${item.request_code} in ARCHIVED view!`)
      }
      if (scenario.filter.status === 'COMPLETED') {
        if (item.state !== 'COMPLETED') throw new Error(`Non-completed item ${item.request_code} in COMPLETED view!`)
      }
      if (scenario.filter.backupStatus === 'missing') {
        if (item.backup_status !== 'missing') throw new Error(`Item ${item.request_code} has backup but in missing view!`)
      }
      if (scenario.filter.backupStatus === 'prepared') {
        if (item.backup_status !== 'prepared') throw new Error(`Item ${item.request_code} missing backup in prepared view!`)
      }
    }
    console.log(`  Scenario ${scenario.name}: PASSED`)
  }

  // 3. Queue Duplicate Checks
  console.log('\nChecking Queue Data for duplicates...')
  const queueCheckers = [
    { name: 'Intake Queue', fn: getIntakeQueueRequests },
    { name: 'Ready Queue', fn: getReadyQueueRequests },
    { name: 'Completed Queue', fn: getCompletedQueueRequests },
    { name: 'Issues Queue', fn: getIssuesQueueRequests },
    { name: 'Operations Queue', fn: getOperationsQueueRequests }
  ]

  for (const checker of queueCheckers) {
    console.log(`Checking ${checker.name}...`)
    const items = await checker.fn()
    const ids = items.map((i: any) => i.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      throw new Error(`Duplicate IDs found in ${checker.name} result!`)
    }
    console.log(`  ${checker.name}: PASSED (${items.length} items)`)
  }

  console.log('\n--- VERIFICATION COMPLETE: ALL SYSTEMS GO ---')
}

verify().catch(err => {
  console.error(err)
  process.exit(1)
})
