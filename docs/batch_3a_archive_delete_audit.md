# Batch 3A — Request Archive + Safe Delete Audit (FINAL LIVE VERIFIED)

## Request Lifecycle States

Based on `fn_resolve_canonical_state` and `resolveRequestState` DAL:

| Canonical State | Condition | Deletion Safety |
| :--- | :--- | :--- |
| **ARCHIVED** | `is_archived = true` | **SAFE** (if terminal) |
| **COMPLETED** | `current_status = 'closed'` OR `client_released_at IS NOT NULL` | **SAFE** |
| **READY** | `current_status = 'client_ready'` AND `client_released_at IS NULL` | **BLOCKED** |
| **ISSUES** | `reviewer_decision` IN ('reject', 'needs_clarification') | **SAFE** (if reject) |
| **OPERATIONS** | `reviewer_decision = 'approve'` AND `current_status` IN ('in_progress', 'research', 'reporting') | **BLOCKED** |
| **INTAKE** | `reviewer_decision IS NULL` AND `current_status` IN ('submitted', 'open') | **BLOCKED** |
| **UNKNOWN** | Default fallback | **BLOCKED** |

### Safety Guards
- **Blocked even if Archived**: If a request is `is_archived = true` but `current_status` is still in an operational phase (`research`, `reporting`, `client_ready`), deletion must be blocked unless it is explicitly terminal.
- **Backup Mandatory**: Deletion is impossible without a confirmed entry in `request_delete_backups`.

## Request-Related Tables (LIVE Dependency Graph)

Verified against LIVE schema via `information_schema` and DAL inspection.

### Tier 1: Direct Request Children (FK `request_id`)
These tables MUST be backed up and deleted.

| Table Name | FK to Request | Backup Scope |
| :--- | :--- | :--- |
| `public.request_preferences` | Yes | FULL |
| `public.request_status_history` | Yes | FULL |
| `public.research_runs` | Yes | FULL |
| `public.research_items` | Yes | FULL |
| `public.request_candidate_shortlists` | Yes | FULL |
| `public.merchant_quotes` | Yes | FULL |
| `public.reports` | Yes | FULL |
| `public.report_option_snapshots` | Yes | FULL |
| `public.offers` | Yes | FULL |
| `public.approvals` | Yes | FULL |
| `public.payments` | Yes | FULL |
| `public.source_reveals` | Yes | FULL |

### Tier 2: Indirect Children
These tables are linked via Tier 1 tables.

| Table Name | Link Column | Parent Table |
| :--- | :--- | :--- |
| `public.research_items` | `research_run_id` | `research_runs` |
| `public.report_option_snapshots`| `report_id` | `reports` |

### Protected Tables (DO NOT DELETE)
- `public.customers`
- `public.customer_contacts`
- `public.staff_members`
- `public.staff_member_roles`
- `public.service_catalog`
- `public.service_pricing_versions`
- `public.homepage_announcements`
- `public.findora_deals`
- `public.findora_deal_inquiries`
- `public.site_content_blocks`
- `public.site_content_audit`

## Atomic Deletion Sequence (RPC)

The hard delete must be executed via `public.fn_hard_delete_request_with_backup` to ensure atomicity.

1.  **Validation**:
    - Verify `admin`/`owner` role.
    - Verify request is in SAFE state.
    - Verify confirmed backup exists for the specific `request_id`.
2.  **Child Deletion (Safe Order)**:
    - `public.report_option_snapshots`
    - `public.reports`
    - `public.request_candidate_shortlists`
    - `public.research_items`
    - `public.research_runs`
    - `public.source_reveals`
    - `public.approvals`
    - `public.offers`
    - `public.payments`
    - `public.request_status_history`
    - `public.request_preferences`
    - `public.merchant_quotes` (CASCADE supported, but explicit delete preferred)
3.  **Parent Deletion**:
    - `public.requests`
4.  **Audit**:
    - Update `public.request_delete_backups` → `delete_confirmed = true`.
    - Insert into `public.request_deletion_audit` → `event_type = 'REQUEST_HARD_DELETED'`.

## Risk Assessment
- **Detached Backups**: `request_delete_backups` and `request_deletion_audit` will NOT have foreign keys to `requests(id)` to survive the deletion.
- **Schema Variance**: Audit confirmed `jobs` table is not in `public` schema; if it exists in `agent`/`system`, it is currently out of reach for this RPC but should be monitored.

