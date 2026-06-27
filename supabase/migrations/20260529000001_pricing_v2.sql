-- Supabase Migration: Upgraded Pricing Lifecycle Engine v2
-- 1. Extend service_pricing_versions safely with soft delete & lifecycle columns
ALTER TABLE public.service_pricing_versions 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS starts_at timestamptz,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Soft Delete Interceptor Trigger
CREATE OR REPLACE FUNCTION public.fn_soft_delete_pricing()
RETURNS trigger AS $$
BEGIN
    UPDATE public.service_pricing_versions
    SET deleted_at = now(),
        status = 'deleted',
        is_active = false
    WHERE id = OLD.id;
    
    -- Log soft delete event
    INSERT INTO public.pricing_event_logs 
        (service_type, pricing_version_id, event_type, description, old_status, new_status)
    VALUES (
        OLD.service_key, 
        OLD.id, 
        'deactivation', 
        'Soft-deleted pricing version ' || OLD.version_no,
        OLD.status,
        'deleted'
    );

    RETURN NULL; -- halts actual physical delete
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_soft_delete_pricing ON public.service_pricing_versions;
CREATE TRIGGER tr_soft_delete_pricing
BEFORE DELETE ON public.service_pricing_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_soft_delete_pricing();

-- 3. Automatic Lifecycle State Machine Trigger
CREATE OR REPLACE FUNCTION public.fn_pricing_lifecycle_state_machine()
RETURNS trigger AS $$
BEGIN
    -- Automatically manage updated_at
    NEW.updated_at := now();

    -- Determine dynamic status state machine
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.status := 'deleted';
        NEW.is_active := false;
    ELSIF NEW.is_active = false THEN
        NEW.status := 'inactive';
    ELSIF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
        NEW.status := 'expired';
    ELSIF NEW.starts_at IS NOT NULL AND NEW.starts_at > now() THEN
        NEW.status := 'scheduled';
    ELSE
        NEW.status := 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_pricing_lifecycle_state_machine ON public.service_pricing_versions;
CREATE TRIGGER tr_pricing_lifecycle_state_machine
BEFORE INSERT OR UPDATE ON public.service_pricing_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_lifecycle_state_machine();

-- 4. Overwrite/Reinforce Single Active Rule Trigger
CREATE OR REPLACE FUNCTION public.fn_single_active_pricing_rule_v2()
RETURNS trigger AS $$
DECLARE
    v_rows_updated integer;
BEGIN
    -- Only enforce if the record is set to active and is currently active
    IF NEW.is_active = true AND NEW.status = 'active' THEN
        UPDATE public.service_pricing_versions
        SET is_active = false
        WHERE service_key = NEW.service_key
          AND id <> NEW.id
          AND is_active = true
          AND deleted_at IS NULL;
          
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        
        IF v_rows_updated > 0 THEN
            INSERT INTO public.pricing_event_logs 
                (service_type, pricing_version_id, event_type, description, old_status, new_status)
            VALUES (
                NEW.service_key, 
                NEW.id, 
                'activation', 
                'Activated pricing version ' || NEW.version_no || '. Auto deactivated ' || v_rows_updated || ' conflict active record(s).',
                'multiple_active_check',
                'single_active'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_single_active_pricing_rule ON public.service_pricing_versions;
DROP TRIGGER IF EXISTS tr_single_active_pricing_rule_v2 ON public.service_pricing_versions;

CREATE TRIGGER tr_single_active_pricing_rule_v2
BEFORE INSERT OR UPDATE ON public.service_pricing_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_single_active_pricing_rule_v2();

-- 5. Backfill/sync status column for all existing records
UPDATE public.service_pricing_versions
SET status = 
    CASE 
        WHEN deleted_at IS NOT NULL THEN 'deleted'
        WHEN is_active = false THEN 'inactive'
        WHEN expires_at IS NOT NULL AND expires_at <= now() THEN 'expired'
        WHEN starts_at IS NOT NULL AND starts_at > now() THEN 'scheduled'
        ELSE 'active'
    END;
