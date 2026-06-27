# Contributing to FINDORA

Thank you for your interest in contributing to FINDORA! 🎉

This document outlines the development workflow, coding standards, and contribution guidelines.

---

## Development Setup

```bash
git clone https://github.com/your-org/findora.git
cd findora
npm install
cp .env.example .env.local
# Fill in your .env.local values
npm run dev
```

---

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # Reusable React components
├── lib/
│   ├── dal/       # Data Access Layer — ALL DB calls go here
│   ├── ai/        # AI copilot agents
│   ├── auth/      # Authentication & role management
│   ├── middleware/ # Rate limiter and middleware utilities
│   ├── supabase/  # Supabase client factories
│   ├── utils/     # logger, error-handler, helpers
│   └── workflow/  # Request lifecycle orchestrator
└── types/
    └── database.types.ts  # Single source of truth for DB types
```

---

## Coding Standards

### TypeScript
- **Strict typing** — no `any` unless absolutely necessary
- Use `unknown` for catch blocks: `catch (err: unknown)`
- Import DB types from `@/types/database.types`
- Use typed DAL functions — never call Supabase directly from components

### Logging
- **Never use `console.log/warn/error`** in production code
- Use the structured logger:
  ```ts
  import { createLogger } from '@/lib/utils/logger'
  const log = createLogger('MyModule')

  log.info('Something happened', { userId, requestId })
  log.warn('Non-critical issue', { field, reason })
  log.error('Critical failure', { error: err.message })
  ```

### Error Handling
- Use `handleApiError()` wrapper for API routes
- Use `safeAction()` for server actions
- Use typed error classes (`ValidationError`, `AuthError`, `NotFoundError`)

### API Routes
- Always apply rate limiting:
  ```ts
  export const POST = withRateLimit(STANDARD_RATE_LIMIT, handler)
  ```
- Validate all inputs before processing
- Return consistent JSON error shapes: `{ error: string, code?: string }`

### Database Access
- All DB queries go in `src/lib/dal/` files
- Use `assertSupabase()` for null-safe Supabase results
- Never expose raw Supabase errors to the client
- Always handle errors explicitly — no silent failures

---

## Git Workflow

1. **Branch naming**:
   - `feat/feature-name` — new features
   - `fix/bug-description` — bug fixes
   - `chore/task-name` — maintenance
   - `docs/doc-name` — documentation

2. **Commit messages** (Conventional Commits):
   ```
   feat: add vendor self-registration portal
   fix: correct auth token expiry handling
   chore: replace console.log with structured logger
   docs: update contributing guidelines
   ```

3. **Pull Request checklist**:
   - [ ] TypeScript: `npx tsc --noEmit` passes
   - [ ] Lint: `npm run lint` passes
   - [ ] No new `console.log` calls
   - [ ] Rate limiting applied to all new API routes
   - [ ] Input validation on all user inputs
   - [ ] i18n: both AR and EN strings provided

---

## Adding a New DAL Function

```ts
// src/lib/dal/my-module.ts
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { assertSupabase } from '@/lib/utils/error-handler'

const log = createLogger('DAL:my-module')

export async function getMyData(id: string) {
  log.info('Fetching data', { id })
  const supabase = await createClient()
  
  const result = await supabase
    .from('my_table')
    .select('*')
    .eq('id', id)
    .single()

  return assertSupabase(result, 'MyData')
}
```

---

## Adding a New API Route

```ts
// src/app/api/my-route/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { handleApiError } from '@/lib/utils/error-handler'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:my-route')

async function handler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()
  // ... your logic
  log.info('Request processed', { result: 'ok' })
  return NextResponse.json({ success: true })
}

export const POST = withRateLimit(STANDARD_RATE_LIMIT, handler)
```

---

## Testing

```bash
# Run E2E tests
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Run a single test file
npx playwright test tests/auth.spec.ts
```

Test files are located in `tests/` and follow the pattern `*.spec.ts`.

---

## Internationalization (i18n)

The app is bilingual (Arabic + English). When adding user-facing strings:
- **Always provide both** Arabic and English
- Arabic is RTL, English is LTR
- Use the `locale` param from route params to decide language
- Pattern: `{isAr ? 'النص العربي' : 'English text'}`

---

## Security Checklist

Before submitting any PR touching auth or payments:

- [ ] All user inputs validated server-side
- [ ] RLS policies checked for new tables
- [ ] HMAC verification on webhook endpoints
- [ ] No secrets in client-side code
- [ ] Rate limiting on new endpoints
- [ ] Audit logging for sensitive operations

---

*Questions? Open an issue or reach out to the core team.*
