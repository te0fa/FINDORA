# FINDORA — Smart Sourcing Platform 🇪🇬

> **Egypt's #1 Intelligent Sourcing-as-a-Service Platform**
> أرسل طلبك، وسنبحث لك عن أفضل الأسعار والموردين.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple?logo=google)](https://ai.google.dev)

---

## What is Findora?

Findora is a **concierge sourcing platform** where customers submit purchasing requests, and our team — augmented by AI — finds the best prices, vets vendors, and delivers professional sourcing reports.

**The flow:**
```
Customer submits request → AI analyzes intake → Staff researches vendors →
Report built & reviewed → Customer sees options → Payment → Done
```

---

## Architecture Overview

```
findora/
├── src/
│   ├── app/[locale]/          # Next.js App Router (AR + EN)
│   │   ├── page.tsx           # Landing page (1,792 lines, dynamic CMS)
│   │   ├── staff/             # Staff operations panel (15 modules)
│   │   ├── customer/          # Customer portal
│   │   ├── merchant/          # Merchant interface
│   │   └── vendor/            # Vendor interface
│   │
│   ├── components/            # Shared UI components
│   │   ├── admin/             # Admin-only components
│   │   ├── staff/             # Staff panel components
│   │   ├── customer/          # Customer-facing components
│   │   └── marketing/         # Landing page components
│   │
│   ├── lib/
│   │   ├── ai/               # Gemini AI copilot (7 agents)
│   │   ├── dal/              # Data Access Layer (27 files)
│   │   ├── workflow/         # Request lifecycle orchestrator
│   │   ├── pricing/          # Dynamic pricing engine
│   │   ├── payments/         # Paymob Egypt integration
│   │   ├── contributors/     # Economy OS (wallet, gamification)
│   │   ├── intelligence/     # Business intelligence engines
│   │   ├── notifications/    # OTP + push notifications
│   │   └── utils/            # Logger, error handler, helpers
│   │
│   └── types/
│       └── database.types.ts  # Full Supabase type definitions
│
├── supabase/migrations/       # 35+ schema migration phases
└── database_setup_complete.sql
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router) + React 19 |
| **Styling** | Vanilla CSS + CSS Variables |
| **Database** | Supabase (PostgreSQL) + Row Level Security |
| **AI Engine** | Google Gemini 2.5 Flash |
| **Payments** | Paymob Egypt (Card + Mobile Wallet) |
| **Auth** | Supabase Auth + OTP |
| **i18n** | Built-in (Arabic RTL + English) |
| **Testing** | Playwright E2E |
| **Deployment** | Vercel |

---

## Key Features

### For Customers
- 🛒 **Smart Request Submission** — describe what you need, we handle the rest
- 📊 **Professional Sourcing Reports** — multiple vendor options with pricing
- 💳 **Flexible Payment** — pay after preview, upfront deposit, or milestone plan
- 📱 **PWA Support** — works offline, installable on mobile

### For Staff (Operations Panel)
- 📋 **Request Queue** — intelligent assignment and workflow management
- 🤖 **AI Copilot** — 7 specialized agents for analysis, pricing, and reports
- 🏪 **Vendor Database** — scored and categorized supplier network
- 💰 **Payment Management** — create, track, and confirm payment intents
- 📈 **Business Intelligence Hub** — 29 analytics modules

### For Contributors (Economy OS)
- 💼 **Digital Wallet** — EGP + points balance
- 🎮 **Gamification** — streaks, badges, levels (Novice → Legend)
- 🔗 **Referral Network** — 2-level referral earning system
- 🛡️ **Risk Engine** — fraud detection and economic stabilizer

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- Google Gemini API key

### Installation

```bash
git clone https://github.com/your-org/findora.git
cd findora
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_SITE_URL=https://findora.app
```

### Database Setup

Run the complete schema:
```bash
# In your Supabase SQL editor, run:
# database_setup_complete.sql
# Then run each updates_phase_*.sql in order
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/ar](http://localhost:3000/ar) (Arabic) or [http://localhost:3000/en](http://localhost:3000/en) (English).

---

## Staff Portal Access

The staff panel is at `/[locale]/staff/`. Default routes by role:
- **Admin/Owner** → `/staff/dashboard`
- **Reviewer/Researcher** → `/staff/queue`

Create a staff member in `staff_members` table with `auth_user_id` matching a Supabase Auth user.

---

## AI Agents

| Agent Code | Purpose |
|-----------|---------|
| `intake_analysis` | Analyzes new requests on intake |
| `pricing_suggestion` | Suggests service pricing |
| `report_assistant` | Builds sourcing reports |
| `communication_draft` | Drafts customer messages |
| `safety_check` | Flags risky or unclear requests |
| `dashboard_insights` | Generates strategic insights |
| `research_retrieval` | Retrieves and summarizes research data |

Agents are controlled via `ai_agent_configs` table (enable/disable, model, temperature).

---

## Testing

```bash
# E2E tests (Playwright)
npm run test:e2e

# With UI
npm run test:e2e:ui

# Headed mode
npm run test:e2e:headed
```

---

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

Set all environment variables in Vercel Dashboard.

### Environment Variables Required in Production
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `PAYMOB_API_KEY` (for live payments)
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_INTEGRATION_ID_WALLET`
- `PAYMOB_HMAC_SECRET`

---

## Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Rate limiting on all API routes
- ✅ Input validation on all server actions
- ✅ HMAC verification for payment webhooks
- ✅ OTP-based authentication
- ✅ Audit logging for all operations

---

## Pricing Models

| Type | Model | Payment Policy |
|------|-------|---------------|
| Everyday Purchase | Fixed fee | Pay after preview |
| High Value Deals | Percentage fee | Upfront deposit |
| Projects & Supplies | Custom quote | Milestone plan |
| Enterprise | Retainer | Monthly subscription |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

Proprietary — All rights reserved © 2026 Findora.

---

*Built with ❤️ in Egypt 🇪🇬 — Powering the future of smart commerce*
