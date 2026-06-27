import { createAdminClient } from '../src/lib/dal/customers';
import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';
import { 
  getActiveServicePricing, 
  getActiveHomepageAnnouncements 
} from '../src/lib/dal/marketing';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyPermissions() {
  console.log('--- Verifying Staff Permissions Mapping ---');

  const admin: StaffMemberLite = {
    id: 'admin-1',
    auth_user_id: 'auth-admin-1',
    full_name: 'Admin User',
    staff_role: 'admin',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: true,
    can_manage_merchants: true,
    can_view_financials: true,
    extra_roles: []
  };

  const dealsManager: StaffMemberLite = {
    id: 'dm-1',
    auth_user_id: 'auth-dm-1',
    full_name: 'Deals Manager',
    staff_role: 'deals_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const newsManager: StaffMemberLite = {
    id: 'nm-1',
    auth_user_id: 'auth-nm-1',
    full_name: 'News Manager',
    staff_role: 'news_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const multiManager: StaffMemberLite = {
    id: 'mm-1',
    auth_user_id: 'auth-mm-1',
    full_name: 'Multi Manager',
    staff_role: 'pricing_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: ['content_manager']
  };

  const reviewer: StaffMemberLite = {
    id: 'rev-1',
    auth_user_id: 'auth-rev-1',
    full_name: 'Reviewer',
    staff_role: 'reviewer',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: true,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pDeals = getStaffUiPermissions(dealsManager);
  const pNews = getStaffUiPermissions(newsManager);
  const pMulti = getStaffUiPermissions(multiManager);
  const pReviewer = getStaffUiPermissions(reviewer);

  // Admin checks
  assert(pAdmin.isAdmin === true, 'Admin should be admin');
  assert(pAdmin.canManageDeals === true, 'Admin should manage deals');
  assert(pAdmin.canManageNews === true, 'Admin should manage news');
  assert(pAdmin.canManagePricing === true, 'Admin should manage pricing');
  assert(pAdmin.canManageContent === true, 'Admin should manage content');
  assert(pAdmin.canManageMarketing === true, 'Admin should manage marketing');

  // Deals Manager checks
  assert(pDeals.isAdmin === false, 'Deals manager is not admin');
  assert(pDeals.canManageDeals === true, 'Deals manager should manage deals');
  assert(pDeals.canManageNews === false, 'Deals manager should NOT manage news');
  assert(pDeals.canManageMarketing === true, 'Deals manager should manage marketing');

  // News Manager checks
  assert(pNews.canManageNews === true, 'News manager should manage news');

  // Multi Manager checks
  assert(pMulti.canManagePricing === true, 'Multi manager should manage pricing');
  assert(pMulti.canManageContent === true, 'Multi manager should manage content');
  assert(pMulti.canManageMarketing === true, 'Multi manager should manage marketing');

  // Reviewer checks (Old permissions)
  assert(pReviewer.canReviewIntake === true, 'Reviewer should review intake');
  assert(pReviewer.canManageDeals === false, 'Reviewer should NOT manage deals');

  console.log('PASSED: Permissions mapping verified.');
}

async function verifyDAL() {
  console.log('--- Verifying Marketing DAL Functions ---');

  const adminClient = await createAdminClient();

  try {
    const pricing = await getActiveServicePricing(adminClient);
    console.log(`Active pricing records found: ${pricing?.length || 0}`);
    const hasEveryday = pricing?.some((p: any) => p.service?.service_key === 'everyday_purchase');
    assert(!!hasEveryday, 'Missing everyday_purchase in active pricing');

    const news = await getActiveHomepageAnnouncements(adminClient);
    console.log(`Active announcements found: ${news?.length || 0}`);
    const hasPromo = news?.some((n: any) => n.slug === 'everyday-purchase-promo');
    assert(!!hasPromo, 'Missing everyday-purchase-promo in announcements');

    console.log('PASSED: DAL read functions verified.');
  } catch (err: any) {
    console.error('FAILED: DAL verification error:', err.message);
    process.exit(1);
  }
}

async function run() {
  await verifyPermissions();
  await verifyDAL();
  console.log('--- Batch 2H-C Verification COMPLETED ---');
}

run().catch(console.error);
