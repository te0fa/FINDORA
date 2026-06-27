-- ============================================================
-- 021_workflow_reliability.sql
-- Migration script to create workflow_runs and RLS policies
-- ============================================================

-- 1. Create workflow_runs table
CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    ai_summary_status text NOT NULL DEFAULT 'pending',
    email_status text NOT NULL DEFAULT 'pending',
    dispatch_status text NOT NULL DEFAULT 'pending',
    last_error text,
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_workflow_runs_request_id UNIQUE (request_id),
    CONSTRAINT ck_ai_summary_status CHECK (ai_summary_status IN ('pending', 'running', 'completed', 'failed')),
    CONSTRAINT ck_email_status CHECK (email_status IN ('pending', 'running', 'completed', 'failed')),
    CONSTRAINT ck_dispatch_status CHECK (dispatch_status IN ('pending', 'running', 'completed', 'failed'))
);

-- 2. Enable RLS
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow all active staff members (including ai_managers, admins, reviewers, etc.) to read/write/update workflow_runs
DROP POLICY IF EXISTS "Active staff full access on workflow runs" ON public.workflow_runs;
CREATE POLICY "Active staff full access on workflow runs" ON public.workflow_runs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_members s
            WHERE s.auth_user_id = auth.uid()
              AND s.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_members s
            WHERE s.auth_user_id = auth.uid()
              AND s.is_active = true
        )
    );

-- 4. Set up updated_at automatic trigger
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_workflow_runs_set_updated_at ON public.workflow_runs;
CREATE TRIGGER tr_workflow_runs_set_updated_at
    BEFORE UPDATE ON public.workflow_runs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();
