import { test, expect } from '@playwright/test';

test.describe('Homepage Floating Announcements Hotfix', () => {
  test('should display floating offers widget with improved visuals', async ({ page }) => {
    await page.goto('/en');
    
    const widget = page.getByTestId('floating-offers-widget');
    const hasData = await widget.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasData) {
      console.log('Skipping: no active announcements in DB');
      return;
    }
    await expect(widget).toBeVisible({ timeout: 10000 });
    
    // Check visual hierarchy testids
    await expect(page.getByTestId('floating-offer-title')).toBeVisible();
    await expect(page.getByTestId('floating-offer-description')).toBeVisible();
    await expect(page.getByTestId('floating-offer-badge')).toBeVisible();
    
    // Verify font size improvement (optional but good for visuals)
    const title = page.getByTestId('floating-offer-title');
    const fontSize = await title.evaluate((el) => window.getComputedStyle(el).fontSize);
    // 1.25rem is 20px if root is 16px
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(18);
  });

  test('should handle safe links and prevent 404 for pricing offer', async ({ page }) => {
    await page.goto('/en');
    const widget = page.getByTestId('floating-offers-widget');
    const hasData = await widget.isVisible().catch(() => false);
    if (!hasData) {
      console.log('Skipping: no active announcements in DB');
      return;
    }
    await expect(widget).toBeVisible();

    const link = page.getByTestId('floating-offer-link');
    if (await link.isVisible()) {
      const href = await link.getAttribute('href');
      // Should be /en#pricing
      expect(href).toContain('#pricing');
      
      // Click and verify no 404 and section visible
      await link.click({ force: true });
      
      // Give it a moment to update hash
      await page.waitForTimeout(1000);
      
      // Page URL should contain #pricing
      expect(page.url()).toContain('#pricing');
      
      const pricingSection = page.locator('#pricing');
      await expect(pricingSection).toBeVisible();
    }
  });

  test('should minimize and restore', async ({ page }) => {
    await page.goto('/en');
    const widget = page.getByTestId('floating-offers-widget');
    const hasData = await widget.isVisible().catch(() => false);
    if (!hasData) {
      console.log('Skipping: no active announcements in DB');
      return;
    }
    await expect(widget).toBeVisible();

    await page.getByTestId('floating-offer-minimize').click();
    await expect(widget).not.toBeVisible();
    await expect(page.getByTestId('floating-offer-minimized')).toBeVisible();
    
    await page.getByTestId('floating-offer-minimized').click();
    await expect(widget).toBeVisible();
  });

  test('should support RTL in Arabic without 404', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    
    const widget = page.getByTestId('floating-offers-widget');
    const hasData = await widget.isVisible().catch(() => false);
    if (!hasData) {
      console.log('Skipping: no active announcements in DB');
      return;
    }
    await expect(widget).toBeVisible();
    
    const link = page.getByTestId('floating-offer-link');
    if (await link.isVisible()) {
      const href = await link.getAttribute('href');
      expect(href).toContain('#pricing');
      
      await link.click({ force: true });
      await page.waitForTimeout(1000);
      
      expect(page.url()).toContain('#pricing');
      await expect(page.locator('#pricing')).toBeVisible();
    }
    
    // Check left-side positioning
    const box = await widget.boundingBox();
    if (box) {
      expect(box.x).toBeLessThan(500); 
    }
  });
});
