ALTER TABLE public.staff_member_roles DROP CONSTRAINT IF EXISTS ck_role_code_allowed;
ALTER TABLE public.staff_member_roles ADD CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
    'admin', 'owner', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support',
    'content_manager', 'deals_manager', 'news_manager', 'pricing_manager',
    'quality_reviewer', 'payment_reviewer'
));

-- Batch 7D: Multi-Stage Assignment Columns
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_ops_staff_id uuid REFERENCES public.staff_members(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_reporter_staff_id uuid REFERENCES public.staff_members(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_quality_staff_id uuid REFERENCES public.staff_members(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_payment_staff_id uuid REFERENCES public.staff_members(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_assigned_ops ON public.requests(assigned_ops_staff_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_reporter ON public.requests(assigned_reporter_staff_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_quality ON public.requests(assigned_quality_staff_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_payment ON public.requests(assigned_payment_staff_id);
