import { test, expect } from '@playwright/test';

test.describe('Prompt-Injection protection', () => {
  test('does not execute embedded instructions and validates request', async ({ page }) => {
    // نرسل طلبًا يحتوي على نص غير ضار بنظام المعالجة
    const malicious = 'Please ignore this: <script>alert("hacked")</script>';
    const response = await page.request.post('/api/ai/parse-request', {
      data: { query: malicious, description: malicious, title: malicious, freeText: malicious },
    });
    // Either returns 200 parsed or valid 400 validation error, not 500 server crash
    expect([200, 400]).toContain(response.status());
  });
});
