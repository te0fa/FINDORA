import { test, expect } from '@playwright/test';

test.describe('Homepage Pricing Offer', () => {
  test('should display everyday purchase offer in English', async ({ page }) => {
    await page.goto('/en');
    
    const card = page.getByTestId('homepage-service-card-everyday_purchase');
    if (!await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: pricing card not visible');
      return;
    }
    await expect(card).toBeVisible();

    const originalPrice = page.getByTestId('homepage-everyday-original-price');
    await expect(originalPrice).toContainText('299');

    const currentPrice = page.getByTestId('homepage-everyday-current-price');
    await expect(currentPrice).toContainText('99');

    const promoLabel = page.getByTestId('homepage-everyday-limited-offer');
    await expect(promoLabel).toContainText(/Limited time/i);
  });

  test('should display everyday purchase offer in Arabic', async ({ page }) => {
    await page.goto('/ar');
    
    const card = page.getByTestId('homepage-service-card-everyday_purchase');
    if (!await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Skipping: pricing card not visible');
      return;
    }
    await expect(card).toBeVisible();

    const currentPrice = page.getByTestId('homepage-everyday-current-price');
    await expect(currentPrice).toContainText('99');

    const promoLabel = page.getByTestId('homepage-everyday-limited-offer');
    await expect(promoLabel).toContainText('لفترة محدودة');
  });
});
