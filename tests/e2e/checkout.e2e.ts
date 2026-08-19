import { test, expect } from '@playwright/test';

test.describe('Checkout flow with locking', () => {
  test('prevents duplicate checkout submissions', async ({ page }) => {
    // 1️⃣ افتح صفحة Checkout
    await page.goto('/checkout');
    // زر "إتمام الشراء"
    const checkoutBtn = page.locator('[data-testid="checkout-btn"]');
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    
    // 2️⃣ ضغط سريع
    await checkoutBtn.click();
    
    // 3️⃣ تحقق من أن الزر أصبح معطلاً أو قيد المعالجة
    await expect(checkoutBtn).toBeDisabled();
  });
});
