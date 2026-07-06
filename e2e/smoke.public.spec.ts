import { test, expect } from '@playwright/test';

test.describe('Public Smoke Tests', () => {
  test('should load English start-request page', async ({ page }) => {
    await page.goto('/en/start-request');

    // Wait for the page container — present in both skeleton and hydrated states
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible({ timeout: 15000 });

    // Wait for full React hydration — the wizard title only renders after
    // mounted=true, which confirms the component has fully hydrated and the
    // feature-flag loading state has been initialised.
    const wizardTitle = page.getByRole('heading', { name: /Find What You Need/i });
    await expect(wizardTitle).toBeVisible({ timeout: 15000 });

    // The step title appears below the main h1 once the category step renders
    const stepTitle = page.getByRole('heading', { name: /What are you looking for\?/i });
    await expect(stepTitle).toBeVisible({ timeout: 10000 });

    // URL check
    await expect(page).toHaveURL(/\/en\/start-request/);
  });

  test('should load Arabic start-request page', async ({ page }) => {
    await page.goto('/ar/start-request');

    // Wait for the page container
    const pageContainer = page.getByTestId('start-request-page');
    await expect(pageContainer).toBeVisible({ timeout: 15000 });

    // Wait for full hydration (Arabic wizard title)
    const wizardTitle = page.getByRole('heading', { name: /ابحث عن ما تريد/i });
    await expect(wizardTitle).toBeVisible({ timeout: 15000 });

    // The step title in Arabic
    const stepTitle = page.getByRole('heading', { name: /ماذا تبحث عنه/i });
    await expect(stepTitle).toBeVisible({ timeout: 10000 });

    // URL check
    await expect(page).toHaveURL(/\/ar\/start-request/);

    // Verify RTL direction — re-query the container fresh after hydration
    // to avoid any stale reference from the skeleton render
    const hydratedContainer = page.getByTestId('start-request-page');
    await expect(hydratedContainer).toHaveAttribute('dir', 'rtl');
  });
});
