-- Batch 7A — AI Staff Copilot Logs
-- Proposed Migration

CREATE TABLE IF NOT EXISTS public.ai_copilot_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    copilot_type text NOT NULL, -- 'intake_analysis', 'pricing_suggestion', etc.
    input_summary jsonb DEFAULT '{}'::jsonb,
    output_summary jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_copilot_runs ENABLE ROW LEVEL SECURITY;

-- Staff-only access helper (reusing pattern from Batch 4A)
CREATE OR REPLACE FUNCTION public.fn_is_active_staff_7a()
RETURNS boolean AS $fn$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members
        WHERE auth_user_id = auth.uid() AND is_active = true
    );
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Staff manage ai copilot logs" ON public.ai_copilot_runs
    FOR ALL USING (public.fn_is_active_staff_7a());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_copilot_request_id ON public.ai_copilot_runs(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_staff_id ON public.ai_copilot_runs(staff_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_type ON public.ai_copilot_runs(copilot_type);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_created_at ON public.ai_copilot_runs(created_at);
