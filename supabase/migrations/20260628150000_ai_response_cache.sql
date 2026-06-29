-- supabase/migrations/20260628150000_ai_response_cache.sql
-- Create table to cache AI responses to minimize Gemini API calls and costs

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
    cache_key TEXT PRIMARY KEY,
    feature_key VARCHAR(255) NOT NULL,
    response_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires_at ON public.ai_response_cache(expires_at);

-- Add comment
COMMENT ON TABLE public.ai_response_cache IS 'Stores cached AI results for cost and performance optimization';
