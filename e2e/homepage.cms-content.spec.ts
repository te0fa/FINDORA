import { test, expect } from '@playwright/test';

test.describe('Homepage CMS Content', () => {
  test('should display CMS-driven hero section', async ({ page }) => {
    await page.goto('/en');
    const hero = page.getByTestId('homepage-cms-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1')).not.toBeEmpty();
  });

  test('should display CMS-driven how it works section', async ({ page }) => {
    await page.goto('/en');
    const section = page.getByTestId('homepage-cms-how-it-works');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section.locator('.how-step').first()).toBeVisible();
  });

  test('should display CMS-driven FAQ section', async ({ page }) => {
    await page.goto('/en');
    const section = page.getByTestId('homepage-cms-faq');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section.locator('.faq-item').first()).toBeVisible();
  });

  test('should support RTL in Arabic', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('homepage-cms-hero')).toBeVisible();
  });
});
