-- Add columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add columns to staff_members table
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
