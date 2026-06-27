# FINDORA E2E Testing Infrastructure

This directory contains browser-level end-to-end tests using Playwright.

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    npx playwright install chromium
    ```

2.  **Configuration**:
    The tests use `E2E_BASE_URL` from your environment. By default, it points to `http://localhost:3000`.
    You can set it in `.env.local` or via shell:
    ```bash
    $env:E2E_BASE_URL="http://your-staging-url.com"
    ```

3.  **Running Tests**:
    ```bash
    # Run all tests
    npm run test:e2e

    # Run in UI mode
    npm run test:e2e:ui

    # Run a specific test
    npx playwright test e2e/smoke.public.spec.ts
    ```

## Security Rules

- **DO NOT COMMIT SECRETS**: Never hardcode passwords, API keys, or service role keys in test files.
- **Data Pollution**: Be careful with tests that mutate data. Use the `test-teardown` pattern or dedicated test accounts.
- **Authentication**: Use the global setup pattern (to be implemented) for shared sessions.

## Test Structure

- `e2e/*.spec.ts`: Test files.
- `playwright.config.ts`: Global configuration.
