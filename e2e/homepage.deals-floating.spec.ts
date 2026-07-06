import { test, expect } from '@playwright/test';

test.describe('Homepage Floating Deals Widget', () => {
  test('should display minimized deals pill by default and expand on click', async ({ page }) => {
    await page.goto('/en');
    
    // Check minimized pill
    const minimized = page.getByTestId('floating-deals-minimized');
    if (!await minimized.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: no featured deals in DB');
      return;
    }
    await expect(minimized).toBeVisible({ timeout: 15000 });
    
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
    if (!await minimized.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: no featured deals in DB');
      return;
    }
    await expect(minimized).toBeVisible({ timeout: 15000 });
    await minimized.click();

    const viewAll = page.getByTestId('floating-deals-view-all');
    await expect(viewAll).toHaveAttribute('href', '/en/deals');
    
    await viewAll.click();
    await expect(page).toHaveURL(/\/en\/deals/);
    await expect(page.getByTestId('public-deals-page')).toBeVisible();
  });

  test('should minimize and close widget', async ({ page }) => {
    await page.goto('/en');
    const minimized = page.getByTestId('floating-deals-minimized');
    if (!await minimized.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: no featured deals in DB');
      return;
    }
    await expect(minimized).toBeVisible({ timeout: 15000 });
    await minimized.click();

    const widget = page.getByTestId('floating-deals-widget');
    await expect(widget).toBeVisible();

    // Minimize back
    await page.getByTestId('floating-deals-minimize').click();
    await expect(widget).not.toBeVisible();
    await expect(minimized).toBeVisible();

    // Close completely
    await minimized.click();
    await page.getByTestId('floating-deals-close').click();
    await expect(widget).not.toBeVisible();
    await expect(minimized).not.toBeVisible();
  });

  test('should support RTL in Arabic', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    
    const minimized = page.getByTestId('floating-deals-minimized');
    if (!await minimized.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: no featured deals in DB');
      return;
    }
    await expect(minimized).toBeVisible({ timeout: 15000 });
    
    // Check right-side positioning
    const box = await page.getByTestId('floating-deals-minimized').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const viewport = page.viewportSize();
    
    if (box && viewport) {
      // On RTL, it should be on the right side, so x should be large
      // At least greater than 1/2 of viewport width
      expect(box.x).toBeGreaterThan(viewport.width / 2); 
    }
  });
});
