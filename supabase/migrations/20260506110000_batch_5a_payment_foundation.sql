-- Batch 5A: Payment Foundation
-- 1. payment_intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.requests(id),
    customer_id uuid NOT NULL REFERENCES public.customers(id),
    intent_type text NOT NULL, -- request_fee, report_unlock, procurement_fee, custom
    amount numeric(12,2) NOT NULL,
    currency_code text NOT NULL DEFAULT 'EGP',
    status text NOT NULL DEFAULT 'draft', -- draft, pending_customer, submitted, confirmed, rejected, cancelled
    provider text NOT NULL DEFAULT 'manual',
    provider_reference text,
    payment_instructions text,
    expires_at timestamptz,
    created_by_staff_id uuid REFERENCES public.staff_members(id),
    confirmed_by_staff_id uuid REFERENCES public.staff_members(id),
    confirmed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT ck_status CHECK (status IN ('draft', 'pending_customer', 'submitted', 'confirmed', 'rejected', 'cancelled')),
    CONSTRAINT ck_intent_type CHECK (intent_type IN ('request_fee', 'report_unlock', 'procurement_fee', 'custom'))
);

-- 2. payment_audit_events
CREATE TABLE IF NOT EXISTS public.payment_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    request_id uuid,
    event_type text NOT NULL,
    actor_type text NOT NULL, -- staff, customer, system
    actor_staff_id uuid REFERENCES public.staff_members(id),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. Update source_reveals to support link to payment_intents
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='source_reveals' AND column_name='payment_intent_id') THEN
        ALTER TABLE public.source_reveals ADD COLUMN payment_intent_id uuid REFERENCES public.payment_intents(id);
    END IF;
END $$;

-- 4. RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_events ENABLE ROW LEVEL SECURITY;

-- Cleanup existing policies if they exist to make it idempotent
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Staff Full Access Payment Intents" ON public.payment_intents;
    DROP POLICY IF EXISTS "Staff Full Access Payment Audit" ON public.payment_audit_events;
    DROP POLICY IF EXISTS "Customers Read Own Payment Intents" ON public.payment_intents;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Staff Full Access
CREATE POLICY "Staff Full Access Payment Intents" ON public.payment_intents
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_members sm
            WHERE sm.auth_user_id = auth.uid() 
            AND sm.is_active = true
        )
    );

CREATE POLICY "Staff Full Access Payment Audit" ON public.payment_audit_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_members sm
            WHERE sm.auth_user_id = auth.uid() 
            AND sm.is_active = true
        )
    );

-- Customer Read Own
CREATE POLICY "Customers Read Own Payment Intents" ON public.payment_intents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.auth_user_id = auth.uid() 
            AND c.id = customer_id
        )
    );
