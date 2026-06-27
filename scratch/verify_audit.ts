import { createAdminClient } from '../src/lib/dal/customers';

async function verifyAuditLogs() {
  const adminClient = await createAdminClient();
  
  console.log('--- Recent Audit History ---');
  const { data, error } = await adminClient
    .from('request_status_history')
    .select('id, transition_name, from_canonical_state, to_canonical_state, changed_by_staff_id, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error.message);
    return;
  }

  data?.forEach(row => {
    console.log(`[${row.created_at}] ${row.transition_name}: ${row.from_canonical_state} -> ${row.to_canonical_state} (Staff: ${row.changed_by_staff_id})`);
    if (row.metadata && Object.keys(row.metadata).length > 0) {
      console.log(`   Meta: ${JSON.stringify(row.metadata)}`);
    }
  });

  console.log('\n--- Timeline View Check ---');
  const { data: timeline, error: tErr } = await adminClient
    .from('v_request_timeline')
    .select('event_at, transition_name, actor_name, event_source')
    .order('event_at', { ascending: false })
    .limit(10);

  if (tErr) {
    console.error('Error fetching timeline:', tErr.message);
    return;
  }

  timeline?.forEach(row => {
    console.log(`[${row.event_at}] ${row.transition_name} (Actor: ${row.actor_name}, Source: ${row.event_source})`);
  });
}

verifyAuditLogs();
