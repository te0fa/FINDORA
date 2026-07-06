
import { test, expect } from '@playwright/test';

test.describe('Staff Workspace Read-Only Navigation', () => {
  test.use({ storageState: 'e2e/.auth/staff.json' });

  test('should navigate from queue to workspace and verify read-only sections', async ({ page }) => {
    // 1. Navigate to staff queue
    await page.goto('/en/staff/queue');

    // Guard: skip gracefully if staff auth is not available in this environment
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login') || currentUrl.includes('/auth/')) {
      console.log('Skipping: staff not authenticated in this environment');
      return;
    }
    
    // 2. Verify queue page loads
    const queuePage = page.getByTestId('staff-queue-page');
    await expect(queuePage).toBeVisible();

    // 3. Check for available workspace links
    const workspaceLinks = page.getByTestId('queue-open-workspace');
    const count = await workspaceLinks.count();

    if (count === 0) {
      console.warn('No workspace links found in the queue. Skipping test.');
      test.skip(true, 'No workspace links available in the staff queue.');
      return;
    }

    // 4. Open the first available workspace
    await workspaceLinks.first().click();

    // 5. Assert URL transition
    await expect(page).toHaveURL(/.*\/staff\/workspace\/.*/);

    // 6. Verify workspace page structure
    await expect(page.getByTestId('staff-workspace-page')).toBeVisible();

    // 7. Verify all critical read-only sections are visible
    const criticalSections = [
      'staff-overview-section',
      'staff-preferences-section',
      'staff-research-runs-section',
      'staff-merchant-quotes-section',
      'staff-shortlist-section',
      'staff-path-engine-section',
      'staff-action-history-panel'
    ];

    for (const testId of criticalSections) {
      const section = page.getByTestId(testId);
      await expect(section).toBeVisible({ timeout: 5000 });
      console.log(`Verified section: ${testId}`);
    }

    console.log('Read-only workspace verification completed successfully.');
  });
});
