import { test, expect } from '@playwright/test';

test.describe('Staff Deals Management', () => {
  test.use({ storageState: 'e2e/.auth/staff.json' });

  test('should display deals management page and delete button', async ({ page }) => {
    await page.goto('/en/staff/marketing/deals');
    
    await expect(page.getByTestId('staff-deals-page')).toBeVisible();
    
    const rows = page.getByTestId('deal-row');
    const count = await rows.count();
    
    if (count > 0) {
      await expect(rows.first()).toBeVisible();
      await expect(rows.first().getByTestId('deal-active-toggle')).toBeVisible();
      await expect(rows.first().getByTestId('deal-delete-button')).toBeVisible();
    }
    
    await expect(page.getByTestId('deal-create-form')).toBeVisible();
  });
});
