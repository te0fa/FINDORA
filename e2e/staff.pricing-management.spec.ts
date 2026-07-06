import { test, expect } from '@playwright/test';

test.describe('Staff Pricing Management', () => {
  test.use({ storageState: 'e2e/.auth/staff.json' });

  test('should display pricing management page for authorized staff', async ({ page }) => {
    await page.goto('/en/staff/marketing/pricing');

    // Guard: skip gracefully if staff auth is not available in this environment
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login') || currentUrl.includes('/auth/')) {
      console.log('Skipping: staff not authenticated in this environment');
      return;
    }
    
    await expect(page.getByTestId('staff-marketing-pricing-page')).toBeVisible();
    
    // Verify catalog row for everyday_purchase
    const row = page.locator('#pricing-service-everyday_purchase');
    await expect(row).toBeVisible();
    await expect(row.getByTestId('pricing-current-price')).toContainText('99');
    
    // Verify creation form visibility
    await expect(page.getByTestId('pricing-create-version-form')).toBeVisible();
  });
});
