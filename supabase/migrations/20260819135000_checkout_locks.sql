-- supabase/migrations/20260819135000_checkout_locks.sql
CREATE TABLE IF NOT EXISTS checkout_locks (
  request_id TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
