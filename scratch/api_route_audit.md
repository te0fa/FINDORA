# API Route Protection Audit

| API Route Path | Classification | Role Check Status | Details / Notes |
| :--- | :--- | :--- | :--- |
| `/api/ai/parse-request` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/ai/pricing` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/alternatives/[product_id]` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/bids` | **Requires Auth** | 🟢 (auth + vendor role check) | Checks vendor permissions |
| `/api/contributors/apply` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/kyc` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/kyc/submit` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/leaderboard` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/review` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/scarcity` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/contributors/submit` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/tasks` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/tasks/claim` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/tasks/submit` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/contributors/wallet/withdraw` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/cron/fraud-audit` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/cron/network-survival` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/cron/recalculate-networks` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/cron/task-recycler` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/cron/trend-detector` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/customers/points/redeem` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/customers/referrals/invite` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/customers/requests/create` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/customers/requests/negotiate` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/customers/waitlists/add` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/deals/hunter/submit` | **Requires Auth** | 🟢 (auth + contributor role check) | Checks contributor membership / approval |
| `/api/intelligence/demand` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/internal/jobs/research/run` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/merchants/offers` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/merchants/register` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/notifications/push` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/otp/send` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/otp/verify` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/pricing/resolve` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/products` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/products/[id]` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/products/[id]/history` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/products/[id]/price` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/reports/[id]/chat` | **Requires Auth** | 🟢 (auth + vendor role check) | Checks vendor permissions |
| `/api/reviews/submit` | **Requires Auth** | 🟢 (auth + vendor role check) | Checks vendor permissions |
| `/api/specializations` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/specializations/[id]` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/specializations/[id]/archive` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/specializations/[id]/restore` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/ai-agents/toggle` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/staff/feature-flags` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/gamification` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/insights/approve` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/investor-metrics` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/marketplace/deal` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/marketplace/vendor` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/points/override` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/staff/pricing` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/risk/freeze` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/risk/suspend` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/tasks/create` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/staff/tasks/review` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/support/chat` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/trends` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/trends/[product_id]` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/vendor/register` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]/activate` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]/archive` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]/bid` | **Requires Auth** | 🟢 (auth + vendor role check) | Checks vendor permissions |
| `/api/vendors/[id]/message` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]/suspend` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/[id]/trust-score` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/vendors/check-duplicate` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/vendors/search` | **Requires Auth** | 🟢 (auth + staff role check) | Checks staff membership / permissions |
| `/api/watchlists` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/watchlists/[product_id]/alerts` | **Requires Auth** | 🔴 (auth without role check) | Only verifies user authentication |
| `/api/webhooks/paymob` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/webhooks/vendors/inbound` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
| `/api/webhooks/vendors/outbound` | **Public/Exempt** | 🟢 (Public/Exempt / Signature / Secret Check) | Checks Bearer CRON_SECRET, webhook signature, or is open |
