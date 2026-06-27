import { test, expect } from '@playwright/test';

test.describe('Staff Content Management', () => {
  test('should display content management page for authorized staff', async ({ page }) => {
    // Authenticated via global setup
    await page.goto('/en/staff/marketing/content');
    
    await expect(page.getByTestId('staff-content-page')).toBeVisible();
    await expect(page.getByTestId('content-block-card').first()).toBeVisible();
    
    // Check specific forms
    await expect(page.getByTestId('content-homepage-hero-form')).toBeVisible();
    await expect(page.getByTestId('content-faq-form')).toBeVisible();
    
    // Check form inputs
    const titleInput = page.getByTestId('content-title-en-input');
    await expect(titleInput).toBeVisible();
  });
});
