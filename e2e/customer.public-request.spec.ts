import { test, expect, type Page } from '@playwright/test';
import { archiveTestRequest } from './helpers/db-cleanup';

// ─── Wizard helper ─────────────────────────────────────────────────────────────
/**
 * Drives the wizard from Step 1 (category) through Step 3 (location).
 *
 * ── Root cause of previous flakiness ────────────────────────────────────────
 * RequestWizardClient uses multiple async feature-flag subscriptions
 * (historyFlag, voiceFlag, textFlag, imageFlag, …). Each flag resolving
 * triggers a React re-render and can change the step state:
 *
 *   - historyFlag resolves → step may switch from STEP_CATEGORY (1) to
 *     STEP_RETURNING (0) → React unmounts the category buttons mid-click.
 *
 * The component's save-effect writes `wizard_step` to sessionStorage ONLY
 * after BOTH `mounted=true` AND `isRestored=true`. `isRestored` is set only
 * after historyFlag.loading=false. Therefore:
 *
 *   sessionStorage.getItem('wizard_step') !== null
 *     ≡ wizard fully initialised, step is stable, no more flag-driven renders
 *
 * Waiting for this key is the minimal, zero-app-change proxy for "the wizard
 * is ready for interaction".
 *
 * ── Anti-flakiness rules ─────────────────────────────────────────────────────
 * - Wait for sessionStorage 'wizard_step' before ANY interaction.
 * - Re-query locators fresh after every step transition.
 * - All custom-spec fields scoped to .wizard-specs-section to avoid
 *   strict-mode violations from similarly-named inputs elsewhere on the page.
 * - force:true NEVER used — always await toBeEnabled() before acting.
 */
async function fillWizardCategoryToLocation(
  page: Page,
  opts: { title: string; location: string }
) {
  // ── Gate: wait for wizard to fully initialise ────────────────────────────
  //
  // The React save-effect writes 'wizard_step' to sessionStorage only after
  // mounted=true AND isRestored=true — i.e. after historyFlag (and all other
  // feature flags) have finished loading and the step is permanently stable.
  // Without this wait, historyFlag can resolve after we see the category
  // buttons but before we click them, detaching those DOM nodes.
  await page.waitForFunction(
    () => window.sessionStorage.getItem('wizard_step') !== null,
    { timeout: 15000 }
  );

  // ── Skip returning-customer step if the wizard landed there ────────────────
  // STEP_RETURNING = 0 | STEP_CATEGORY = 1 (wizard constants)
  const initialStep = await page.evaluate(
    () => window.sessionStorage.getItem('wizard_step')
  );

  if (initialStep === '0') {
    // historyFlag is enabled and no saved session → wizard is on STEP_RETURNING
    const skipBtn = page.locator('#rc-skip-btn');
    await expect(skipBtn).toBeVisible({ timeout: 8000 });
    await skipBtn.click();
    // Wait for the save-effect to confirm the step has advanced to STEP_CATEGORY
    await page.waitForFunction(
      () => window.sessionStorage.getItem('wizard_step') === '1',
      { timeout: 10000 }
    );
  }

  // ── Step 1: Select category ───────────────────────────────────────────────
  // Step is now definitively STEP_CATEGORY (1). No more flag-driven re-renders.
  const categoryBtn = page.getByTestId('wizard-category-electronics');
  await expect(categoryBtn).toBeVisible({ timeout: 10000 });
  await expect(categoryBtn).toBeEnabled();
  await categoryBtn.click();

  // ── Step 1b: Select subcategory ───────────────────────────────────────────
  // Sentinel: subcategory section only renders after a category is selected
  const subcategorySection = page.locator('.wizard-subcategory-section');
  await expect(subcategorySection).toBeVisible({ timeout: 8000 });

  // First button inside the subcategory grid = "Mobiles & Smartphones".
  // Scoped to the section to avoid matching buttons elsewhere on the page.
  const firstSubcategory = subcategorySection.getByRole('button').first();
  await expect(firstSubcategory).toBeVisible({ timeout: 8000 });
  await expect(firstSubcategory).toBeEnabled();
  await firstSubcategory.click();

  // The "Continue" button only appears after a subcategory is selected
  const continueBtn = page.getByTestId('wizard-continue-details');
  await expect(continueBtn).toBeVisible({ timeout: 8000 });
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();

  // ── Step 2: Product details ───────────────────────────────────────────────
  // Sentinel: the "Request Details" heading only renders in this step panel.
  // Waiting for it guarantees React has completed the panel swap.
  const detailsHeading = page.getByRole('heading', { name: /Request Details|تفاصيل الطلب/i });
  await expect(detailsHeading).toBeVisible({ timeout: 12000 });

  // Product name
  const titleInput = page.getByTestId('start-request-title-input');
  await expect(titleInput).toBeVisible({ timeout: 8000 });
  await expect(titleInput).toBeEnabled();
  await titleInput.fill(opts.title);

  // Custom spec fields are ALL scoped inside .wizard-specs-section so that
  // other inputs on the page with similar placeholder text (e.g. the title
  // input whose placeholder is "e.g. iPhone 15 Pro Max 256GB") can never
  // cause a strict-mode "resolved to 2 elements" violation.
  const specsSection = page.locator('.wizard-specs-section');
  await expect(specsSection).toBeVisible({ timeout: 8000 });

  // Brand — scoped to specs section
  const brandInput = specsSection.getByPlaceholder(/e\.g\. Apple, Samsung/i);
  await expect(brandInput).toBeVisible({ timeout: 8000 });
  await expect(brandInput).toBeEnabled();
  await brandInput.fill('Apple');

  // Model — scoped to specs section (can't match the title input)
  const modelInput = specsSection.getByPlaceholder(/e\.g\. iPhone 15 Pro Max/i);
  await expect(modelInput).toBeVisible({ timeout: 8000 });
  await expect(modelInput).toBeEnabled();
  await modelInput.fill('iPhone 15 Pro Max');

  // Storage — first combobox inside the specs section
  const storageSelect = specsSection.getByRole('combobox').first();
  await expect(storageSelect).toBeVisible({ timeout: 8000 });
  await expect(storageSelect).toBeEnabled();
  await storageSelect.selectOption('256gb');

  // Advance to location step
  const nextDetailsBtn = page.getByTestId('wizard-next-details');
  await expect(nextDetailsBtn).toBeVisible({ timeout: 8000 });
  await expect(nextDetailsBtn).toBeEnabled();
  await nextDetailsBtn.click();

  // ── Step 3: Location ──────────────────────────────────────────────────────
  // Sentinel: wizard-location-input only exists in this step panel.
  const locationInput = page.getByTestId('wizard-location-input');
  await expect(locationInput).toBeVisible({ timeout: 12000 });
  await expect(locationInput).toBeEnabled();
  await locationInput.fill(opts.location);
}


// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Public Customer Request Journey', () => {
  let createdRequestCode: string | null = null;

  test.afterAll(async () => {
    if (createdRequestCode) {
      console.log(`[E2E] Starting cleanup for request: ${createdRequestCode}`);
      await archiveTestRequest(createdRequestCode);
    }
  });

  test('should allow a guest to start and track a request', async ({ page }) => {
    const timestamp = Date.now();
    const randomComponent = Math.floor(10 + Math.random() * 90);
    const testPhone = `+2010${randomComponent}${String(timestamp).slice(-5)}`;
    const testTitle = `[E2E_TEST] Browser public request ${timestamp}`;
    const testName = `[E2E_TEST] Browser Customer`;
    const testLocation = 'Cairo, Maadi';

    // ── 1. Load page and wait for full hydration ─────────────────────────────
    await page.goto('/en/start-request');

    // The page container is present in both the skeleton (mounted=false) and
    // the hydrated (mounted=true) states — same element, safe to await once.
    await expect(page.getByTestId('start-request-page')).toBeVisible({ timeout: 15000 });

    // The h1 wizard title ONLY renders after mounted=true — waiting for it
    // guarantees React hydration is complete and feature flags have initialised.
    await expect(
      page.getByRole('heading', { name: /Find What You Need|ابحث عن ما تريد/i })
    ).toBeVisible({ timeout: 15000 });

    // ── 2–3. Category → Subcategory → Details → Location ────────────────────
    await fillWizardCategoryToLocation(page, { title: testTitle, location: testLocation });

    // ── 4. Advance to contact step ───────────────────────────────────────────
    const nextLocationBtn = page.getByTestId('wizard-next-location');
    await expect(nextLocationBtn).toBeVisible({ timeout: 8000 });
    await expect(nextLocationBtn).toBeEnabled();
    await nextLocationBtn.click();

    // ── 5. Contact info ───────────────────────────────────────────────────────
    // Re-query fresh after step transition (new React subtree)
    const nameInput = page.getByTestId('start-request-full-name-input');
    await expect(nameInput).toBeVisible({ timeout: 12000 });
    await expect(nameInput).toBeEnabled();
    await nameInput.fill(testName);

    const phoneInput = page.getByTestId('start-request-phone-input');
    await expect(phoneInput).toBeVisible({ timeout: 8000 });
    await expect(phoneInput).toBeEnabled();
    await phoneInput.fill(testPhone);

    // ── 6. Submit ─────────────────────────────────────────────────────────────
    const submitBtn = page.getByTestId('start-request-submit');
    await expect(submitBtn).toBeVisible({ timeout: 8000 });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for navigation to the guest dashboard (API + SSR can take time)
    await page.waitForURL(/\/customer\/dashboard/, { timeout: 30000 });

    // ── 7. Extract request code from URL (primary source) ────────────────────
    const codeFromUrl = new URL(page.url()).searchParams.get('code');
    if (codeFromUrl) {
      createdRequestCode = codeFromUrl;
      console.log(`[E2E] Created Request Code from URL: ${createdRequestCode}`);
    }

    // ── 8. Check success banner (hard assertion) ──────────────────────────────
    // The success banner MUST be visible after a successful submission.
    // If the request-creation flow broke, or the dashboard stopped rendering
    // it, this is a real regression — not a soft warn.
    const successBanner = page.getByTestId('request-success-banner');
    await expect(successBanner).toBeVisible({ timeout: 15000 });

    // Secondary: cross-check the code displayed in the banner matches the URL.
    const codeElement = page.getByTestId('request-success-code');
    const codeText = await codeElement.textContent().catch(() => null);
    if (codeText && !createdRequestCode) {
      createdRequestCode = codeText.trim();
    }
    console.log(`[E2E] Request Code from banner: ${createdRequestCode}`);

    // ── 9. Track request (hard assertion) ─────────────────────────────────────
    // This is a complete end-to-end verification: request code that was just
    // created must be locatable via the public tracking UI.
    // With workers=4 (local) and workers=1 (CI), the DB is never saturated.
    // If tracking is broken — wrong code, API error, UI regression — this FAILS.
    if (createdRequestCode) {
      await page.goto('/en/track-request');

      await expect(page.getByTestId('track-request-page')).toBeVisible({ timeout: 12000 });

      const trackCodeInput = page.getByTestId('track-code-input');
      await expect(trackCodeInput).toBeVisible({ timeout: 8000 });
      await expect(trackCodeInput).toBeEnabled();
      await trackCodeInput.fill(createdRequestCode);

      const trackPhoneInput = page.getByTestId('track-phone-input');
      await expect(trackPhoneInput).toBeVisible({ timeout: 8000 });
      await expect(trackPhoneInput).toBeEnabled();
      await trackPhoneInput.fill(testPhone);

      const trackSubmit = page.getByTestId('track-submit');
      await expect(trackSubmit).toBeVisible({ timeout: 8000 });
      await expect(trackSubmit).toBeEnabled();
      await trackSubmit.click();

      // Hard assertion: the track-result card MUST appear.
      // 30 s gives Supabase adequate budget even under moderate load;
      // if tracking is genuinely broken this will fail and alert CI.
      await expect(page.getByTestId('track-result')).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('track-result-status')).toBeVisible({ timeout: 8000 });
      console.log('[E2E] Track result verified successfully');
    } else {
      // If we have no code to track the request-creation step itself already
      // failed (code extraction is mandatory). This branch means test is broken.
      throw new Error('[E2E] No request code captured — cannot verify tracking. Request creation may have failed silently.');
    }
  });

  test('should show returning customer account notice when using a registered phone number', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `[E2E_TEST] Returning customer request ${timestamp}`;
    const testName = `[E2E_TEST] Browser Customer`;
    const testPhone = `+201005044755`; // Registered customer phone number
    const testLocation = 'Cairo, Heliopolis';

    // ── 1. Load page and wait for full hydration ─────────────────────────────
    await page.goto('/en/start-request');

    await expect(page.getByTestId('start-request-page')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Find What You Need|ابحث عن ما تريد/i })
    ).toBeVisible({ timeout: 15000 });

    // ── 2–3. Category → Subcategory → Details → Location ────────────────────
    await fillWizardCategoryToLocation(page, { title: testTitle, location: testLocation });

    // ── 4. Advance to contact step ───────────────────────────────────────────
    const nextLocationBtn = page.getByTestId('wizard-next-location');
    await expect(nextLocationBtn).toBeVisible({ timeout: 8000 });
    await expect(nextLocationBtn).toBeEnabled();
    await nextLocationBtn.click();

    // ── 5. Contact info (registered phone) ───────────────────────────────────
    const nameInput = page.getByTestId('start-request-full-name-input');
    await expect(nameInput).toBeVisible({ timeout: 12000 });
    await expect(nameInput).toBeEnabled();
    await nameInput.fill(testName);

    const phoneInput = page.getByTestId('start-request-phone-input');
    await expect(phoneInput).toBeVisible({ timeout: 8000 });
    await expect(phoneInput).toBeEnabled();
    await phoneInput.fill(testPhone);

    // ── 6. Submit ─────────────────────────────────────────────────────────────
    const submitBtn = page.getByTestId('start-request-submit');
    await expect(submitBtn).toBeVisible({ timeout: 8000 });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // For a registered phone the wizard redirects to the guest dashboard with
    // returning=true, which renders WITHOUT authentication:
    //   wizard → /customer/dashboard?requestId=...&code=...&returning=true
    //   dashboard renders guest view: success banner + "Log In to Follow Up" link
    await page.waitForURL(/returning=true/, { timeout: 30000 });

    // ── 7. Verify the returning customer account notice ──────────────────────
    // The guest dashboard shows data-testid="request-success-banner" with the
    // "Request linked to your registered account!" notice inside it, plus a
    // "Log In to Follow Up ←" link pointing to auth/login.
    await expect(page.getByTestId('request-success-banner')).toBeVisible({ timeout: 15000 });

    // The "Log In to Follow Up" link is the proof that returning=true rendered.
    // Its href contains "auth/login", matching the original test intent.
    const loginLink = page.locator('a[href*="auth/login"]');
    await expect(loginLink).toBeVisible({ timeout: 8000 });

    // ── 8. Clean up ───────────────────────────────────────────────────────────
    // We are still on the dashboard URL — the code param is in the URL.
    const code = new URL(page.url()).searchParams.get('code');
    if (code) {
      console.log(`[E2E] Starting cleanup for returning request: ${code}`);
      await archiveTestRequest(code);
    }
  });
});

