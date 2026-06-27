import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';
import { getPublishedContentBlocks, upsertContentBlockAdmin } from '../src/lib/dal/marketing';
import { createAdminClient } from '../src/lib/dal/customers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyBatch2HH() {
  console.log('--- Verifying Batch 2H-H: Internal CMS ---');

  // 1. Permission Mapping Checks
  console.log('Checking permission mapping...');
  
  const admin: StaffMemberLite = {
    id: 'admin-1', auth_user_id: 'a1', staff_role: 'admin', team_code: 'HQ', is_active: true,
    can_approve_requests: true, can_manage_merchants: true, can_view_financials: true, extra_roles: []
  };

  const contentManager: StaffMemberLite = {
    id: 'cm-1', auth_user_id: 'c1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['content_manager']
  };

  const newsManager: StaffMemberLite = {
    id: 'nm-1', auth_user_id: 'n1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['news_manager']
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pContent = getStaffUiPermissions(contentManager);
  const pNews = getStaffUiPermissions(newsManager);

  assert(pAdmin.canManageMarketing === true, 'Admin should manage marketing (global)');
  assert(pContent.canManageContent === true, 'Content manager (extra role) should manage content');
  assert(pNews.canManageContent === false, 'News manager alone should NOT manage content');

  // 2. DAL CMS Check
  console.log('Checking Marketing DAL for content blocks...');
  const adminClient = await createAdminClient();
  const blocks = await getPublishedContentBlocks(['homepage_hero'], adminClient);
  
  console.log(`Published blocks found: ${blocks?.length || 0}`);
  
  // 3. Upsert & Audit Check
  console.log('Testing CMS upsert and audit trail...');
  try {
    const testSlug = '[E2E_TEST]_hero';
    await upsertContentBlockAdmin({
      block_key: testSlug,
      page_key: 'test',
      section_key: 'test',
      content_json: { test: true },
      updated_by_staff_id: undefined // System
    }, adminClient);
    
    // Check audit
    const { data: audit } = await adminClient
      .from('site_content_audit')
      .select('*')
      .eq('block_key', testSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    assert(!!audit, 'Audit row should be created after upsert');
    console.log('CMS Upsert & Audit: PASSED');
    
    // Cleanup
    await adminClient.from('site_content_audit').delete().eq('block_key', testSlug);
    await adminClient.from('site_content_blocks').delete().eq('block_key', testSlug);
  } catch (err: any) {
    console.error('CMS Upsert & Audit: FAILED', err.message);
    throw err;
  }

  // 4. Schema Integrity Check
  console.log('Checking schema integrity (no new columns in staff_members)...');
  const { data: staffCols } = await adminClient.from('staff_members').select('*').limit(1);
  const colNames = Object.keys(staffCols?.[0] || {});
  
  const unexpected = ['can_manage_content'].filter(c => colNames.includes(c));
  assert(unexpected.length === 0, `Detected unexpected schema changes in staff_members: ${unexpected.join(', ')}`);

  console.log('PASSED: Batch 2H-H verification successful.');
}

verifyBatch2HH().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
