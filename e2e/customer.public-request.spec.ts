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
    const testTitle = `[E2E_TEST] Browser public request ${timestamp}`;
    const testName = `[E2E_TEST] Browser Customer`;
    const testLocation = 'Cairo, Maadi';

    // 1. Open /en/start-request
    await page.goto('/en/start-request');
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible({ timeout: 10000 });
    // Click Skip if returning step is present
    const skipBtn = page.locator('#rc-skip-btn');
    const isSkipVisible = await skipBtn.isVisible().catch(() => false);
    if (isSkipVisible) {
      await skipBtn.click();
    }
    // 2. Select a category (electronics) — wizard step 1
    const categoryBtn = page.getByTestId('wizard-category-electronics');
    await expect(categoryBtn).toBeVisible({ timeout: 5000 });
    await categoryBtn.click();

    // 2.5 Select a subcategory and click follow up
    const subcategoryBtn = page.locator('button.wizard-subcategory-btn').first();
    await expect(subcategoryBtn).toBeVisible({ timeout: 5000 });
    await subcategoryBtn.click();

    const continueBtn = page.getByTestId('wizard-continue-details');
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await continueBtn.click();

    // 3. Fill product name — wizard step 2 (details)
    const titleInput = page.getByTestId('start-request-title-input');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(testTitle);

    // Fill required custom fields for mobiles
    const brandInput = page.locator('input.wizard-input-sm').nth(0);
    await brandInput.fill('Apple');

    const modelInput = page.locator('input.wizard-input-sm').nth(1);
    await modelInput.fill('iPhone 15 Pro Max');

    const storageSelect = page.locator('select.wizard-input-sm').nth(0);
    await storageSelect.selectOption('256gb');

    // Click Next on details step
    const nextDetailsBtn = page.getByTestId('wizard-next-details');
    await nextDetailsBtn.click();

    // 4. Fill location — wizard step 3
    // The location input has a testid we can reliably use
    const locationInput = page.getByTestId('wizard-location-input');
    await expect(locationInput).toBeVisible({ timeout: 5000 });
    await locationInput.fill(testLocation);

    // Click Next on location step
    const nextLocationBtn = page.getByTestId('wizard-next-location');
    await nextLocationBtn.click();

    // 5. Fill contact info — wizard step 4 (intake)
    const nameInput = page.getByTestId('start-request-full-name-input');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(testName);

    const phoneInput = page.getByTestId('start-request-phone-input');
    await phoneInput.fill(testPhone);

    // 6. Submit
    const submitBtn = page.getByTestId('start-request-submit');
    await submitBtn.click();

    // 7. Wait for redirect to dashboard with success code
    await expect(page).toHaveURL(/\/customer\/dashboard/, { timeout: 15000 });

    // 8. Check if tracking code appears in URL or on page
    const currentUrl = page.url();
    const urlParams = new URL(currentUrl).searchParams;
    const codeFromUrl = urlParams.get('code');

    if (codeFromUrl) {
      createdRequestCode = codeFromUrl;
      console.log(`[E2E] Created Request Code from URL: ${createdRequestCode}`);
    }

    // 9. Verify success banner or dashboard content
    // The dashboard should show a success message
    const successBanner = page.getByTestId('request-success-banner');
    const isSuccessBannerVisible = await successBanner.isVisible().catch(() => false);

    if (isSuccessBannerVisible) {
      // Capture request code from banner
      const codeElement = page.getByTestId('request-success-code');
      const codeText = await codeElement.textContent().catch(() => null);
      if (codeText && !createdRequestCode) {
        createdRequestCode = codeText.trim();
      }
      console.log(`[E2E] Request Code from banner: ${createdRequestCode}`);
    } else {
      console.log('[E2E] Success banner not visible — checking URL params only');
    }

    // Verify we landed on dashboard (not error page)
    await expect(page).toHaveURL(/\/customer\/dashboard/);

    // 10. If we have a tracking code, verify track-request works
    if (createdRequestCode) {
      await page.goto('/en/track-request');
      const trackPage = page.getByTestId('track-request-page');
      await expect(trackPage).toBeVisible({ timeout: 10000 });

      await page.getByTestId('track-code-input').fill(createdRequestCode);
      await page.getByTestId('track-phone-input').fill(testPhone);
      await page.getByTestId('track-submit').click();

      const resultView = page.getByTestId('track-result');
      await expect(resultView).toBeVisible({ timeout: 10000 });

      const statusBadge = page.getByTestId('track-result-status');
      await expect(statusBadge).toBeVisible();
    } else {
      console.log('[E2E] No request code captured — skipping track-request verification');
    }
  });

  test('should show returning customer account notice when using a registered phone number', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `[E2E_TEST] Returning customer request ${timestamp}`;
    const testName = `[E2E_TEST] Browser Customer`;
    const testPhone = `+201005044755`; // Registered customer phone number
    const testLocation = 'Cairo, Heliopolis';

    // 1. Open /en/start-request
    await page.goto('/en/start-request');
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible({ timeout: 10000 });
    // Click Skip if returning step is present
    const skipBtn = page.locator('#rc-skip-btn');
    const isSkipVisible = await skipBtn.isVisible().catch(() => false);
    if (isSkipVisible) {
      await skipBtn.click();
    }
    // 2. Select a category (electronics) and subcategory
    const categoryBtn = page.getByTestId('wizard-category-electronics');
    await expect(categoryBtn).toBeVisible({ timeout: 5000 });
    await categoryBtn.click();

    const subcategoryBtn = page.locator('button.wizard-subcategory-btn').first();
    await expect(subcategoryBtn).toBeVisible({ timeout: 5000 });
    await subcategoryBtn.click();

    const continueBtn = page.getByTestId('wizard-continue-details');
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await continueBtn.click();

    // 3. Fill product name
    const titleInput = page.getByTestId('start-request-title-input');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(testTitle);

    // Fill required custom fields for mobiles
    const brandInput = page.locator('input.wizard-input-sm').nth(0);
    await brandInput.fill('Apple');

    const modelInput = page.locator('input.wizard-input-sm').nth(1);
    await modelInput.fill('iPhone 15 Pro Max');

    const storageSelect = page.locator('select.wizard-input-sm').nth(0);
    await storageSelect.selectOption('256gb');

    const nextDetailsBtn = page.getByTestId('wizard-next-details');
    await nextDetailsBtn.click();

    // 4. Fill location
    const locationInput = page.getByTestId('wizard-location-input');
    await expect(locationInput).toBeVisible({ timeout: 5000 });
    await locationInput.fill(testLocation);

    const nextLocationBtn = page.getByTestId('wizard-next-location');
    await nextLocationBtn.click();

    // 5. Fill contact info (registered phone)
    const nameInput = page.getByTestId('start-request-full-name-input');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(testName);

    const phoneInput = page.getByTestId('start-request-phone-input');
    await phoneInput.fill(testPhone);

    // 6. Submit
    const submitBtn = page.getByTestId('start-request-submit');
    await submitBtn.click();

    // 7. Wait for redirect to dashboard with returning=true
    await expect(page).toHaveURL(/returning=true/, { timeout: 15000 });

    // 8. Verify the linked account banner exists and contains login link
    const loginLink = page.locator('a[href*="auth/login"]');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    
    // Clean up created request
    const currentUrl = page.url();
    const urlParams = new URL(currentUrl).searchParams;
    const code = urlParams.get('code');
    if (code) {
      console.log(`[E2E] Starting cleanup for returning request: ${code}`);
      await archiveTestRequest(code);
    }
  });
});
