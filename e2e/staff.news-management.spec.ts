import { test, expect } from '@playwright/test';

test.describe('Staff News Management', () => {
  test.use({ storageState: 'e2e/.auth/staff.json' });

  test('should display news management page for authorized staff', async ({ page }) => {
    await page.goto('/en/staff/marketing/news');
    
    await expect(page.getByTestId('staff-marketing-news-page')).toBeVisible();
    
    // Check if at least one row exists or the empty message
    const rows = page.getByTestId('announcement-row');
    const count = await rows.count();
    
    if (count > 0) {
      await expect(rows.first()).toBeVisible();
      await expect(rows.first().getByTestId('announcement-active-toggle')).toBeVisible();
    }
    
    await expect(page.getByTestId('announcement-create-form')).toBeVisible();
  });
});
