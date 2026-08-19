import { test, expect } from '@playwright/test';

test.describe('OTP protected history lookup', () => {
  test('rejects request without OTP', async ({ page }) => {
    // استدعاء مباشر للـ API بدلاً من UI لتسريع الاختبار
    const response = await page.request.post('/api/requests/history-lookup', {
      data: { phone: '+201000000000' },
    });
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('OTP verification required');
  });

  test('rejects request with invalid OTP', async ({ page }) => {
    const response = await page.request.post('/api/requests/history-lookup', {
      data: { phone: '+201000000000', otpToken: '000000' },
    });
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Invalid or expired OTP');
  });
});
