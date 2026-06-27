import { test, expect } from '@playwright/test';

test.describe('AI Control Panel E2E & RBAC Tests', () => {

  // Test 4 (Part A): Authorized Staff Access & UI Component Visibility
  test('should allow authorized staff access and render all 8 core features', async ({ page }) => {
    // 1. Access dashboard in English
    await page.goto('/en/staff/ai-control');
    await expect(page).not.toHaveURL(/.*\/auth\/login.*/);

    // Confirm Header Title is visible
    const headerTitle = page.locator('.header-title');
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText('AI Feature Control Panel');

    // Verify exactly 9 features are visible including flag_ai_intake_review
    const featureCards = page.locator('.feature-card');
    const cardCount = await featureCards.count();
    console.log(`Found ${cardCount} feature cards in E2E.`);
    expect(cardCount).toBe(9);
 
    // Confirm core features exist by checking their titles
    await expect(page.locator('h3.feature-title', { hasText: 'NATURAL LANGUAGE SOURCING PARSING' })).toBeVisible();
    await expect(page.locator('h3.feature-title', { hasText: 'AI SOURCING PRICING ADVISOR' })).toBeVisible();
    await expect(page.locator('h3.feature-title', { hasText: 'AI B2B RFQ DOCUMENT GENERATOR' })).toBeVisible();
    await expect(page.locator('h3.feature-title', { hasText: 'VISION OCR RECEIPT SCANNER' })).toBeVisible();
    
    // Ensure the intake_review flag is displayed as a separate card along with its warning badge
    await expect(page.locator('h3.feature-title', { hasText: 'AI AUTO-REVIEW INTAKE REQUESTS' })).toBeVisible();
    await expect(page.locator('text=Requires mandatory human review').first()).toBeVisible();
  });

  // Test 5: Localization Parity (Arabic RTL)
  test('should support localization and render correctly in Arabic RTL mode', async ({ page }) => {
    // 1. Access dashboard in Arabic
    await page.goto('/ar/staff/ai-control');

    // Confirm Arabic Header Title
    const headerTitle = page.locator('.header-title');
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText('إدارة ميزات الذكاء الاصطناعي');

    // Confirm Arabic Feature Grid section title
    const sectionTitle = page.locator('.section-title').first();
    await expect(sectionTitle).toContainText('ميزات الذكاء الاصطناعي النشطة');

    // Confirm Arabic Feature Titles
    await expect(page.locator('h3.feature-title', { hasText: 'تحليل طلبات العملاء باللغة الطبيعية' })).toBeVisible();
    await expect(page.locator('h3.feature-title', { hasText: 'اقتراحات تسعير طلبات البحث والتوريد' })).toBeVisible();
    await expect(page.locator('h3.feature-title', { hasText: 'توليد مستندات عروض أسعار الشركات (B2B)' })).toBeVisible();
  });

  // Test 1 & 2: Modal Configuration & Limit Modifications
  test('should open configuration modal and allow adjusting daily/monthly limits', async ({ page }) => {
    await page.goto('/en/staff/ai-control');

    // Find the Sourcing Specs Parsing card, locate its Configure button and click it
    const parsingCard = page.locator('.feature-card', { hasText: 'NATURAL LANGUAGE SOURCING PARSING' });
    const configBtn = parsingCard.locator('.btn-configure');
    await configBtn.click();

    // Modal should be visible
    const modalTitle = page.locator('.modal-card h3');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('Configure Feature');

    // Verify recommendations and pricing cost badges are visible
    const recText = page.locator('.modal-info-content').nth(1);
    await expect(recText).toBeVisible();
    await expect(recText).toContainText('Keep enabled');

    const costBadge = page.locator('.modal-cost-badge');
    await expect(costBadge).toBeVisible();
    await expect(costBadge).toContainText('0.25 EGP');

    // Update daily limit input
    const dailyInput = page.locator('input[placeholder="∞"]').first();
    await dailyInput.clear();
    await dailyInput.fill('500');

    // Save limits
    const saveBtn = page.locator('.btn-save');
    await saveBtn.click();

    // Verify success toast/message or modal closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // Verify card daily cap value updated to 500
    const updatedDailyCap = parsingCard.locator('.cap-item').first().locator('.cap-val');
    await expect(updatedDailyCap).toContainText('500');
  });

  // Test 4 (Part B): Customer Gate (Forbidden access for customers)
  test('should reject access to standard customers', async ({ browser }) => {
    // Create a fresh context, override storageState, and clear all cookies to guarantee unauthenticated state
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await context.clearCookies();
    
    await page.goto('/en/staff/ai-control');

    // Since they are not authenticated, they should be redirected to login page
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
    
    await context.close();
  });
});
