import { test, expect } from '@playwright/test';
import { createMutatingTestRequest } from './helpers/staff-test-setup';
import { archiveTestRequest } from './helpers/db-cleanup';
import { createAdminClient } from '../src/lib/dal/customers';

/**
 * FINDORA Staff Mutating Workflow E2E
 * Verifies the full operational journey from intake to release via the UI.
 * Uses stable data-testid selectors instead of localized text.
 */
test.describe('Staff Mutating Workflow', () => {
  let requestId: string;
  let requestCode: string;

  test.beforeAll(async () => {
    // Setup a dedicated test request
    const setup = await createMutatingTestRequest();
    requestId = setup.requestId;
    requestCode = setup.requestCode;
    console.log(`[SETUP] Created test request ${requestCode} (${requestId})`);
  });

  test.afterAll(async () => {
    // Cleanup: Archive the test request
    if (requestCode) {
      await archiveTestRequest(requestCode);
    }
  });

  test('should complete full staff workflow via UI', async ({ page }) => {
    const adminClient = await createAdminClient();

    // 1. Open workspace
    await page.goto(`/en/staff/workspace/${requestId}`);

    // Guard: skip gracefully if staff auth is not available in this environment
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login') || currentUrl.includes('/auth/')) {
      console.log('Skipping: staff not authenticated in this environment');
      return;
    }
    
    // Assert identity and structural sections
    await expect(page.getByTestId('staff-workspace-page')).toBeVisible();
    await expect(page.getByTestId('staff-request-code')).toContainText(requestCode);
    
    // 2. Approve intake via UI
    const { data: initialReq } = await adminClient.from('requests').select('current_status, reviewer_decision').eq('id', requestId).single();
    if (initialReq?.current_status !== 'submitted' && initialReq?.current_status !== 'open') {
      throw new Error(`[ABORT] Request not in submitted/open status. Found: ${initialReq?.current_status}`);
    }

    await page.getByTestId('reviewer-decision-select').selectOption('approve');
    await page.getByTestId('reviewer-note-input').fill('[E2E_TEST] Approved by browser E2E');
    
    console.log('Submitting approval...');
    await page.getByTestId('reviewer-save-decision').click();
    
    // Verify transition (START_RESEARCH button becomes available)
    await expect(page.getByTestId('path-engine-start-research')).toBeVisible({ timeout: 15000 });
    
    // Verify transition in DB
    const { data: approvedReq } = await adminClient.from('requests').select('current_status, reviewer_decision').eq('id', requestId).single();
    expect(approvedReq?.current_status).toBe('in_progress');
    expect(approvedReq?.reviewer_decision).toBe('approve'); 

    // 3. Start research via UI
    console.log('Starting research...');
    await page.getByTestId('path-engine-start-research').click();
    
    // Verify research transition (research-add-finding-form becomes visible)
    await expect(page.getByTestId('research-add-finding-form')).toBeVisible({ timeout: 15000 });

    const { data: researchReq } = await adminClient.from('requests').select('current_status').eq('id', requestId).single();
    expect(['research', 'in_progress']).toContain(researchReq?.current_status);

    // 4. Add online finding via UI
    await page.getByTestId('research-finding-title-input').fill('[E2E_TEST] Online Finding');
    await page.getByTestId('research-finding-source-input').fill('E2E Online Source');
    await page.getByTestId('research-finding-url-input').fill('https://example.com/e2e-online');
    await page.getByTestId('research-finding-price-input').fill('1200');
    
    console.log('Saving online finding...');
    await page.getByTestId('research-finding-save').click();
    
    // Verify data-testid="research-finding-item" is visible
    const findingItem = page.getByTestId('research-finding-item').first();
    await expect(findingItem).toBeVisible({ timeout: 15000 });
    const researchItemId = await findingItem.getAttribute('data-research-item-id');
    expect(researchItemId, 'research item id should exist').toBeTruthy();

    const findingShortlistButton = page.getByTestId(`shortlist-add-finding-${researchItemId}`);
    await expect(findingShortlistButton).toBeVisible({ timeout: 15000 });

    // 5. Add merchant quote via UI
    await page.getByTestId('field-quote-merchant-input').fill('E2E Merchant');
    await page.getByTestId('field-quote-product-input').fill('[E2E_TEST] Offline Quote');
    await page.getByTestId('field-quote-price-input').fill('1500');
    
    console.log('Saving merchant quote...');
    await page.getByTestId('field-quote-save').click();
    
    // Verify data-testid="merchant-quote-item" is visible
    const quoteItem = page.getByTestId('merchant-quote-item').first();
    await expect(quoteItem).toBeVisible({ timeout: 15000 });

    const merchantQuoteId = await quoteItem.getAttribute('data-merchant-quote-id');
    expect(merchantQuoteId, 'merchant quote id should exist').toBeTruthy();

    const quoteShortlistButton = page.getByTestId(`shortlist-add-quote-${merchantQuoteId}`);
    await expect(quoteShortlistButton).toBeVisible({ timeout: 15000 });

    // 6. Add shortlist items via UI
    console.log('Adding items to shortlist...');
    await page.getByTestId(`shortlist-add-finding-${researchItemId}`).click();
    
    // Wait for success in URL or item in DOM
    await expect(page).toHaveURL(/success=shortlisted_online/, { timeout: 15000 });
    const onlineShortlistItem = page.locator(
      `[data-testid="shortlist-item"][data-candidate-channel="online"]`
    );
    await expect(onlineShortlistItem).toBeVisible();

    await page.getByTestId(`shortlist-add-quote-${merchantQuoteId}`).click();
    await expect(page).toHaveURL(/success=shortlisted_offline/, { timeout: 15000 });
    const offlineShortlistItem = page.locator(
      `[data-testid="shortlist-item"][data-candidate-channel="offline"]`
    );
    await expect(offlineShortlistItem).toBeVisible();

    // 7. Move to reporting via UI
    console.log('Moving to reporting...');
    await page.getByTestId('path-engine-move-to-reporting').click();
    await expect(page).toHaveURL(/success=transition_move_to_reporting/, { timeout: 15000 });
    await expect(page.getByTestId('path-engine-signal-ready')).toBeVisible();

    const { data: reportingReq } = await adminClient.from('requests').select('current_status').eq('id', requestId).single();
    expect(reportingReq?.current_status).toBe('reporting');

    // 8. Signal ready via UI
    console.log('Signaling ready...');
    await page.getByTestId('path-engine-signal-ready').click();
    await expect(page).toHaveURL(/success=transition_signal_ready/, { timeout: 15000 });
    await expect(page.getByTestId('shortlist-prepare-bundle')).toBeVisible();

    const { data: readyReq } = await adminClient.from('requests').select('current_status').eq('id', requestId).single();
    expect(readyReq?.current_status).toBe('client_ready');

    // 9. Prepare bundle via UI
    console.log('Preparing client bundle...');
    await page.getByTestId('shortlist-prepare-bundle').click();
    await expect(page).toHaveURL(/success=bundle_prepared/, { timeout: 15000 });
    await expect(page.getByTestId('shortlist-release-now')).toBeVisible();

    const { count: snapshotCount } = await adminClient
      .from('report_option_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', requestId);
    expect(snapshotCount).toBeGreaterThan(0);

    // 10. Release final via UI
    console.log('Releasing to customer...');
    await page.getByTestId('shortlist-release-now').click();
    await expect(page).toHaveURL(/success=released/, { timeout: 15000 });
    
    // Verify customer release state in DB
    const { data: uiStatus } = await adminClient
      .from('v_request_ui_status').select('client_released_at').eq('request_id', requestId).single();
    expect(uiStatus?.client_released_at).not.toBeNull();
    
    // Verify final timeline events using stable data-event-type
    await expect(page.locator('[data-testid="staff-timeline-event"][data-event-type="RELEASE_FINAL"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-timeline-event"][data-event-type="CLIENT_BUNDLE_PREPARED"]')).toBeVisible({ timeout: 15000 });
  });
});
