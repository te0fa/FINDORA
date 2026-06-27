-- Rename legacy payments table to payments_legacy_archive
ALTER TABLE IF EXISTS public.payments RENAME TO payments_legacy_archive;

-- Drop foreign key constraint on source_reveals that references the old payments table
ALTER TABLE IF EXISTS public.source_reveals DROP CONSTRAINT IF EXISTS source_reveals_payment_id_fkey;

-- Ensure payment_intent_id exists and has foreign key on source_reveals
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='source_reveals' AND column_name='payment_intent_id') THEN
        ALTER TABLE public.source_reveals ADD COLUMN payment_intent_id uuid REFERENCES public.payment_intents(id);
    END IF;
END $$;

-- Make payment_id on source_reveals nullable
ALTER TABLE public.source_reveals ALTER COLUMN payment_id DROP NOT NULL;

-- Create VIEW public.payments built on top of payment_intents for backward compatibility
CREATE OR REPLACE VIEW public.payments AS
SELECT 
    id,
    request_id,
    customer_id,
    intent_type AS payment_type,
    amount,
    currency_code,
    CASE 
        WHEN status = 'confirmed' THEN 'confirmed'
        WHEN status = 'rejected' THEN 'rejected'
        WHEN status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END AS payment_status,
    CASE
        WHEN status = 'confirmed' THEN 'completed'
        ELSE status
    END AS status,
    provider AS payment_method,
    provider_reference AS external_reference,
    confirmed_by_staff_id AS confirmed_by,
    confirmed_at,
    amount AS amount_egp,
    created_at,
    updated_at
FROM public.payment_intents;
