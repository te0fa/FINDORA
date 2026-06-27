# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\staff.auth.setup.ts >> authenticate as staff
- Location: e2e\auth\staff.auth.setup.ts:6:6

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('login-email-input')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{\"error\":\"Too many requests. Please wait and try again later.\"}"
```

# Test source

```ts
  1  | import { test as setup, expect } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | const authFile = path.join(__dirname, '../.auth/staff.json');
  5  | 
  6  | setup('authenticate as staff', async ({ page }) => {
  7  |   // Navigate to login
  8  |   await page.goto('/en/auth/login');
  9  | 
  10 |   // Fill credentials
> 11 |   await page.getByTestId('login-email-input').fill(process.env.E2E_STAFF_EMAIL!);
     |                                               ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  12 |   await page.getByTestId('login-password-input').fill(process.env.E2E_STAFF_PASSWORD!);
  13 | 
  14 |   // Submit
  15 |   await page.getByTestId('login-submit').click();
  16 | 
  17 |   // If login fails, log the error message
  18 |   const errorAlert = page.locator('.alert-error');
  19 |   if (await errorAlert.isVisible()) {
  20 |     const errorText = await errorAlert.innerText();
  21 |     console.error(`Login failed at URL ${page.url()} with error: ${errorText}`);
  22 |   } else {
  23 |     console.log(`Login attempted, current URL: ${page.url()}`);
  24 |   }
  25 | 
  26 |   // Wait for session (staff dashboard/queue is a good indicator)
  27 |   // We check for URL containing /staff/ to confirm successful login as staff
  28 |   await expect(page).toHaveURL(/.*\/staff\/.*/, { timeout: 15000 });
  29 | 
  30 |   // Save storage state
  31 |   await page.context().storageState({ path: authFile });
  32 | });
  33 | 
```