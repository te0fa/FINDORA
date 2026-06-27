import { createAdminClient } from '../src/lib/dal/customers';

async function auditData() {
  const adminClient = await createAdminClient();
  
  console.log('--- DATA SHAPE AUDIT ---');

  // 1. Audit public.requests
  const { data: requests } = await adminClient.from('requests').select('*').limit(1);
  if (requests && requests.length > 0) {
    console.log('1. public.requests columns:', Object.keys(requests[0]).join(', '));
  } else {
    console.log('1. public.requests: EMPTY OR NOT ACCESSIBLE');
  }

  // 2. Audit public.v_request_ui_status
  const { data: views } = await adminClient.from('v_request_ui_status').select('*').limit(1);
  if (views && views.length > 0) {
    console.log('2. public.v_request_ui_status columns:', Object.keys(views[0]).join(', '));
  } else {
    console.log('2. public.v_request_ui_status: EMPTY OR NOT ACCESSIBLE');
  }

  // 3. Audit public.request_delete_backups
  const { data: backups } = await adminClient.from('request_delete_backups').select('*').limit(1);
  if (backups && backups.length > 0) {
    console.log('3. public.request_delete_backups columns:', Object.keys(backups[0]).join(', '));
  } else {
    console.log('3. public.request_delete_backups: EMPTY OR NOT ACCESSIBLE');
  }

  // 4. Audit public.request_deletion_audit
  const { data: audits } = await adminClient.from('request_deletion_audit').select('*').limit(1);
  if (audits && audits.length > 0) {
    console.log('4. public.request_deletion_audit columns:', Object.keys(audits[0]).join(', '));
  } else {
    console.log('4. public.request_deletion_audit: EMPTY OR NOT ACCESSIBLE');
  }
}

auditData().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
