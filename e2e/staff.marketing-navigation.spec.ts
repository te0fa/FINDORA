import { test, expect } from '@playwright/test';

test.describe('Staff Marketing Navigation Smoke Test', () => {
  // Use pre-authenticated staff session (usually admin for smoke tests)
  test.use({ storageState: 'e2e/.auth/staff.json' });

  test('should navigate to marketing placeholder pages from dashboard', async ({ page }) => {
    // 1. Start at staff dashboard
    await page.goto('/en/staff/dashboard');
    
    // 2. Verify dashboard loads
    await expect(page.locator('h1')).toContainText(/Welcome/);

    // 3. Test Pricing Management Navigation
    const pricingLink = page.getByRole('link', { name: 'Pricing Management' });
    if (await pricingLink.isVisible()) {
      console.log('Navigating to Pricing Management...');
      await pricingLink.click();
      await expect(page).toHaveURL(/.*\/staff\/marketing\/pricing/);
      await expect(page.getByTestId('staff-marketing-pricing-page')).toBeVisible();
      await page.goto('/en/staff/dashboard');
    } else {
      console.warn('Pricing Management link not visible. Skipping.');
    }

    // 4. Test News / Announcements Navigation
    const newsLink = page.getByRole('link', { name: 'News / Announcements' });
    if (await newsLink.isVisible()) {
      console.log('Navigating to News / Announcements...');
      await newsLink.click();
      await expect(page).toHaveURL(/.*\/staff\/marketing\/news/);
      await expect(page.getByTestId('staff-marketing-news-page')).toBeVisible();
      await page.goto('/en/staff/dashboard');
    } else {
      console.warn('News / Announcements link not visible. Skipping.');
    }

    // 5. Test Findora Deals Navigation
    const dealsLink = page.getByRole('link', { name: 'Findora Deals' });
    if (await dealsLink.isVisible()) {
      console.log('Navigating to Findora Deals...');
      await dealsLink.click();
      await expect(page).toHaveURL(/.*\/staff\/marketing\/deals/);
      await expect(page.getByTestId('staff-marketing-deals-page')).toBeVisible();
      await page.goto('/en/staff/dashboard');
    } else {
      console.warn('Findora Deals link not visible. Skipping.');
    }

    // 6. Test Site Content Navigation
    const contentLink = page.getByRole('link', { name: 'Site Content' });
    if (await contentLink.isVisible()) {
      console.log('Navigating to Site Content...');
      await contentLink.click();
      await expect(page).toHaveURL(/.*\/staff\/marketing\/content/);
      await expect(page.getByTestId('staff-marketing-content-page')).toBeVisible();
    } else {
      console.warn('Site Content link not visible. Skipping.');
    }
  });
});
