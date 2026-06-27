-- Supabase Migration: Redesigned Production-Grade Pricing Lifecycle Engine
-- 1. Extend service_pricing_versions safely with compatibility columns
ALTER TABLE public.service_pricing_versions 
ADD COLUMN IF NOT EXISTS service_type text,
ADD COLUMN IF NOT EXISTS promo_price numeric(12,2),
ADD COLUMN IF NOT EXISTS currency text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Create pricing_event_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.pricing_event_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type text NOT NULL,
    pricing_version_id uuid,
    event_type text NOT NULL, -- 'activation', 'deactivation', 'conflict_resolved', 'trigger_execution'
    description text,
    old_status text,
    new_status text,
    created_at timestamptz DEFAULT now()
);

-- RLS for pricing_event_logs
ALTER TABLE public.pricing_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read pricing logs" ON public.pricing_event_logs;
CREATE POLICY "Staff read pricing logs" ON public.pricing_event_logs
    FOR SELECT USING (public.fn_staff_has_role('pricing_manager'));

-- 3. Bi-directional column synchronization trigger
CREATE OR REPLACE FUNCTION public.fn_sync_pricing_columns()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.service_key IS NOT NULL AND NEW.service_type IS NULL THEN
            NEW.service_type := NEW.service_key;
        ELSIF NEW.service_type IS NOT NULL AND NEW.service_key IS NULL THEN
            NEW.service_key := NEW.service_type;
        END IF;

        IF NEW.current_price IS NOT NULL AND NEW.promo_price IS NULL THEN
            NEW.promo_price := NEW.current_price;
        ELSIF NEW.promo_price IS NOT NULL AND NEW.current_price IS NULL THEN
            NEW.current_price := NEW.promo_price;
        END IF;

        IF NEW.currency_code IS NOT NULL AND NEW.currency IS NULL THEN
            NEW.currency := NEW.currency_code;
        ELSIF NEW.currency IS NOT NULL AND NEW.currency_code IS NULL THEN
            NEW.currency_code := NEW.currency;
        END IF;

        IF NEW.ends_at IS NOT NULL AND NEW.expires_at IS NULL THEN
            NEW.expires_at := NEW.ends_at;
        ELSIF NEW.expires_at IS NOT NULL AND NEW.ends_at IS NULL THEN
            NEW.ends_at := NEW.expires_at;
        END IF;

        IF NEW.created_by_staff_id IS NOT NULL AND NEW.created_by IS NULL THEN
            NEW.created_by := NEW.created_by_staff_id;
        ELSIF NEW.created_by IS NOT NULL AND NEW.created_by_staff_id IS NULL THEN
            NEW.created_by_staff_id := NEW.created_by;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.service_key IS DISTINCT FROM NEW.service_key THEN
            NEW.service_type := NEW.service_key;
        ELSIF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
            NEW.service_key := NEW.service_type;
        END IF;

        IF OLD.current_price IS DISTINCT FROM NEW.current_price THEN
            NEW.promo_price := NEW.current_price;
        ELSIF OLD.promo_price IS DISTINCT FROM NEW.promo_price THEN
            NEW.current_price := NEW.promo_price;
        END IF;

        IF OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
            NEW.currency := NEW.currency_code;
        ELSIF OLD.currency IS DISTINCT FROM NEW.currency THEN
            NEW.currency_code := NEW.currency;
        END IF;

        IF OLD.ends_at IS DISTINCT FROM NEW.ends_at THEN
            NEW.expires_at := NEW.ends_at;
        ELSIF OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
            NEW.ends_at := NEW.expires_at;
        END IF;

        IF OLD.created_by_staff_id IS DISTINCT FROM NEW.created_by_staff_id THEN
            NEW.created_by := NEW.created_by_staff_id;
        ELSIF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
            NEW.created_by_staff_id := NEW.created_by;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_pricing_columns ON public.service_pricing_versions;
CREATE TRIGGER tr_sync_pricing_columns
BEFORE INSERT OR UPDATE ON public.service_pricing_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_pricing_columns();

-- 4. Conflict prevention: single active version trigger
CREATE OR REPLACE FUNCTION public.fn_single_active_pricing_rule()
RETURNS trigger AS $$
DECLARE
    v_rows_updated integer;
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate older active versions for that service
        UPDATE public.service_pricing_versions
        SET is_active = false
        WHERE service_key = NEW.service_key
          AND id <> NEW.id
          AND is_active = true;
          
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        
        -- Log conflict resolution event
        INSERT INTO public.pricing_event_logs 
            (service_type, pricing_version_id, event_type, description, old_status, new_status)
        VALUES (
            NEW.service_key, 
            NEW.id, 
            'activation', 
            'Activated pricing version ' || NEW.version_no || '. Automatically deactivated ' || v_rows_updated || ' old active record(s).',
            'multiple_active_check',
            'single_active'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_single_active_pricing_rule ON public.service_pricing_versions;
CREATE TRIGGER tr_single_active_pricing_rule
BEFORE INSERT OR UPDATE OF is_active ON public.service_pricing_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_single_active_pricing_rule();

-- 5. Backfill existing rows (Quick Fix override support / compatibility)
UPDATE public.service_pricing_versions
SET service_type = service_key,
    promo_price = current_price,
    currency = currency_code,
    expires_at = ends_at,
    created_by = created_by_staff_id,
    is_active = COALESCE(is_active, true)
WHERE service_type IS NULL OR is_active IS NULL;
