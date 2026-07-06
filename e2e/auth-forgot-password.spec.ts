import { test, expect } from '@playwright/test';

test.describe('Auth Login & Forgot Password Journey', () => {
  test('should show correct labels, prevent layout overlaps on mobile, and support forgot password flow', async ({ page }) => {
    // 1. Set viewport to mobile size to test mobile layout overlap fix
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. Open /en/auth/login
    await page.goto('/en/auth/login');
    
    // Check that login page container is visible
    const loginPage = page.getByTestId('login-page');
    await expect(loginPage).toBeVisible({ timeout: 10000 });

    // Verify the label for email input is updated to show both email and phone number
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toHaveText(/Email Address or Phone Number/i);

    // Verify forgot password link is present
    const forgotPasswordLink = page.locator('a[href*="auth/forgot-password"]');
    await expect(forgotPasswordLink).toBeVisible();

    // Verify header logo and language toggles are visible (no overlap behind card)
    const headerLogo = page.locator('.auth-header');
    await expect(headerLogo).toBeVisible();

    // 3. Click forgot password link
    await Promise.all([
      forgotPasswordLink.click({ force: true }),
      page.waitForURL(/.*\/auth\/forgot-password.*/, { timeout: 10000 })
    ]);

    // Check that we are on forgot password page
    const forgotPageTitle = page.locator('h1');
    await expect(forgotPageTitle).toHaveText(/Forgot Password\?/i);

    // 4. Fill forgot password form with a dummy phone number
    const identifierInput = page.locator('input[name="identifier"]');
    await expect(identifierInput).toBeVisible({ timeout: 5000 });
    await identifierInput.fill('+201123456789');

    // Click submit and wait for success message
    const submitBtn = page.locator('button[type="submit"]');
    await Promise.all([
      submitBtn.click({ force: true }),
      page.waitForURL(/message=reset_sent/, { timeout: 10000 })
    ]);

    // Verify success banner appears
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible({ timeout: 5000 });
    await expect(successAlert).toHaveText(/we have sent a password reset link/i);

    // Verify link back to login works
    const backToLoginLink = page.locator('a[href*="auth/login"]');
    await Promise.all([
      backToLoginLink.click({ force: true }),
      page.waitForURL(/.*\/auth\/login.*/, { timeout: 10000 })
    ]);
  });
});
