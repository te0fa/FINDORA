# 🚀 FINDORA Production Release Checklist & Staging Verification

This document details the complete pre-flight validation, database migrations, security audits, and deployment sign-offs required prior to promoting changes from **Staging** to **Production**.

---

## 📋 1. Release Overview & Micro-Sprints Log

| Sprint / Step | Scope & Description | Status | Verification Reference |
| :--- | :--- | :---: | :--- |
| **QW-01** | Fix CI job order (`deploy` requires `build, e2e`), remove `\|\| true` in lint | ✅ Completed | `.github/workflows/ci.yml` |
| **QW-02** | OCR Fail-Closed security (prevent auto-approval without `GEMINI_API_KEY`) | ✅ Completed | `src/lib/gemini/ocr.ts` |
| **QW-03** | Production Logger optimization (keep `info` in JSON, suppress `debug`) | ✅ Completed | `src/lib/utils/logger.ts` |
| **QW-04** | Bilingual status translations in Customer Dashboard | ✅ Completed | `CustomerDashboardClient.tsx` |
| **QW-05** | Tenant-scoped AI response cache with user ID isolation | ✅ Completed | `src/lib/pricing/aiAgent.ts` |
| **QW-06** | Parallel quote analysis for online and offline sources | ✅ Completed | `src/lib/gemini/client.ts` |
| **QW-07** | Input length limits on AI endpoints (`MAX_QUERY_LENGTH = 50_000`) | ✅ Completed | `parse-request/route.ts`, `concierge/route.ts` |
| **QW-08** | OTP authentication guard on customer `history-lookup` endpoint | ✅ Completed | `src/app/api/requests/history-lookup/route.ts` |
| **QW-09** | Regenerated Supabase TypeScript types from schema | ✅ Completed | `src/types/database.types.ts` |
| **QW-10** | Optimized Sentry trace sample rate (5% client, 10% server) | ✅ Completed | `sentry.client.config.ts`, `sentry.server.config.ts` |
| **SP0-01** | Supabase-backed persistent Rate Limiter (`rate_limit_windows` table) | ✅ Completed | `src/proxy.ts`, `rate-limiter.ts` |
| **SP0-02** | Orchestrator race-condition fix & double-approval lock | ✅ Completed | `src/lib/workflow/orchestrator.ts`, `agents.ts` |
| **SP0-03** | Prompt-injection prevention via `<user_request>` XML encapsulation | ✅ Completed | `orchestrator.ts`, `analysis.ts`, `run-online-research.ts` |
| **SP0-04** | End-to-end `x-request-id` Correlation ID propagation | ✅ Completed | `proxy.ts`, `logger.ts`, `orchestrator.ts` |
| **SP1-01** | Supabase-backed Checkout Lock (`checkout_locks` table) | ✅ Completed | `src/lib/utils/checkoutLock.ts`, `checkout/page.tsx` |
| **SP1-02** | Non-breaking "Coming Soon" placeholders (`/account`, `/settings`, `new-account`) | ✅ Completed | `src/components/ComingSoon.tsx` |

---

## 🗄️ 2. Database Migrations Status

Before production release, confirm the following migrations have executed:

- [x] **`20260819130000_rate_limit_windows.sql`**:
  - Creates table `rate_limit_windows (window_key, request_count, window_start, expires_at, created_at)`.
  - Creates index `idx_rate_limit_expires` on `expires_at`.
- [x] **`20260819135000_checkout_locks.sql`**:
  - Creates table `checkout_locks (request_id, locked_at)`.

---

## 🧪 3. Staging Verification & Test Suites

Run the following test commands to ensure 100% test coverage and compliance:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Unit tests (Rate limiter, Checkout lock, Sentry config, Correlation ID)
npm run test:unit

# 3. End-to-End Playwright test suite
npm run test:e2e
```

### Table Verification Checks on Staging:
- **`rate_limit_windows`**: Inspect rows after running consecutive API requests. Verify `request_count` increments and resets after window expiry.
- **`checkout_locks`**: Trigger rapid concurrent clicks on checkout button. Verify lock insertion, subsequent attempt rejection, and clean deletion upon completion.

---

## 🔐 4. Environment Variables Checklist

Ensure these variables are populated in Production & Staging environments:

| Variable | Staging Required | Production Required | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_ENV` | `staging` | `production` | Deployment environment flag |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | Supabase server-side admin key |
| `GEMINI_API_KEY` | ✅ | ✅ | Google Generative AI API Key |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | ✅ | Sentry client DSN |
| `SENTRY_DSN` | ✅ | ✅ | Sentry server DSN |
| `NEXT_PUBLIC_SENTRY_SAMPLE_RATE`| `0.05` | `0.05` | Sentry client trace rate (5%) |
| `SENTRY_SAMPLE_RATE` | `0.1` | `0.1` | Sentry server trace rate (10%) |

---

## 🛡️ 5. Security & Reliability Safeguards

- [x] **Fail-Closed OCR**: Payments fail-safe if `GEMINI_API_KEY` is absent.
- [x] **Prompt-Injection Barrier**: Prompts wrapped in XML tags with explicit model instructions to ignore embedded directives.
- [x] **Double-Submission Prevention**: Database-level unique constraint locking on checkout.
- [x] **OTP Verification**: History lookup endpoints strictly require valid OTP tokens before querying data.
- [x] **Distributed Correlation**: `x-request-id` attached to every client and server log for easy trace discovery in log aggregators and Sentry tags.

---

## 🔄 6. Rollback Plan

If an unforeseen critical issue occurs post-deployment:
1. **Vercel Instant Rollback**: Revert deployment to the previous stable release hash with 1-click in Vercel Dashboard.
2. **Database Resilience**: Migrations for `rate_limit_windows` and `checkout_locks` are purely additive and do not break older application code.
3. **Emergency Rate Limiting**: The rate limiter uses a *fail-open* architecture so database latency or connection hiccups will never block legitimate user requests.

---

**Release Status:** Ready for Production Deployment 🚀
