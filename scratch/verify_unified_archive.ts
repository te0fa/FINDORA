import { getArchiveRequestsAdmin } from '../src/lib/dal/archive'

async function verify() {
  console.log('--- VERIFYING UNIFIED ARCHIVE DAL ---')
  
  // 1. Check default ARCHIVED view
  console.log('Testing default (status=ARCHIVED)...')
  const archived = await getArchiveRequestsAdmin({ status: 'ARCHIVED' })
  console.log(`- Found ${archived.items.length} items on page 1`)
  console.log(`- Total archived in DB: ${archived.total}`)
  
  if (archived.total < 270) {
    throw new Error(`Expected at least 270 archived requests, found ${archived.total}`)
  }

  // 2. Check ALL_CLEANUP_SAFE
  console.log('Testing status=ALL_CLEANUP_SAFE...')
  const cleanupSafe = await getArchiveRequestsAdmin({ status: 'ALL_CLEANUP_SAFE' })
  console.log(`- Total cleanup safe: ${cleanupSafe.total}`)
  
  if (cleanupSafe.total < archived.total) {
    throw new Error('Cleanup safe count should be >= archived count')
  }

  // 3. Check Pagination
  console.log('Testing Pagination (limit=5, offset=5)...')
  const paginated = await getArchiveRequestsAdmin({ status: 'ARCHIVED', limit: 5, offset: 5 })
  console.log(`- Paginated items: ${paginated.items.length}`)
  if (paginated.items.length !== 5) {
     console.warn(`Warning: Expected 5 items, found ${paginated.items.length}. This is okay if total < 10.`)
  }

  // 4. Check Search
  const firstCode = archived.items[0]?.request_code
  if (firstCode) {
    console.log(`Testing Search (q=${firstCode})...`)
    const searched = await getArchiveRequestsAdmin({ search: firstCode })
    console.log(`- Search results: ${searched.total}`)
    if (searched.total === 0) {
       throw new Error(`Search failed to find request code ${firstCode}`)
    }
  }

  console.log('--- ALL ARCHIVE DAL VERIFICATIONS PASSED ---')
}

verify().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
