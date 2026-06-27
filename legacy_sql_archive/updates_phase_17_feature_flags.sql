-- ============================================================
-- PHASE 17: FINDORA System Feature Flags
-- Run this in Supabase SQL Editor
-- ============================================================

-- Insert feature flags into economy_config table
-- using a naming convention: flag_<feature_name>

INSERT INTO economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES

-- ─── BACKGROUND ENGINES ───────────────────────────────────
('flag_engine_fraud_audit',       'true',  'Fraud Audit Cron: Runs automated fraud checks on contributors & merchants', 'محرك فحص الاحتيال: يجري فحوصات احتيال تلقائية على المناديب والتجار', false),
('flag_engine_network_survival',  'true',  'Network Survival Cron: Heartbeat that checks scout availability and coverage', 'محرك نبضة الشبكة: يتحقق من توافر المناديب والتغطية الجغرافية', false),
('flag_engine_recalculate',       'true',  'Recalculate Networks Cron: Rebuilds the contributor-merchant-region graph', 'محرك إعادة حساب الشبكات: يعيد بناء شبكة المناديب والتجار والمناطق', false),
('flag_engine_task_recycler',     'true',  'Task Recycler Cron: Re-queues stale unclaimed tasks to prevent SLA loss', 'محرك إعادة تدوير المهام: يعيد طرح المهام القديمة لمنع خسائر SLA', false),
('flag_engine_trend_detector',    'true',  'Trend Detector Cron: Analyzes request patterns to detect demand trends', 'محرك كاشف الاتجاهات: يحلل أنماط الطلبات لاكتشاف اتجاهات الطلب', false),
('flag_engine_ai_pricing',        'true',  'AI Pricing Engine: Real-time dynamic pricing based on demand and supply', 'محرك التسعير AI: تسعير ديناميكي فوري بناءً على الطلب والعرض', false),
('flag_engine_scarcity',          'true',  'Scarcity Engine: Adjusts task bonuses when scout supply is low', 'محرك الندرة: يضبط مكافآت المهام عند انخفاض عرض المناديب', false),
('flag_engine_webhooks',          'true',  'Vendor Webhooks: Processes inbound/outbound events for vendor integrations', 'روابط الموردين: يعالج الأحداث الواردة والصادرة لتكاملات الموردين', false),

-- ─── PLATFORM FEATURES ────────────────────────────────────
('flag_vendor_self_upload',       'false', 'Vendor Portal: Allow vendors to upload their own products (future feature)', 'بوابة التجار الذاتية: السماح للتجار برفع منتجاتهم بأنفسهم (ميزة مستقبلية)', false),
('flag_scout_subscriptions',      'false', 'Scout Subscriptions: Enable paid subscription tiers for scouts', 'اشتراكات المناديب: تفعيل مستويات اشتراك مدفوعة للمناديب', false),
('flag_customer_reviews',         'true',  'Customer Reviews: Allow customers to submit public reviews on completed requests', 'تقييمات العملاء: السماح للعملاء بنشر تقييمات علنية للطلبات المكتملة', false),
('flag_gamification',             'true',  'Gamification Engine: XP, levels, badges and leaderboards for scouts', 'محرك الألعاب: XP والمستويات والشارات ولوحات الترتيب للمناديب', false),
('flag_ai_intake_review',         'true',  'AI Intake Review: Let the intake_reviewer agent auto-classify incoming requests', 'مراجعة الطلبات بالذكاء AI: السماح للوكيل بتصنيف الطلبات الواردة تلقائياً', false),
('flag_ai_pricing_suggestions',   'true',  'AI Pricing Suggestions: Show AI-generated price recommendations in workspace', 'اقتراحات تسعير AI: عرض توصيات الأسعار المولّدة بالذكاء في مساحة العمل', false),
('flag_marketplace_deals',        'true',  'Marketplace Deals: Enable the public deals/offers section for customers', 'عروض السوق: تفعيل قسم العروض والمنتجات العام للعملاء', false),
('flag_contributor_wallets',      'true',  'Contributor Wallets: Enable wallet & payout system for scouts', 'محافظ المناديب: تفعيل نظام المحافظ والمدفوعات للمناديب', false),
('flag_fraud_auto_suspend',       'true',  'Auto-Suspend on Fraud: Automatically suspend accounts flagged by the fraud engine', 'الإيقاف التلقائي للاحتيال: إيقاف الحسابات التي يرصدها محرك الاحتيال تلقائياً', false),
('flag_whatsapp_notifications',   'false', 'WhatsApp Notifications: Send order/status notifications via WhatsApp API', 'إشعارات واتساب: إرسال إشعارات الطلبات والحالة عبر API واتساب', false),
('flag_guest_checkout',           'true',  'Guest Checkout: Allow customers to create requests without registration', 'الدفع كضيف: السماح للعملاء بإنشاء طلبات بدون تسجيل', false),
('flag_simulated_payment',        'true',  'Simulated Payment: Use the checkout simulation flow (disable when real gateway is live)', 'الدفع التجريبي: استخدام تدفق محاكاة الدفع (يُوقف عند ربط البوابة الحقيقية)', false)

ON CONFLICT (config_key) DO NOTHING;
