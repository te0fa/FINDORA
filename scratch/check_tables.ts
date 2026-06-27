import { createAdminClient } from '../src/lib/dal/customers';

async function check() {
  const adminClient = await createAdminClient();
  const tables = [
    'requests',
    'request_preferences',
    'request_status_history',
    'research_runs',
    'research_items',
    'request_candidate_shortlists',
    'merchant_quotes',
    'jobs',
    'reports',
    'report_option_snapshots',
    'offers',
    'approvals',
    'payments',
    'source_reveals',
    'report_snapshots',
    'staff_members',
    'customers',
    'service_catalog',
    'service_pricing_versions',
    'homepage_announcements',
    'findora_deals',
    'findora_deal_inquiries',
    'site_content_blocks',
    'site_content_audit'
  ];

  console.log('Checking tables...');
  for (const table of tables) {
    const { error } = await adminClient.from(table).select('id').limit(0);
    if (error) {
      if (error.code === '42P01') {
        console.log(`[MISSING] ${table}`);
      } else {
        console.log(`[ERROR]   ${table}: ${error.message} (${error.code})`);
      }
    } else {
      console.log(`[EXISTS]  ${table}`);
    }
  }
}

check();
