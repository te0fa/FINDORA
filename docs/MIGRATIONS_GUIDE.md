# Database Migrations & Version Control Guide

This document outlines the official workflow for managing database schema changes in FINDORA using Supabase CLI. 

All database modifications **MUST** be version-controlled, reviewed, and applied using Supabase migrations. Manual schema changes through the Supabase Dashboard SQL Editor are strictly forbidden except for read-only diagnostics.

---

## 1. Creating a New Migration

To create a new database migration file, run:
```bash
npx supabase migration new <migration_name>
```
This generates a new file under `supabase/migrations/<timestamp>_<migration_name>.sql`.

### Rules for Writing SQL Migrations
1. **Idempotency**: Every script **MUST** be idempotent. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `DROP ... IF EXISTS` structures.
2. **Safety Checks**: Wrap column additions and table adjustments in `DO $$ BEGIN ... END $$;` blocks with conditional guards to prevent migration failures.
3. **No Drop Cascades**: Avoid dropping tables or views with `CASCADE` unless absolutely necessary and documented.

---

## 2. Testing and Applying Migrations

### Local / Dry Run Verification
Before pushing schema changes to the remote database, perform a dry run to check for syntax errors or conflicts:
```bash
npx supabase db push --dry-run
```
If you are pushing out-of-order (backfilled) migrations, append the `--include-all` flag:
```bash
npx supabase db push --dry-run --include-all
```

### Applying to Remote Database
To push the changes to the live staging/production database:
```bash
npx supabase db push
```
If out-of-order migrations are detected, confirm the push using the `--include-all` flag:
```bash
npx supabase db push --include-all
```

### Verifying Status
Verify that the local files are perfectly synchronized with the remote database records:
```bash
npx supabase migration list
```

---

## 3. Regenerating Types

After applying database migrations, regenerate the TypeScript type definitions to ensure the application codebase stays aligned with the schema:
```bash
npx supabase gen types typescript --linked > types/supabase.ts
```
*(Verify the path of your TypeScript types folder if it differs).*

---

## 4. Archiving Legacy Scripts
Do not leave scratch SQL scripts or update snippets in the root directory. Store historical or developer-specific scratch files inside:
- `legacy_sql_archive/` (for verified legacy releases)
- `scratch/` (for local development tests)
