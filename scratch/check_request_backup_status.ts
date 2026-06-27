import { createAdminClient } from '../src/lib/dal/customers';
import { getArchiveRequestsAdmin } from '../src/lib/dal/archive';

async function check() {
  const adminClient = await createAdminClient();
  const requestId = '6f3c58d3-dce0-4bfa-bbf4-70548de3313a';

  console.log(`--- DEBUG STATUS for Request: ${requestId} ---`);

  // 1. Request Row
  const { data: request } = await adminClient
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();
  console.log('1. Request Row:', request ? { id: request.id, code: request.request_code, status: request.current_status } : 'NOT FOUND');

  // 2. All Backups
  const { data: backups } = await adminClient
    .from('request_delete_backups')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  console.log('2. Backups in DB:', backups?.length || 0);
  if (backups && backups.length > 0) {
    backups.forEach(b => {
      console.log(`   - ID: ${b.id}, Created: ${b.created_at}, Confirmed: ${b.delete_confirmed}`);
    });
  }

  // 3. Deletion Audit
  const { data: audits } = await adminClient
    .from('request_deletion_audit')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  console.log('3. Deletion Audits:', audits?.length || 0);
  if (audits && audits.length > 0) {
    audits.forEach(a => {
      console.log(`   - Event: ${a.event_type}, At: ${a.created_at}`);
    });
  }

  // 4. getArchiveRequestsAdmin Output
  console.log('4. getArchiveRequestsAdmin output for this request:');
  const { items } = await getArchiveRequestsAdmin({ search: request?.request_code || '' });
  const item = items.find(i => i.id === requestId);
  console.log(item ? JSON.stringify(item, null, 2) : 'NOT FOUND IN ARCHIVE LIST');
}

check().catch(err => {
  console.error('DEBUG FAILED:', err);
  process.exit(1);
});
