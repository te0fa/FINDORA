-- Batch 7B.6: Protected System Data Guard
-- Goal: Prevent accidental deletion of system-critical reference and configuration data.

-- 1. Create Guard Functions
CREATE OR REPLACE FUNCTION public.fn_block_protected_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PROTECTED_TABLE_DELETE_BLOCKED: %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_block_protected_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PROTECTED_TABLE_TRUNCATE_BLOCKED: %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- 2. Generic Column Immutability Guard
CREATE OR REPLACE FUNCTION public.fn_block_column_update()
RETURNS TRIGGER AS $$
DECLARE
    v_col TEXT;
BEGIN
    v_col := TG_ARGV[0];
    -- Dynamically check if the specified column has changed
    -- Note: This requires the column name as the first argument in the trigger definition
    IF (OLD.id IS NOT NULL) THEN -- Basic safety
        -- We'll use specific triggers for specific columns for better performance and clarity
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply DELETE/TRUNCATE Guards
DO $$
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'staff_members',
        'staff_member_roles',
        'communication_templates',
        'ai_agent_configs',
        'service_catalog',
        'service_pricing_versions',
        'site_content_blocks',
        'homepage_announcements',
        'findora_deals'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables LOOP
        -- Truncate Guard
        EXECUTE format('DROP TRIGGER IF EXISTS tr_block_truncate_%I ON public.%I', v_table, v_table);
        EXECUTE format('CREATE TRIGGER tr_block_truncate_%I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.fn_block_protected_truncate()', v_table, v_table);

        -- Delete Guard
        EXECUTE format('DROP TRIGGER IF EXISTS tr_block_delete_%I ON public.%I', v_table, v_table);
        EXECUTE format('CREATE TRIGGER tr_block_delete_%I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_block_protected_delete()', v_table, v_table);
    END LOOP;
END $$;

-- 4. Column Immutability Triggers

-- Communication Templates: template_code, language_code
CREATE OR REPLACE FUNCTION public.fn_guard_comm_templates_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_code <> OLD.template_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: communication_templates.template_code';
    END IF;
    IF NEW.language_code <> OLD.language_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: communication_templates.language_code';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_guard_comm_templates_immutable ON public.communication_templates;
CREATE TRIGGER tr_guard_comm_templates_immutable
BEFORE UPDATE ON public.communication_templates
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_comm_templates_immutable();

-- AI Agent Configs: agent_code
CREATE OR REPLACE FUNCTION public.fn_guard_ai_agent_configs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agent_code <> OLD.agent_code THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: ai_agent_configs.agent_code';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_guard_ai_agent_configs_immutable ON public.ai_agent_configs;
CREATE TRIGGER tr_guard_ai_agent_configs_immutable
BEFORE UPDATE ON public.ai_agent_configs
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_ai_agent_configs_immutable();

-- Staff Members: auth_user_id
CREATE OR REPLACE FUNCTION public.fn_guard_staff_members_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: staff_members.id';
    END IF;
    IF NEW.auth_user_id <> OLD.auth_user_id THEN
        RAISE EXCEPTION 'PROTECTED_COLUMN_UPDATE_BLOCKED: staff_members.auth_user_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_guard_staff_members_immutable ON public.staff_members;
CREATE TRIGGER tr_guard_staff_members_immutable
BEFORE UPDATE ON public.staff_members
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_staff_members_immutable();
