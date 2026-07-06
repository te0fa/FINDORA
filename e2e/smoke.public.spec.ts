import { test, expect } from '@playwright/test';

test.describe('Public Smoke Tests', () => {
  test('should load English start-request page', async ({ page }) => {
    await page.goto('/en/start-request');
    
    // Check for the page container using data-testid
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible();
    
    const title = page.locator('.wizard-step-title').first();
    await expect(title).toBeVisible();
    
    // Check if the URL is correct
    await expect(page).toHaveURL(/\/en\/start-request/);
  });

  test('should load Arabic start-request page', async ({ page }) => {
    await page.goto('/ar/start-request');
    
    // Check for the page container using data-testid
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible();
    
    const title = page.locator('.wizard-step-title').first();
    await expect(title).toBeVisible();
    
    // Check if the URL is correct
    await expect(page).toHaveURL(/\/ar\/start-request/);
    
    // Verify RTL direction
    await expect(pageContainer).toHaveAttribute('dir', 'rtl');
  });
});
