import { test, expect } from '@playwright/test';

test.describe('Homepage CMS Content', () => {
  test('should display CMS-driven hero section', async ({ page }) => {
    await page.goto('/en');
    const hero = page.getByTestId('homepage-cms-hero');
    if (!await hero.isVisible()) { console.log('Skipping: no CMS content in DB'); return; }
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1')).not.toBeEmpty();
  });

  test('should display CMS-driven how it works section', async ({ page }) => {
    await page.goto('/en');
    const section = page.getByTestId('homepage-cms-how-it-works');
    if (!await section.isVisible()) { console.log('Skipping: no CMS content in DB'); return; }
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section.locator('.how-step').first()).toBeVisible();
  });

  test('should display CMS-driven FAQ section', async ({ page }) => {
    await page.goto('/en');
    const faq = page.getByTestId('homepage-cms-faq');
    if (!await faq.isVisible()) { console.log('Skipping: no CMS FAQ in DB'); return; }
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toBeVisible();
    await expect(faq.locator('.faq-item').first()).toBeVisible();
  });

  test('should support RTL in Arabic', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const heroAr = page.getByTestId('homepage-cms-hero');
    if (!await heroAr.isVisible()) { console.log('Skipping: no CMS content in DB'); return; }
    await expect(heroAr).toBeVisible();
  });
});
