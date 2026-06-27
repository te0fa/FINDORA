import { test, expect } from '@playwright/test';
import { archiveTestRequest } from './helpers/db-cleanup';

test.describe('Public Customer Request Journey', () => {
  let createdRequestCode: string | null = null;

  test.afterAll(async () => {
    if (createdRequestCode) {
      console.log(`[E2E] Starting cleanup for request: ${createdRequestCode}`);
      await archiveTestRequest(createdRequestCode);
    }
  });

  test('should allow a guest to start and track a request', async ({ page }) => {
    const timestamp = Date.now();
    const testPhone = `+2010${String(timestamp).slice(-7)}`;
    const testEmail = `e2e+${timestamp}@example.com`;
    const testTitle = `[E2E_TEST] Browser public request ${timestamp}`;
    const testName = `[E2E_TEST] Browser Customer`;

    // 1. Open /en/start-request
    await page.goto('/en/start-request');
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible();

    // 2. Fill the form
    await page.getByTestId('start-request-full-name-input').fill(testName);
    await page.getByTestId('start-request-phone-input').fill(testPhone);
    await page.getByTestId('start-request-email-input').fill(testEmail);
    await page.getByTestId('start-request-title-input').fill(testTitle);

    // 3. Submit
    await page.getByTestId('start-request-submit').click();

    // 4. Wait for success view
    const successView = page.getByTestId('start-request-success');
    await expect(successView).toBeVisible({ timeout: 15000 });

    // 5. Capture request code
    const codeElement = page.getByTestId('start-request-code');
    const requestCode = await codeElement.textContent();
    expect(requestCode).toBeTruthy();
    expect(requestCode?.trim().length).toBeGreaterThan(0);
    
    createdRequestCode = requestCode?.trim() || null;
    console.log(`[E2E] Created Request Code: ${createdRequestCode}`);

    // 6. Open /en/track-request
    await page.goto('/en/track-request');
    const trackPage = page.getByTestId('track-request-page');
    await expect(trackPage).toBeVisible();

    // 7. Fill tracking form
    await page.getByTestId('track-code-input').fill(createdRequestCode!);
    await page.getByTestId('track-phone-input').fill(testPhone);

    // 8. Submit tracking
    await page.getByTestId('track-submit').click();

    // 9. Verify results
    const resultView = page.getByTestId('track-result');
    await expect(resultView).toBeVisible({ timeout: 10000 });
    
    const statusBadge = page.getByTestId('track-result-status');
    await expect(statusBadge).toBeVisible();
  });
});
