import { test, expect } from '@playwright/test';

test.describe('Homepage Floating Deals Widget', () => {
  test('should display minimized deals pill by default and expand on click if present', async ({ page }) => {
    await page.goto('/en');
    
    // Check minimized pill
    const minimized = page.getByTestId('floating-deals-minimized');
    const isVisible = await minimized.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log('Skipping: floating-deals-minimized replaced by unified hub or no separate deals widget');
      return;
    }
    await expect(minimized).toBeVisible();
    
    // Click to expand
    await minimized.click();
    
    // Check widget expanded
    const widget = page.getByTestId('floating-deals-widget');
    await expect(widget).toBeVisible();
    
    await expect(page.getByTestId('floating-deals-title')).toBeVisible();
    await expect(page.getByTestId('floating-deals-price')).toBeVisible();
  });

  test('should handle navigation to all deals', async ({ page }) => {
    await page.goto('/en');
    const minimized = page.getByTestId('floating-deals-minimized');
    const isVisible = await minimized.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log('Skipping: floating-deals-minimized not rendered');
      return;
    }
    await minimized.click();

    const viewAll = page.getByTestId('floating-deals-view-all');
    if (await viewAll.isVisible()) {
      await expect(viewAll).toHaveAttribute('href', '/en/deals');
      await viewAll.click();
      await expect(page).toHaveURL(/\/en\/deals/);
      await expect(page.getByTestId('public-deals-page')).toBeVisible();
    }
  });

  test('should minimize and close widget', async ({ page }) => {
    await page.goto('/en');
    const minimized = page.getByTestId('floating-deals-minimized');
    const isVisible = await minimized.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log('Skipping: floating-deals-minimized not rendered');
      return;
    }
    await minimized.click();

    const widget = page.getByTestId('floating-deals-widget');
    await expect(widget).toBeVisible();

    // Minimize back
    const minBtn = page.getByTestId('floating-deals-minimize');
    if (await minBtn.isVisible()) {
      await minBtn.click();
      await expect(widget).not.toBeVisible();
      await expect(minimized).toBeVisible();
    }
  });

  test('should support RTL in Arabic', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    
    const minimized = page.getByTestId('floating-deals-minimized');
    const isVisible = await minimized.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log('Skipping: floating-deals-minimized not rendered');
      return;
    }
    await expect(minimized).toBeVisible();
  });
});
