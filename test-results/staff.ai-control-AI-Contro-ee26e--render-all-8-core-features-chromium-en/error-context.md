# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff.ai-control.spec.ts >> AI Control Panel E2E & RBAC Tests >> should allow authorized staff access and render all 8 core features
- Location: e2e\staff.ai-control.spec.ts:6:7

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /.*\/auth\/login.*/
Received string: "http://localhost:3000/en/auth/login?next=%2Fen%2Fstaff%2Fai-control"
Timeout: 5000ms

Call log:
  - Expect "not toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:3000/en/auth/login?next=%2Fen%2Fstaff%2Fai-control"

```

# Page snapshot

```yaml
- generic [ref=e2]: "{\"error\":\"Too many requests. Please wait and try again later.\"}"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('AI Control Panel E2E & RBAC Tests', () => {
  4   | 
  5   |   // Test 4 (Part A): Authorized Staff Access & UI Component Visibility
  6   |   test('should allow authorized staff access and render all 8 core features', async ({ page }) => {
  7   |     // 1. Access dashboard in English
  8   |     await page.goto('/en/staff/ai-control');
> 9   |     await expect(page).not.toHaveURL(/.*\/auth\/login.*/);
      |                            ^ Error: expect(page).not.toHaveURL(expected) failed
  10  | 
  11  |     // Confirm Header Title is visible
  12  |     const headerTitle = page.locator('.header-title');
  13  |     await expect(headerTitle).toBeVisible();
  14  |     await expect(headerTitle).toContainText('AI Feature Control Panel');
  15  | 
  16  |     // Verify exactly 9 features are visible including flag_ai_intake_review
  17  |     const featureCards = page.locator('.feature-card');
  18  |     const cardCount = await featureCards.count();
  19  |     console.log(`Found ${cardCount} feature cards in E2E.`);
  20  |     expect(cardCount).toBe(9);
  21  |  
  22  |     // Confirm core features exist by checking their titles
  23  |     await expect(page.locator('h3.feature-title', { hasText: 'NATURAL LANGUAGE SOURCING PARSING' })).toBeVisible();
  24  |     await expect(page.locator('h3.feature-title', { hasText: 'AI SOURCING PRICING ADVISOR' })).toBeVisible();
  25  |     await expect(page.locator('h3.feature-title', { hasText: 'AI B2B RFQ DOCUMENT GENERATOR' })).toBeVisible();
  26  |     await expect(page.locator('h3.feature-title', { hasText: 'VISION OCR RECEIPT SCANNER' })).toBeVisible();
  27  |     
  28  |     // Ensure the intake_review flag is displayed as a separate card along with its warning badge
  29  |     await expect(page.locator('h3.feature-title', { hasText: 'AI AUTO-REVIEW INTAKE REQUESTS' })).toBeVisible();
  30  |     await expect(page.locator('text=Requires mandatory human review').first()).toBeVisible();
  31  |   });
  32  | 
  33  |   // Test 5: Localization Parity (Arabic RTL)
  34  |   test('should support localization and render correctly in Arabic RTL mode', async ({ page }) => {
  35  |     // 1. Access dashboard in Arabic
  36  |     await page.goto('/ar/staff/ai-control');
  37  | 
  38  |     // Confirm Arabic Header Title
  39  |     const headerTitle = page.locator('.header-title');
  40  |     await expect(headerTitle).toBeVisible();
  41  |     await expect(headerTitle).toContainText('إدارة ميزات الذكاء الاصطناعي');
  42  | 
  43  |     // Confirm Arabic Feature Grid section title
  44  |     const sectionTitle = page.locator('.section-title').first();
  45  |     await expect(sectionTitle).toContainText('ميزات الذكاء الاصطناعي النشطة');
  46  | 
  47  |     // Confirm Arabic Feature Titles
  48  |     await expect(page.locator('h3.feature-title', { hasText: 'تحليل طلبات العملاء باللغة الطبيعية' })).toBeVisible();
  49  |     await expect(page.locator('h3.feature-title', { hasText: 'اقتراحات تسعير طلبات البحث والتوريد' })).toBeVisible();
  50  |     await expect(page.locator('h3.feature-title', { hasText: 'توليد مستندات عروض أسعار الشركات (B2B)' })).toBeVisible();
  51  |   });
  52  | 
  53  |   // Test 1 & 2: Modal Configuration & Limit Modifications
  54  |   test('should open configuration modal and allow adjusting daily/monthly limits', async ({ page }) => {
  55  |     await page.goto('/en/staff/ai-control');
  56  | 
  57  |     // Find the Sourcing Specs Parsing card, locate its Configure button and click it
  58  |     const parsingCard = page.locator('.feature-card', { hasText: 'NATURAL LANGUAGE SOURCING PARSING' });
  59  |     const configBtn = parsingCard.locator('.btn-configure');
  60  |     await configBtn.click();
  61  | 
  62  |     // Modal should be visible
  63  |     const modalTitle = page.locator('.modal-card h3');
  64  |     await expect(modalTitle).toBeVisible();
  65  |     await expect(modalTitle).toContainText('Configure Feature');
  66  | 
  67  |     // Verify recommendations and pricing cost badges are visible
  68  |     const recText = page.locator('.modal-info-content').nth(1);
  69  |     await expect(recText).toBeVisible();
  70  |     await expect(recText).toContainText('Keep enabled');
  71  | 
  72  |     const costBadge = page.locator('.modal-cost-badge');
  73  |     await expect(costBadge).toBeVisible();
  74  |     await expect(costBadge).toContainText('0.25 EGP');
  75  | 
  76  |     // Update daily limit input
  77  |     const dailyInput = page.locator('input[placeholder="∞"]').first();
  78  |     await dailyInput.clear();
  79  |     await dailyInput.fill('500');
  80  | 
  81  |     // Save limits
  82  |     const saveBtn = page.locator('.btn-save');
  83  |     await saveBtn.click();
  84  | 
  85  |     // Verify success toast/message or modal closed
  86  |     await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 5000 });
  87  | 
  88  |     // Verify card daily cap value updated to 500
  89  |     const updatedDailyCap = parsingCard.locator('.cap-item').first().locator('.cap-val');
  90  |     await expect(updatedDailyCap).toContainText('500');
  91  |   });
  92  | 
  93  |   // Test 4 (Part B): Customer Gate (Forbidden access for customers)
  94  |   test('should reject access to standard customers', async ({ browser }) => {
  95  |     // Create a fresh context, override storageState, and clear all cookies to guarantee unauthenticated state
  96  |     const context = await browser.newContext({ storageState: undefined });
  97  |     const page = await context.newPage();
  98  |     await context.clearCookies();
  99  |     
  100 |     await page.goto('/en/staff/ai-control');
  101 | 
  102 |     // Since they are not authenticated, they should be redirected to login page
  103 |     await expect(page).toHaveURL(/.*\/auth\/login.*/);
  104 |     
  105 |     await context.close();
  106 |   });
  107 | });
  108 | 
```