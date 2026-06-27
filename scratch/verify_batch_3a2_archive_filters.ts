import { getArchiveRequestsAdmin } from '../src/lib/dal/archive';
import { createAdminClient } from '../src/lib/dal/customers';

async function verify() {
  const adminClient = await createAdminClient();
  console.log('--- START VERIFICATION: Batch 3A-2 Archive Filters & Pagination ---');

  // 1. Pagination Check
  console.log('Verifying pagination...');
  const { total, items, limit } = await getArchiveRequestsAdmin({ limit: 5 });
  console.log(`Total records: ${total}, Items returned: ${items.length}, Limit: ${limit}`);
  
  if (items.length > 5) throw new Error('Limit not respected');
  
  // 2. Deduplication Check
  console.log('Verifying deduplication...');
  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate IDs found in list');
  console.log('✓ Deduplication verified.');

  // 3. Search Check
  if (items.length > 0) {
    const testCode = items[0].request_code;
    console.log(`Verifying search for code: ${testCode}`);
    const { items: searchItems } = await getArchiveRequestsAdmin({ search: testCode });
    if (!searchItems.some(i => i.request_code === testCode)) {
      throw new Error('Search failed to find existing request code');
    }
    console.log('✓ Search verified.');
  }

  // 4. Backup Filter Check
  console.log('Verifying backupStatus filter...');
  const { items: missingItems } = await getArchiveRequestsAdmin({ backupStatus: 'missing' });
  if (missingItems.some(i => i.backup_status !== 'missing')) {
    throw new Error('backupStatus filter failed');
  }
  console.log('✓ Backup status filter verified.');

  console.log('--- ALL VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
