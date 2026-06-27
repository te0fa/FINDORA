import { getRequestTimeline } from '../src/lib/dal/timeline';
import { createAdminClient } from '../src/lib/dal/customers';

async function verifyTimelineData() {
  const adminClient = await createAdminClient();
  
  // 1. Find a request that definitely has audit events, preferably a dedicated test one
  console.log('Searching for a request with existing audit events...');
  
  // Prefer [AUDIT_TEST] request
  const { data: testMatch } = await adminClient
    .from('requests')
    .select('id')
    .or('title.ilike.%[AUDIT_TEST]%,raw_description.ilike.%[AUDIT_TEST]%')
    .limit(1)
    .maybeSingle();

  let targetRequestId = testMatch?.id;

  if (!targetRequestId) {
    // Fallback to any request with known audit events in the timeline
    const { data: timelineMatch } = await adminClient
      .from('v_request_timeline')
      .select('request_id')
      .in('transition_name', ['SHORTLIST_ITEM_ADDED', 'ONLINE_FINDING_ADDED', 'OFFLINE_QUOTE_ADDED'])
      .limit(1)
      .maybeSingle();
    targetRequestId = timelineMatch?.request_id;
  }

  let req;
  if (targetRequestId) {
    const { data } = await adminClient
      .from('requests')
      .select('id, title')
      .eq('id', targetRequestId)
      .limit(1)
      .maybeSingle();
    req = data;
  } else {
    console.warn('No request with audit events found. Falling back to first available request.');
    const { data } = await adminClient
      .from('requests')
      .select('id, title')
      .limit(1)
      .maybeSingle();
    req = data;
  }

  if (!req) {
    console.error('No request found for verification.');
    process.exit(1);
  }

  // Get staff context for the log output
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('id, auth_user_id')
    .limit(1)
    .maybeSingle();

  console.log(`--- Context ---`);
  console.log(`Request ID: ${req.id} (Matched: "${req.title}")`);
  console.log(`Staff ID:   ${staff?.id || 'Unknown'}`);
  
  console.log(`\n--- Verifying Timeline UI Data for Request: ${req.id} ---`);
  
  const events = await getRequestTimeline(req.id, 'desc');
  
  console.log(`Total Events: ${events.length}`);
  
  if (events.length > 0) {
    console.log('Latest 5 Events:');
    events.slice(0, 5).forEach((e, i) => {
      console.log(`${i+1}. [${e.event_at}] ${e.transition_name} (Actor: ${e.actor_name || 'System'}, Source: ${e.event_source})`);
      if (e.metadata) {
        console.log(`   Metadata: ${JSON.stringify(e.metadata)}`);
      }
    });
  } else {
    console.log('No events found for this request.');
  }

  const criticalEvents = ['SHORTLIST_ITEM_ADDED', 'ONLINE_FINDING_ADDED', 'OFFLINE_QUOTE_ADDED'];
  const found = events.map(e => e.transition_name);
  
  console.log('\n--- Critical Audit Check ---');
  criticalEvents.forEach(evt => {
    if (found.includes(evt)) {
      console.log(`[PASS] ${evt} present in timeline data.`);
    } else {
      console.log(`[WARN] ${evt} not found in this request's history (expected if not performed yet).`);
    }
  });
}

verifyTimelineData().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
