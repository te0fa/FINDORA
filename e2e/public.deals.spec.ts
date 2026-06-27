import { test, expect } from '@playwright/test';

test.describe('Public Deals Catalog Flow', () => {
  test('should display deals catalog and navigate to details', async ({ page }) => {
    await page.goto('/en/deals');
    
    await expect(page.getByTestId('public-deals-page')).toBeVisible();
    
    const cards = page.getByTestId('public-deal-card');
    const count = await cards.count();
    
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
      await expect(cards.first().getByTestId('view-deal-details')).toBeVisible();
      
      // Navigate to details
      await cards.first().getByTestId('view-deal-details').click();
      await expect(page).toHaveURL(/\/deals\/.+/);
      await expect(page.getByTestId('detail-deal-inquiry-form')).toBeVisible();

      // Test form filling
      const form = page.getByTestId('detail-deal-inquiry-form');
      await form.locator('input[name="customer_name"]').fill('E2E Test');
      await form.locator('input[name="customer_phone"]').fill('+20123456789');
      await form.locator('textarea[name="notes"]').fill('E2E inquiry test');
    } else {
      await expect(page.getByTestId('public-deal-empty-state')).toBeVisible();
    }
  });
});
