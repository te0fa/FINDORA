-- Phase 1A: Reviewer Assignment Slice
-- Idempotent script for requests table with strengthened constraints

DO $$ 
BEGIN
    -- 1. Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'assigned_reviewer_staff_id') THEN
        ALTER TABLE public.requests ADD COLUMN assigned_reviewer_staff_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assignment_status') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assignment_status text NOT NULL DEFAULT 'unassigned';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assigned_at') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assigned_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assigned_by_staff_id') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assigned_by_staff_id uuid;
    END IF;

    -- 2. Add Constraints
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS fk_requests_assigned_reviewer;
    ALTER TABLE public.requests 
        ADD CONSTRAINT fk_requests_assigned_reviewer 
        FOREIGN KEY (assigned_reviewer_staff_id) REFERENCES public.staff_members(id);

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS fk_requests_reviewer_assigned_by;
    ALTER TABLE public.requests 
        ADD CONSTRAINT fk_requests_reviewer_assigned_by 
        FOREIGN KEY (reviewer_assigned_by_staff_id) REFERENCES public.staff_members(id);

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_reviewer_assignment_status;
    ALTER TABLE public.requests 
        ADD CONSTRAINT ck_reviewer_assignment_status 
        CHECK (reviewer_assignment_status IN ('unassigned', 'assigned'));

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_reviewer_assignment_consistency;
    ALTER TABLE public.requests 
        ADD CONSTRAINT ck_reviewer_assignment_consistency 
        CHECK (
            (reviewer_assignment_status = 'unassigned' AND 
             assigned_reviewer_staff_id IS NULL AND 
             reviewer_assigned_at IS NULL AND 
             reviewer_assigned_by_staff_id IS NULL)
            OR
            (reviewer_assignment_status = 'assigned' AND 
             assigned_reviewer_staff_id IS NOT NULL)
        );

    -- 3. Add Indexes
    CREATE INDEX IF NOT EXISTS idx_requests_assigned_reviewer ON public.requests(assigned_reviewer_staff_id);
    CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON public.requests(reviewer_assignment_status);
    CREATE INDEX IF NOT EXISTS idx_requests_assignment_composite ON public.requests(reviewer_assignment_status, assigned_reviewer_staff_id);

END $$;
