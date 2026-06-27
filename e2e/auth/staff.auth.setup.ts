import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/staff.json');

setup('authenticate as staff', async ({ page }) => {
  // Navigate to login
  await page.goto('/en/auth/login');

  // Fill credentials
  await page.getByTestId('login-email-input').fill(process.env.E2E_STAFF_EMAIL!);
  await page.getByTestId('login-password-input').fill(process.env.E2E_STAFF_PASSWORD!);

  // Submit
  await page.getByTestId('login-submit').click();

  // If login fails, log the error message
  const errorAlert = page.locator('.alert-error');
  if (await errorAlert.isVisible()) {
    const errorText = await errorAlert.innerText();
    console.error(`Login failed at URL ${page.url()} with error: ${errorText}`);
  } else {
    console.log(`Login attempted, current URL: ${page.url()}`);
  }

  // Wait for session (staff dashboard/queue is a good indicator)
  // We check for URL containing /staff/ to confirm successful login as staff
  await expect(page).toHaveURL(/.*\/staff\/.*/, { timeout: 15000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
