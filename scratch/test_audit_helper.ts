import { logOperationalEvent } from '../src/lib/dal/audit';
import { createAdminClient } from '../src/lib/dal/customers';

async function testAuditHelper() {
  const adminClient = await createAdminClient();
  
  // Get a valid request_id and staff_id
  const { data: req } = await adminClient.from('requests').select('id').limit(1).single();
  const { data: staff } = await adminClient.from('staff_members').select('id').limit(1).single();

  if (!req || !staff) {
    console.error('No request or staff found to test with.');
    return;
  }

  console.log(`Testing audit helper for Request: ${req.id}, Staff: ${staff.id}`);

  await logOperationalEvent({
    requestId: req.id,
    staffId: staff.id,
    eventName: 'SHORTLIST_ITEM_ADDED',
    metadata: { test_run: true, shortlist_id: '00000000-0000-0000-0000-000000000000' }
  });

  console.log('Done. Check verify_audit.ts output.');
}

testAuditHelper();
