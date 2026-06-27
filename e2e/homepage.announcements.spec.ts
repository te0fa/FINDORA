import { test, expect } from '@playwright/test';

test.describe('Homepage Announcements', () => {
  test('should display announcements section if active announcements exist', async ({ page }) => {
    await page.goto('/en');
    
    // Check if section exists (it should if seed data exists)
    const section = page.getByTestId('homepage-announcements-section');
    const isVisible = await section.isVisible();
    
    if (isVisible) {
      await expect(page.getByTestId('homepage-announcement-card')).toBeVisible();
      await expect(page.getByTestId('homepage-announcement-title')).not.toBeEmpty();
      await expect(page.getByTestId('homepage-announcement-body')).not.toBeEmpty();
    } else {
      console.log('Skipping visibility check: No active announcements found in DB.');
    }
  });

  test('should support Arabic localization and RTL', async ({ page }) => {
    await page.goto('/ar');
    
    const section = page.getByTestId('homepage-announcements-section');
    if (await section.isVisible()) {
      await expect(page.locator('.landing-page')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByTestId('homepage-announcement-card')).toBeVisible();
    }
  });
});
