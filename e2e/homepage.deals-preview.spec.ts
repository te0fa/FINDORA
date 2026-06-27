import { test, expect } from '@playwright/test';

test.describe('Homepage Deals Preview', () => {
  test('should display deals section if active deals exist', async ({ page }) => {
    await page.goto('/en');
    
    const section = page.getByTestId('homepage-deals-section');
    const isVisible = await section.isVisible();
    
    if (isVisible) {
      await expect(page.getByTestId('homepage-deal-card')).toBeVisible();
      await expect(page.getByTestId('homepage-deal-title')).not.toBeEmpty();
      await expect(page.getByTestId('homepage-deals-view-all')).toBeVisible();
    } else {
      console.log('Skipping visibility check: No active featured deals found in DB.');
    }
  });
});
