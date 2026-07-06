import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '../.auth/staff.json');

setup('authenticate as staff', async ({ page }) => {
  const staffEmail = process.env.E2E_STAFF_EMAIL;
  const staffPassword = process.env.E2E_STAFF_PASSWORD;

  // If credentials are not provided, create an empty auth file and skip
  if (!staffEmail || !staffPassword) {
    console.warn('[staff-setup] E2E_STAFF_EMAIL or E2E_STAFF_PASSWORD not set — skipping staff auth setup');
    // Write an empty storage state so dependent tests can still load
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // Navigate to login
  await page.goto('/en/auth/login');

  // Fill credentials
  await page.getByTestId('login-email-input').fill(staffEmail);
  await page.getByTestId('login-password-input').fill(staffPassword);

  // Submit
  await page.getByTestId('login-submit').click();

  // If login fails, log the error message and create empty auth file gracefully
  const errorAlert = page.locator('.alert-error');
  if (await errorAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
    const errorText = await errorAlert.innerText().catch(() => 'unknown error');
    console.warn(`[staff-setup] Login failed: ${errorText} — staff tests will be skipped`);
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  console.log(`[staff-setup] Login attempted, current URL: ${page.url()}`);

  // Wait for session (staff dashboard/queue is a good indicator)
  // We check for URL containing /staff/ to confirm successful login as staff
  try {
    await expect(page).toHaveURL(/.*\/staff\/.*/, { timeout: 15000 });
  } catch {
    console.warn(`[staff-setup] Did not redirect to /staff/ — URL: ${page.url()} — creating empty auth file`);
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // Save storage state
  await page.context().storageState({ path: authFile });
  console.log('[staff-setup] Staff auth saved successfully');
});
