-- ============================================================
-- 019_ai_control_panel.sql
-- Migration script for FINDORA AI Control & Feature Management Panel
-- ============================================================

-- 1. Extend economy_config table with status and limits columns
ALTER TABLE public.economy_config 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'enabled',
ADD COLUMN IF NOT EXISTS daily_limit integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_limit integer DEFAULT NULL;

-- 2. Create AI usage logs table for rate limit checking and auditing
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    success boolean NOT NULL,
    error_message text,
    estimated_cost numeric DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 3. Enable RLS on ai_usage_log
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access (using the existing fn_is_active_staff_7b checker)
DROP POLICY IF EXISTS "Staff read/write ai usage logs" ON public.ai_usage_log;
CREATE POLICY "Staff read/write ai usage logs" ON public.ai_usage_log
    FOR ALL TO authenticated
    USING (public.fn_is_active_staff_7b())
    WITH CHECK (public.fn_is_active_staff_7b());

-- 4. Seed/Update the 8 AI Features in economy_config
-- Using INSERT ... ON CONFLICT (config_key) DO UPDATE to add status/limit columns or insert if missing
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled, status, daily_limit, monthly_limit)
VALUES
  (
    'flag_ai_parse_request',
    'true',
    'AI Natural Language Sourcing Parsing: Parses customer natural language sourcing queries into structured specs.',
    'تحليل طلبات العملاء بالذكاء الاصطناعي: يحلل طلبات التوريد المكتوبة باللغة الطبيعية ويستخرج مواصفات المنتجات.',
    false,
    'enabled',
    1000,
    30000
  ),
  (
    'flag_ai_pricing_suggestions',
    'true',
    'AI Pricing Advisor: Recommends price ranges based on demand, supply, and request complexity.',
    'مستشار التسعير بالذكاء الاصطناعي: يقدم توصيات بالأسعار بناءً على الطلب والعرض ومدى تعقيد الطلب.',
    false,
    'enabled',
    1000,
    30000
  ),
  (
    'flag_ai_rfq_generation',
    'true',
    'AI B2B RFQ Generator: Auto-generates professional Request for Quote documents in Markdown.',
    'منشئ طلبات عروض الأسعار للشركات (B2B): ينشئ مستندات طلبات العروض المهنية تلقائياً.',
    false,
    'enabled',
    200,
    6000
  ),
  (
    'flag_ai_report_chat',
    'true',
    'Report Assistant Chatbot: Helps customers review sourcing options, compare quotes, and negotiate.',
    'مساعد تقارير التوريد: يساعد العميل في مراجعة ومقارنة الخيارات والتفاوض حولها.',
    false,
    'enabled',
    500,
    15000
  ),
  (
    'flag_ai_support_chat',
    'true',
    'Support & Dispute Chatbot: Handles customer inquiries, refunds, and merchant disputes.',
    'مساعد الدعم الفني وحل النزاعات: يتعامل مع استفسارات العملاء والنزاعات والطلبات.',
    false,
    'enabled',
    500,
    15000
  ),
  (
    'flag_ai_receipt_ocr',
    'true',
    'AI Receipt OCR Scanner: Automatically parses and verifies InstaPay payment receipts.',
    'قارئ إيصالات الدفع بالذكاء الاصطناعي: يتحقق تلقائياً من إيصالات الدفع عبر إنستاباي.',
    false,
    'enabled',
    200,
    6000
  ),
  (
    'flag_ai_demand_expansion',
    'true',
    'AI Demand Expansion: Auto-generates related tasks for gig workers to source accessories/alternatives.',
    'توسيع الطلب بالذكاء الاصطناعي: ينشئ مهام إضافية متصلة بالطلب للمناديب.',
    false,
    'enabled',
    500,
    15000
  ),
  (
    'flag_ai_copilot_agents',
    'true',
    'Workspace AI Copilots: Enables the 8 specialized agents (Intake Reviewer, Research Planner, etc.) in the workspace.',
    'مساعدو مساحة العمل بالذكاء الاصطناعي: يفعل الوكلاء الثمانية المتخصصين في مساحة العمل.',
    false,
    'enabled',
    2000,
    60000
  )
ON CONFLICT (config_key) DO UPDATE
SET 
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  status = COALESCE(economy_config.status, EXCLUDED.status),
  daily_limit = COALESCE(economy_config.daily_limit, EXCLUDED.daily_limit),
  monthly_limit = COALESCE(economy_config.monthly_limit, EXCLUDED.monthly_limit);

-- 5. Indexes for fast limit queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature_key ON public.ai_usage_log(feature_key);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_timestamp ON public.ai_usage_log(timestamp);
