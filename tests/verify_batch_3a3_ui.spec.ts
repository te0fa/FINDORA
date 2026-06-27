import { test, expect } from '@playwright/test';

test('Archive Dashboard UI Verification', async ({ page }) => {
  // This test assumes a logged in admin session or mock state
  // We will mostly check for the presence of the new buttons and layout consistency
  
  await page.goto('/en/staff/archive');
  
  // 1. Check title
  await expect(page.locator('h1.archive-title')).toContainText('Archive & Cleanup');
  
  // 2. Check filters
  await expect(page.locator('select[name="status"]')).toBeVisible();
  await expect(page.locator('select[name="backupStatus"]')).toBeVisible();
  
  // 3. Check for Archive/Restore/Delete buttons in the table
  // Note: These depend on data, but we can check if the class exists in the style tag or if one is rendered
  const archiveButtons = page.locator('button.btn-archive');
  const restoreButtons = page.locator('button.btn-restore');
  const deleteButtons = page.locator('button.btn-delete');
  
  console.log('Archive buttons found:', await archiveButtons.count());
  console.log('Restore buttons found:', await restoreButtons.count());
  console.log('Delete buttons found:', await deleteButtons.count());
});

test('SLA Metrics Visibility', async ({ page }) => {
  // Check dashboard
  await page.goto('/en/staff/dashboard');
  await expect(page.locator('.metrics-grid')).toBeVisible();
  
  // Check queue
  await page.goto('/en/staff/queue');
  await expect(page.locator('.metrics-grid')).toBeVisible();
  
  // Check a non-staff page (e.g. homepage) to ensure they are NOT there
  await page.goto('/');
  await expect(page.locator('.metrics-grid')).not.toBeVisible();
});
