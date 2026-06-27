import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';
import { getActiveHomepageAnnouncements } from '../src/lib/dal/marketing';
import { createAdminClient } from '../src/lib/dal/customers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyBatch2HF() {
  console.log('--- Verifying Batch 2H-F: News & Announcements ---');

  // 1. Permission Mapping Checks
  console.log('Checking permission mapping...');
  
  const admin: StaffMemberLite = {
    id: 'admin-1', auth_user_id: 'a1', staff_role: 'admin', team_code: 'HQ', is_active: true,
    can_approve_requests: true, can_manage_merchants: true, can_view_financials: true, extra_roles: []
  };

  const newsManager: StaffMemberLite = {
    id: 'nm-1', auth_user_id: 'n1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['news_manager']
  };

  const pricingManager: StaffMemberLite = {
    id: 'pm-1', auth_user_id: 'p1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['pricing_manager']
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pNews = getStaffUiPermissions(newsManager);
  const pPricing = getStaffUiPermissions(pricingManager);

  assert(pAdmin.canManageNews === true, 'Admin should manage news');
  assert(pNews.canManageNews === true, 'News manager (extra role) should manage news');
  assert(pPricing.canManageNews === false, 'Pricing manager alone should NOT manage news');

  // 2. DAL Announcements Check
  console.log('Checking Marketing DAL for active announcements...');
  const adminClient = await createAdminClient();
  const announcements = await getActiveHomepageAnnouncements(adminClient);
  
  console.log(`Active announcements found: ${announcements?.length || 0}`);
  if (announcements && announcements.length > 0) {
    console.log('Sample:', {
      slug: announcements[0].slug,
      title: announcements[0].title_en,
      active: announcements[0].is_active
    });
  }

  // 3. Schema Integrity Check
  console.log('Checking schema integrity (no new columns in staff_members)...');
  const { data: staffCols } = await adminClient.from('staff_members').select('*').limit(1);
  const colNames = Object.keys(staffCols?.[0] || {});
  
  const unexpected = ['can_manage_news', 'can_manage_marketing'].filter(c => colNames.includes(c));
  assert(unexpected.length === 0, `Detected unexpected schema changes in staff_members: ${unexpected.join(', ')}`);

  console.log('PASSED: Batch 2H-F verification successful.');
}

verifyBatch2HF().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
