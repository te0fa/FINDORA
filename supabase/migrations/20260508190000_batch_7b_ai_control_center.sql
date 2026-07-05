-- Batch 7B — AI Control Center & Provider Configuration
-- Proposed Migration

-- 1. AI AGENT CONFIGURATIONS
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code text UNIQUE NOT NULL, -- e.g., 'intake_reviewer', 'pricing_advisor'
    enabled boolean DEFAULT false,
    provider text NOT NULL DEFAULT 'disabled', -- 'disabled', 'gemini', 'openai', 'anthropic', 'tavily', 'brave_search', 'custom'
    model text,
    temperature numeric DEFAULT 0.2,
    max_tokens integer DEFAULT 1500,
    daily_limit integer DEFAULT 100,
    monthly_limit integer DEFAULT 1000,
    max_search_results integer DEFAULT 10,
    allow_create_draft boolean DEFAULT true,
    allow_create_research_items boolean DEFAULT false,
    allow_suggest_report_snapshots boolean DEFAULT false,
    prompt_version text DEFAULT 'v1',
    safety_level text DEFAULT 'strict', -- 'strict', 'moderate', 'relaxed'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. AI COPILOT RUNS (Persistent Logs)
CREATE TABLE IF NOT EXISTS public.ai_copilot_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
    agent_code text NOT NULL,
    provider text NOT NULL,
    model text,
    input_summary jsonb DEFAULT '{}'::jsonb,
    output_summary jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'completed', -- 'completed', 'failed', 'blocked'
    error_message text,
    token_estimate integer DEFAULT 0,
    cost_estimate numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Ensure columns exist if the table was created by a previous migration
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_copilot_runs' AND column_name='agent_code') THEN
        ALTER TABLE public.ai_copilot_runs 
            ADD COLUMN agent_code text,
            ADD COLUMN provider text,
            ADD COLUMN model text,
            ADD COLUMN token_estimate integer DEFAULT 0,
            ADD COLUMN cost_estimate numeric DEFAULT 0;
            
        UPDATE public.ai_copilot_runs SET agent_code = COALESCE(copilot_type, 'unknown') WHERE agent_code IS NULL;
        UPDATE public.ai_copilot_runs SET provider = 'unknown' WHERE provider IS NULL;
        
        ALTER TABLE public.ai_copilot_runs 
            ALTER COLUMN agent_code SET NOT NULL,
            ALTER COLUMN provider SET NOT NULL;
    END IF;
END $$;

-- 3. RLS POLICIES
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_runs ENABLE ROW LEVEL SECURITY;

-- Helper function for staff check (Batch 7B version)
CREATE OR REPLACE FUNCTION public.fn_is_active_staff_7b()
RETURNS boolean AS $fn$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members
        WHERE auth_user_id = auth.uid() AND is_active = true
    );
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Config Policies (Staff Read, Admin Update)
-- Note: Simplified to all staff for now to allow viewing, but we can refine in DAL/UI
CREATE POLICY "Staff manage ai configs" ON public.ai_agent_configs
    FOR ALL USING (public.fn_is_active_staff_7b());

CREATE POLICY "Staff manage ai copilot runs" ON public.ai_copilot_runs
    FOR ALL USING (public.fn_is_active_staff_7b());

-- 4. INITIAL SEED DATA
INSERT INTO public.ai_agent_configs (agent_code, enabled, provider, model)
VALUES 
    ('intake_reviewer', false, 'disabled', 'gpt-4'),
    ('pricing_advisor', false, 'disabled', 'gpt-4'),
    ('research_planner', false, 'disabled', 'gpt-4'),
    ('research_retriever', false, 'disabled', 'disabled'),
    ('report_writer', false, 'disabled', 'gpt-4'),
    ('communication_drafter', false, 'disabled', 'gpt-4'),
    ('trust_safety_checker', false, 'disabled', 'gpt-4'),
    ('dashboard_insights', false, 'disabled', 'gpt-4')
ON CONFLICT (agent_code) DO NOTHING;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_code ON public.ai_agent_configs(agent_code);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_runs_request_id ON public.ai_copilot_runs(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_runs_staff_id ON public.ai_copilot_runs(staff_id);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_runs_agent_code ON public.ai_copilot_runs(agent_code);
CREATE INDEX IF NOT EXISTS idx_ai_copilot_runs_created_at ON public.ai_copilot_runs(created_at);
