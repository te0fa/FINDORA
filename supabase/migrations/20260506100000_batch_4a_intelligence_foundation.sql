-- Batch 4A — Admin Intelligence & Growth Data Foundation
-- Final Corrected Migration (Manual Apply Safe - Resolved Function Conflict)

-- 1. MERCHANT INTELLIGENCE FOUNDATION
-- NOTE: Existing projects may have a legacy 'name' text NOT NULL column in public.merchants.
-- New fields business_name_en/ar are added to support bilingual growth.

CREATE TABLE IF NOT EXISTS public.merchants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code text UNIQUE NOT NULL,
    business_name_en text, -- Made nullable to avoid blocking future imports
    business_name_ar text, -- Made nullable
    category text,
    governorate text,
    area text,
    address text,
    contact_person text,
    phone_number_primary text, -- Made nullable
    phone_number_secondary text,
    email text,
    website_url text,
    is_active boolean DEFAULT true,
    reliability_score numeric(5,2) DEFAULT 0,
    quality_score numeric(5,2) DEFAULT 0,
    average_response_speed_minutes integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_performance_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- 'quote_submitted', 'shortlisted', 'selected_by_customer', 'paid_conversion', 'issue_reported'
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_customer_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    is_verified_purchase boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_score_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    score numeric(5,2) NOT NULL,
    strengths text[],
    weaknesses text[],
    snapshot_data jsonb NOT NULL,
    calculated_at timestamptz DEFAULT now()
);

-- Add merchant_id to merchant_quotes (Safe & Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'merchant_quotes' AND column_name = 'merchant_id'
    ) THEN
        ALTER TABLE public.merchant_quotes ADD COLUMN merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 2. CUSTOMER INTELLIGENCE FOUNDATION

CREATE TABLE IF NOT EXISTS public.customer_intelligence_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    event_type text NOT NULL, -- 'request_created', 'request_completed', 'payment_made', 'contact_interaction'
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_score_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    seriousness_score numeric(5,2),
    loyalty_score numeric(5,2),
    conversion_score numeric(5,2),
    calculated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    segment_code text NOT NULL, -- 'VIP', 'NEW', 'REPEAT', 'CHURN_RISK'
    assigned_at timestamptz DEFAULT now(),
    UNIQUE(customer_id, segment_code)
);


-- 3. PLATFORM INTELLIGENCE FOUNDATION

CREATE TABLE IF NOT EXISTS public.platform_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL, -- 'visitor_landed', 'request_started', 'request_submitted', 'report_released', 'payment_recorded'
    actor_type text DEFAULT 'guest', -- 'guest', 'customer', 'staff', 'system'
    actor_id uuid, -- customer_id or staff_id
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamptz DEFAULT now()
);


-- 4. COMMUNICATION AUTOMATION FOUNDATION

CREATE TABLE IF NOT EXISTS public.communication_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code text NOT NULL, -- 'request_received', etc.
    channel text NOT NULL, -- 'email', 'whatsapp', 'telegram'
    language_code text NOT NULL DEFAULT 'ar', -- 'ar', 'en'
    subject_template text,
    body_template text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(template_code, channel, language_code)
);

CREATE TABLE IF NOT EXISTS public.outbound_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    template_code text,
    rendered_subject text,
    rendered_body text NOT NULL,
    status text NOT NULL DEFAULT 'draft', -- 'draft', 'queued', 'sent', 'failed', 'skipped'
    provider text,
    provider_message_id text,
    error_message text,
    scheduled_at timestamptz,
    sent_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
    preferred_channel text DEFAULT 'email',
    allow_marketing boolean DEFAULT true,
    allow_status_updates boolean DEFAULT true,
    language_preference text DEFAULT 'ar',
    updated_at timestamptz DEFAULT now()
);


-- 5. USEFUL INDEXES (Idempotent)

CREATE INDEX IF NOT EXISTS idx_merchant_perf_merchant_id ON public.merchant_performance_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_perf_request_id ON public.merchant_performance_events(request_id);
CREATE INDEX IF NOT EXISTS idx_merchant_perf_event_type ON public.merchant_performance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_merchant_perf_occurred_at ON public.merchant_performance_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_merchant_feedback_merchant_id ON public.merchant_customer_feedback(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_feedback_customer_id ON public.merchant_customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_merchant_feedback_request_id ON public.merchant_customer_feedback(request_id);

CREATE INDEX IF NOT EXISTS idx_merchant_scores_merchant_id ON public.merchant_score_snapshots(merchant_id);

CREATE INDEX IF NOT EXISTS idx_customer_intel_customer_id ON public.customer_intelligence_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_intel_request_id ON public.customer_intelligence_events(request_id);
CREATE INDEX IF NOT EXISTS idx_customer_intel_event_type ON public.customer_intelligence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_customer_intel_occurred_at ON public.customer_intelligence_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_customer_scores_customer_id ON public.customer_score_snapshots(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_customer_id ON public.customer_segments(customer_id);

CREATE INDEX IF NOT EXISTS idx_platform_events_event_type ON public.platform_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_events_request_id ON public.platform_events(request_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_customer_id ON public.platform_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_merchant_id ON public.platform_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_occurred_at ON public.platform_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_customer_id ON public.outbound_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_request_id ON public.outbound_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON public.outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_scheduled_at ON public.outbound_messages(scheduled_at);


-- 6. BILINGUAL SEED TEMPLATES (IDEMPOTENT)

INSERT INTO public.communication_templates (template_code, channel, language_code, subject_template, body_template)
VALUES 
    -- Arabic Templates
    ('request_received', 'email', 'ar', 'تم استلام طلبك - Findora', 'مرحباً {{customer_name}}، لقد استلمنا طلبك رقم {{request_code}} وهو الآن قيد المراجعة.'),
    ('request_accepted', 'email', 'ar', 'تمت الموافقة على طلبك - Findora', 'خبر جيد! تم قبول طلبك {{request_code}} وسنبدأ البحث فوراً.'),
    ('request_rejected', 'email', 'ar', 'تحديث بخصوص طلبك - Findora', 'نأسف لإبلاغك بأنه لا يمكننا تنفيذ طلبك {{request_code}} حالياً. السبب: {{reason}}'),
    ('clarification_needed', 'email', 'ar', 'مطلوب توضيح لطلبك - Findora', 'نحتاج إلى بعض المعلومات الإضافية لمتابعة طلبك {{request_code}}.'),
    ('research_started', 'email', 'ar', 'بدأنا البحث - Findora', 'بدأ فريقنا بالبحث عن أفضل الخيارات لطلبك {{request_code}}.'),
    ('report_preparing', 'email', 'ar', 'نعد تقريرك حالياً - Findora', 'نحن نقوم بجمع التفاصيل النهائية لطلبك {{request_code}}.'),
    ('report_ready', 'email', 'ar', 'تقريرك جاهز - Findora', 'لقد انتهينا من البحث! تقريرك لطلب {{request_code}} جاهز الآن للمعاينة.'),
    ('payment_required', 'email', 'ar', 'مطلوب إتمام الدفع - Findora', 'للوصول إلى تقريرك الكامل للطلب {{request_code}}، يرجى إتمام عملية الدفع.'),
    ('payment_received', 'email', 'ar', 'تم استلام الدفعة - Findora', 'شكراً لك! تم تأكيد استلام دفعتك لطلب {{request_code}}.'),
    ('post_purchase_followup', 'email', 'ar', 'كيف كانت تجربتك؟ - Findora', 'مرحباً {{customer_name}}، نأمل أن تكون سعيداً بنتائج طلبك {{request_code}}. كيف كانت تجربتك؟'),
    ('merchant_feedback_request', 'email', 'ar', 'شاركنا رأيك - Findora', 'يرجى إخبارنا عن تجربتك مع التاجر بخصوص الطلب {{request_code}}.'),
    ('reactivation_reminder', 'email', 'ar', 'نفتقدك! - Findora', 'لقد مر وقت طويل منذ طلبك الأخير. هل يمكننا مساعدتك في البحث عن شيء ما اليوم؟'),

    -- English Templates
    ('request_received', 'email', 'en', 'We have received your request - Findora', 'Hello {{customer_name}}, we have received your request #{{request_code}} and it is currently being reviewed.'),
    ('request_accepted', 'email', 'en', 'Your request has been accepted - Findora', 'Good news! Your request {{request_code}} has been accepted and we will start the search immediately.'),
    ('request_rejected', 'email', 'en', 'Update regarding your request - Findora', 'We regret to inform you that we cannot fulfill your request {{request_code}} at this time. Reason: {{reason}}'),
    ('clarification_needed', 'email', 'en', 'Action required for your request - Findora', 'We need some more information to proceed with your request {{request_code}}.'),
    ('research_started', 'email', 'en', 'Research started - Findora', 'Our team has started researching the best options for your request {{request_code}}.'),
    ('report_preparing', 'email', 'en', 'Preparing your report - Findora', 'We are compiling the final details for your request {{request_code}}.'),
    ('report_ready', 'email', 'en', 'Your report is ready - Findora', 'Great news! The research is complete. Your report for request {{request_code}} is now ready for viewing.'),
    ('payment_required', 'email', 'en', 'Payment required - Findora', 'To access your full report for request {{request_code}}, please complete the payment.'),
    ('payment_received', 'email', 'en', 'Payment received - Findora', 'Thank you! Your payment for request {{request_code}} has been confirmed.'),
    ('post_purchase_followup', 'email', 'en', 'How was your experience? - Findora', 'Hello {{customer_name}}, we hope you are happy with the results of your request {{request_code}}. How was your experience?'),
    ('merchant_feedback_request', 'email', 'en', 'Share your feedback - Findora', 'Please tell us about your experience with the merchant for request {{request_code}}.'),
    ('reactivation_reminder', 'email', 'en', 'We miss you! - Findora', 'It''s been a while since your last request. Can we help you find something today?')

ON CONFLICT (template_code, channel, language_code) DO NOTHING;


-- 7. RLS POLICIES

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;

-- Uniquely named helper function to avoid "not unique" conflicts in Batch 4A
CREATE OR REPLACE FUNCTION public.fn_is_active_staff_4a()
RETURNS boolean AS $fn$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_members
        WHERE auth_user_id = auth.uid() AND is_active = true
    );
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Idempotent Policy Creation Blocks
DO $$ 
BEGIN
    -- Merchant Policies (Staff Only)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchants' AND policyname = 'Staff manage merchants') THEN
        CREATE POLICY "Staff manage merchants" ON public.merchants FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Performance Events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_performance_events' AND policyname = 'Staff manage merchant events') THEN
        CREATE POLICY "Staff manage merchant events" ON public.merchant_performance_events FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Merchant Snapshots
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_score_snapshots' AND policyname = 'Staff manage merchant snapshots') THEN
        CREATE POLICY "Staff manage merchant snapshots" ON public.merchant_score_snapshots FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Customer Feedback
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_customer_feedback' AND policyname = 'Staff read feedback') THEN
        CREATE POLICY "Staff read feedback" ON public.merchant_customer_feedback FOR SELECT USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_customer_feedback' AND policyname = 'Customers manage own feedback') THEN
        CREATE POLICY "Customers manage own feedback" ON public.merchant_customer_feedback FOR ALL 
        USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));
    END IF;

    -- Customer Intelligence & Snapshots & Segments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_intelligence_events' AND policyname = 'Staff manage customer intel') THEN
        CREATE POLICY "Staff manage customer intel" ON public.customer_intelligence_events FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_score_snapshots' AND policyname = 'Staff manage customer snapshots') THEN
        CREATE POLICY "Staff manage customer snapshots" ON public.customer_score_snapshots FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_segments' AND policyname = 'Staff manage customer segments') THEN
        CREATE POLICY "Staff manage customer segments" ON public.customer_segments FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    -- Platform Events (Staff Read only)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_events' AND policyname = 'Staff read platform events') THEN
        CREATE POLICY "Staff read platform events" ON public.platform_events FOR SELECT USING (public.fn_is_active_staff_4a());
    END IF;

    -- Communication
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_templates' AND policyname = 'Staff manage communications') THEN
        CREATE POLICY "Staff manage communications" ON public.communication_templates FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'outbound_messages' AND policyname = 'Staff manage outbound') THEN
        CREATE POLICY "Staff manage outbound" ON public.outbound_messages FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'outbound_messages' AND policyname = 'Customers view own messages') THEN
        CREATE POLICY "Customers view own messages" ON public.outbound_messages FOR SELECT 
        USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));
    END IF;

    -- Preferences
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_preferences' AND policyname = 'Customers manage own prefs') THEN
        CREATE POLICY "Customers manage own prefs" ON public.communication_preferences FOR ALL
        USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_preferences' AND policyname = 'Staff read prefs') THEN
        CREATE POLICY "Staff read prefs" ON public.communication_preferences FOR SELECT USING (public.fn_is_active_staff_4a());
    END IF;

END $$;
