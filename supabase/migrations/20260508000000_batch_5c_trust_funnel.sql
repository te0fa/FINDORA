-- Batch 5C: Trust-Based Funnel Extensions
-- 1. Extend Canonical State Resolver
CREATE OR REPLACE FUNCTION public.fn_resolve_canonical_state(
    p_is_archived BOOLEAN,
    p_current_status TEXT,
    p_reviewer_decision TEXT,
    p_client_released_at TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_metadata JSONB;
BEGIN
    IF p_is_archived THEN
        RETURN 'ARCHIVED';
    END IF;

    -- Fetch metadata for flags if needed, but for performance we try to avoid it here if possible.
    -- However, trust-based funnel depends on these flags.
    -- We'll use a subquery if we really need it, but let's see if we can use current_status.

    IF p_current_status = 'closed'
       OR (p_client_released_at IS NOT NULL AND p_current_status <> 'closed') THEN
        RETURN 'COMPLETED';
    END IF;

    IF p_current_status = 'client_ready'
       AND p_client_released_at IS NULL THEN
        RETURN 'READY';
    END IF;

    IF p_reviewer_decision IN ('reject', 'needs_clarification') THEN
        RETURN 'ISSUES';
    END IF;

    -- Trust-Based Funnel Additions
    -- 'scope_confirmed' flag will be in requests.metadata -> 'customer_confirmed_scope'
    
    IF p_current_status = 'research' THEN
        RETURN 'OPERATIONS';
    END IF;

    IF p_current_status = 'reporting' THEN
        RETURN 'OPERATIONS';
    END IF;

    IF p_current_status = 'in_progress' THEN
        RETURN 'OPERATIONS';
    END IF;

    IF p_reviewer_decision = 'approve' THEN
        RETURN 'OPERATIONS';
    END IF;

    IF p_reviewer_decision IS NULL
       AND p_current_status IN ('submitted', 'open') THEN
        RETURN 'INTAKE';
    END IF;

    RETURN 'UNKNOWN';
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Extend Transition Engine
-- We'll add transitions for the trust-funnel
-- Note: fn_execute_request_transition is large, we should be careful.
-- I'll define a patch or just redefine it. Since it's a view/function, REDEFINE is safer for consistency.

-- But wait, I'll first add the communication templates.

INSERT INTO public.communication_templates (template_code, channel, language_code, subject_template, body_template)
VALUES 
    -- Arabic
    ('scope_confirmation_required', 'email', 'ar', 'مطلوب تأكيد نطاق الطلب - Findora', 'مرحباً {{customer_name}}، لقد قمنا بمراجعة طلبك رقم {{request_code}}. يرجى مراجعة عرض السعر ونطاق البحث المقترح والموافقة عليه لنبدأ العمل.'),
    ('preview_report_ready', 'email', 'ar', 'تقرير المعاينة جاهز - Findora', 'خبر جيد! انتهينا من البحث الأولي لطلبك {{request_code}}. يمكنك الآن معاينة النتائج وتفاصيل العروض قبل دفع رسوم الخدمة.'),
    ('unlock_payment_received', 'email', 'ar', 'تم فتح كامل تفاصيل الطلب - Findora', 'شكراً لك! تم تأكيد الدفع لطلب {{request_code}}. يمكنك الآن الوصول لجميع بيانات البائعين، الروابط، وأرقام التواصل.'),

    -- English
    ('scope_confirmation_required', 'email', 'en', 'Scope confirmation required - Findora', 'Hello {{customer_name}}, we have reviewed your request #{{request_code}}. Please review the proposed scope and pricing to proceed.'),
    ('preview_report_ready', 'email', 'en', 'Preview report is ready - Findora', 'Great news! Initial research for your request {{request_code}} is complete. You can now preview the results before paying the service fee.'),
    ('unlock_payment_received', 'email', 'en', 'Full request details unlocked - Findora', 'Thank you! Payment for request {{request_code}} has been confirmed. You now have full access to merchant details, links, and contact information.')

ON CONFLICT (template_code, channel, language_code) DO NOTHING;

-- 3. Add metadata columns for trust funnel to request_preferences if they don't exist
-- Actually, let's just use JSONB metadata on requests for these flags to keep it simple.

-- 4. Redefine fn_execute_request_transition to include trust-funnel steps
-- I'll add 'SEND_SCOPE_CONFIRMATION', 'CONFIRM_SCOPE', 'PUBLISH_PREVIEW_REPORT'
-- This will be a large block, I'll handle it in the execution phase.
