# FINDORA Economy OS — Cron Jobs Setup Guide

This guide details the purpose, security, configuration, and scheduling of the 5 background engine cron jobs built for the FINDORA platform.

---

## 1. Security & Protection

All cron endpoints are located under `/api/cron/` and are exempted from Supabase user session checks. Instead, they are secured via a **CRON_SECRET** authorization header.

### Requirements:
1. The environment variable `CRON_SECRET` must be set in the environment (e.g. `.env.local` or Vercel Environment Variables).
2. Any request to these endpoints must specify the secret in the Authorization header:
   ```http
   Authorization: Bearer <your-cron-secret-key>
   ```
3. **Fail-Secure Design:** If `CRON_SECRET` is missing from the environment, all endpoints will automatically reject requests with a `401 Unauthorized` status.

---

## 2. Master Feature Flag Control

To comply with the principle of "every feature manageable from the control panel," we implemented a master flag:
* **Flag Key:** `flag_economy_stabilizer_active`
* **Toggle Location:** Master Control Hub (`/staff/hub`)
* **Behavior:**
  - **Enabled (`true`):** All 5 cron jobs will execute their actual processing logic.
  - **Disabled (`false`):** All 5 cron jobs will immediately halt execution and return `{ "success": false, "message": "Stabilizer is currently disabled" }` with a `200 OK` status, preventing any background database updates or task creations.

---

## 3. The 5 Cron Jobs Details

### 🛡️ Fraud Audit Cron (`/api/cron/fraud-audit`)
* **Recommended Frequency:** Once per day at 2:00 AM (`0 2 * * *`).
* **Function:** Runs automated fraud audits looking for IP clustering (multiple accounts sharing one IP), device sharing, geo-mismatches, and rapid velocity spikes in earnings. Raises alerts in the database.
* **Impact:** Non-destructive. Updates risk levels and inserts alerts.

### 💓 Network Survival Cron (`/api/cron/network-survival`)
* **Recommended Frequency:** Once per day at 3:00 AM (`0 3 * * *`).
* **Function:** Analyzes referred scout activity. Decays or restores the contributor's `decay_multiplier` and `network_health_score` based on their active referral counts.
* **Impact:** Non-destructive. Alters multipliers affecting future passive income calculations.

### 🔄 Recalculate Networks (`/api/cron/recalculate-networks`)
* **Recommended Frequency:** Weekly on Sundays at 4:00 AM (`0 4 * * 0`).
* **Function:** Executes the core economy stabilizer logic (`fn_run_economy_stabilizer`) which limits global payout growth rates under high inflation. Syncs challenge progress and badges for active scouts.
* **Impact:** Non-destructive. Writes stabilizer snapshots and dynamically adjusts global reward multipliers.

### ♻️ Task Recycler Cron (`/api/cron/task-recycler`)
* **Recommended Frequency:** Hourly (`0 * * * *`).
* **Function:** Finds open tasks older than 24 hours that are unclaimed. Marks them as expired and spawns a boosted clone (+20% EGP and points, lower scout requirements) to prevent SLA breaches.
* **Impact:** Non-destructive. Clones tasks and updates statuses.

### 📈 Trend Detector Cron (`/api/cron/trend-detector`)
* **Recommended Frequency:** Once per day at 5:00 AM (`0 5 * * *`).
* **Function:** Analyzes customer requests in the last 48 hours to discover high-demand zones/categories (>= 3 requests). Creates proactive "Market Intel" tasks with increased priority.
* **Impact:** Non-destructive. Generates new intel tasks.

---

## 4. Vercel Configuration (`vercel.json`)

To enable automatic execution upon deployment, the `vercel.json` file in the root directory is pre-configured with Vercel Cron. Vercel will automatically read this configuration and trigger the endpoints securely if the `CRON_SECRET` is added to the Vercel project environment variables.

Example configuration in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/fraud-audit", "schedule": "0 2 * * *" },
    { "path": "/api/cron/network-survival", "schedule": "0 3 * * *" },
    { "path": "/api/cron/recalculate-networks", "schedule": "0 4 * * 0" },
    { "path": "/api/cron/task-recycler", "schedule": "0 * * * *" },
    { "path": "/api/cron/trend-detector", "schedule": "0 5 * * *" }
  ]
}
```
