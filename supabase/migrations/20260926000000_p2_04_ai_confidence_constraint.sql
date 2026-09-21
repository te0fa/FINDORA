-- Migration: 20260926000000_p2_04_ai_confidence_constraint.sql
-- Description: P2-04 Database Hardening: Enforce valid range for requests.ai_confidence
-- Invariant: NULL allowed, finite numbers must be between 0 and 1 (inclusive)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_requests_ai_confidence'
          AND conrelid = 'public.requests'::regclass
    ) THEN
        ALTER TABLE public.requests
        ADD CONSTRAINT ck_requests_ai_confidence
        CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1));
    END IF;
END $$;
