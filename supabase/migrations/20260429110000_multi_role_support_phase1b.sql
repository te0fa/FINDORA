-- Phase 1B: Multi-Role Support
-- Creates mapping table for multiple roles per staff

CREATE TABLE IF NOT EXISTS public.staff_member_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_member_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    role_code text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    granted_at timestamptz NOT NULL DEFAULT now(),
    granted_by_staff_id uuid REFERENCES public.staff_members(id),
    UNIQUE(staff_member_id, role_code),
    CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
        'admin', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_roles_member ON public.staff_member_roles(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_lookup ON public.staff_member_roles(role_code, is_active);
