import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Manually load .env.local for workers
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // navigationTimeout inherits from the 90 s test timeout — do not cap it
    // shorter or slow SSR pages will fail when the dev server is under load.
  },

  /* Per-test timeout — journey tests gate on sessionStorage (up to 15 s for
   * Supabase feature flags), then fill multi-step forms, make API calls, and
   * navigate. 30 s (Playwright default) is too tight; 90 s is appropriate. */
  timeout: 90000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'staff-setup',
      testMatch: /staff\.auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'staff-authenticated',
      testMatch: /staff\.(?!auth\.setup)\..*/,
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'en-US',
        storageState: 'e2e/.auth/staff.json',
      },
      dependencies: ['staff-setup'],
    },
    {
      name: 'chromium-en',
      testIgnore: /staff\..*/,
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'en-US',
      },
    },
    {
      name: 'chromium-ar',
      testIgnore: /staff\..*/,
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'ar-EG',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
