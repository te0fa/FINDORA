-- supabase/migrations/20260819130000_rate_limit_windows.sql
CREATE TABLE IF NOT EXISTS rate_limit_windows (
  window_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires
  ON rate_limit_windows (expires_at);
