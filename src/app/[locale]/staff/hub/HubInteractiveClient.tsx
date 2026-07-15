'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface EngineCard {
  flagKey: string        // economy_config key like flag_engine_fraud_audit
  nameEn: string
  nameAr: string
  path: string
  impactLevel: 'core' | 'additional'
  descEn: string
  descAr: string
  affectsEn: string[]
  affectsAr: string[]
  icon: string
  color: string
}

interface FeatureFlag {
  flagKey: string
  labelEn: string
  labelAr: string
  descEn: string
  descAr: string
  detailsEn: string
  detailsAr: string
  impactLevel: 'core' | 'additional' | 'future'
  icon: string
  color: string
  category: string
}

interface DALCard {
  nameEn: string
  nameAr: string
  path: string
  descEn: string
  descAr: string
  featuresEn: string[]
  featuresAr: string[]
  icon: string
  color: string
  href?: string
}

interface AIAgent {
  agent_code: string
  enabled: boolean
  provider: string
  model: string | null
  temperature: number
  daily_limit: number
  allow_create_draft: boolean
  safety_level: string
}

// ─────────────────────────────────────────────────────────
// ENGINES DATA
// ─────────────────────────────────────────────────────────

const ENGINES: EngineCard[] = [
  {
    flagKey: 'flag_engine_fraud_audit',
    nameEn: 'Fraud Audit Cron', nameAr: 'فحص الاحتيال التلقائي',
    path: '/api/cron/fraud-audit', impactLevel: 'core',
    icon: '🛡️', color: '#ef4444',
    descEn: 'Runs automated fraud checks on contributors & merchants. Flags suspicious patterns and can auto-suspend accounts exceeding risk thresholds.',
    descAr: 'يجري فحوصات احتيال تلقائية على المناديب والتجار. يرصد الأنماط المشبوهة ويوقف الحسابات الخطرة تلقائياً.',
    affectsEn: ['Contributor trust scores', 'Merchant risk levels', 'Auto-suspension', 'Platform safety'],
    affectsAr: ['درجات ثقة المناديب', 'مستوى خطر التجار', 'الإيقاف التلقائي', 'أمان المنصة'],
  },
  {
    flagKey: 'flag_engine_network_survival',
    nameEn: 'Network Survival Cron', nameAr: 'نبضة شبكة المناديب',
    path: '/api/cron/network-survival', impactLevel: 'core',
    icon: '💓', color: '#22c55e',
    descEn: 'Heartbeat system for the contributor network. Detects inactive scouts and triggers supply warnings when coverage is low.',
    descAr: 'نبضة قلب شبكة المناديب. يكتشف المناديب غير النشطين ويطلق تحذيرات نقص التغطية الجغرافية.',
    affectsEn: ['Scout availability', 'Network health score', 'Supply warnings', 'Request assignment'],
    affectsAr: ['توافر المناديب', 'نقاط صحة الشبكة', 'تحذيرات نقص العرض', 'توزيع الطلبات'],
  },
  {
    flagKey: 'flag_engine_recalculate',
    nameEn: 'Recalculate Networks', nameAr: 'إعادة حساب الشبكات',
    path: '/api/cron/recalculate-networks', impactLevel: 'core',
    icon: '🔄', color: '#6366f1',
    descEn: 'Recalculates the full contributor-merchant-region network graph. Updates coverage maps and optimal assignment routing.',
    descAr: 'يعيد حساب شبكة المناديب والتجار والمناطق بالكامل. يحدّث خرائط التغطية وتوصيات التوزيع المثلى.',
    affectsEn: ['Assignment recommendations', 'Coverage maps', 'Request routing speed'],
    affectsAr: ['توصيات التوزيع', 'خرائط التغطية', 'سرعة توجيه الطلبات'],
  },
  {
    flagKey: 'flag_engine_task_recycler',
    nameEn: 'Task Recycler Cron', nameAr: 'إعادة تدوير المهام',
    path: '/api/cron/task-recycler', impactLevel: 'additional',
    icon: '♻️', color: '#f59e0b',
    descEn: 'Scans for stale or unclaimed tasks and re-queues them. Prevents tasks from dying in the system.',
    descAr: 'يفحص المهام القديمة أو غير المطالب بها ويعيد طرحها. يمنع موت المهام في النظام.',
    affectsEn: ['Task queue health', 'SLA compliance', 'Request completion rate'],
    affectsAr: ['صحة طابور المهام', 'الامتثال لـ SLA', 'معدل إتمام الطلبات'],
  },
  {
    flagKey: 'flag_engine_trend_detector',
    nameEn: 'Trend Detector Cron', nameAr: 'كاشف الاتجاهات',
    path: '/api/cron/trend-detector', impactLevel: 'additional',
    icon: '📈', color: '#a855f7',
    descEn: 'Analyzes request patterns to detect emerging demand trends. Feeds the intelligence dashboard and pricing recommendations.',
    descAr: 'يحلل أنماط الطلبات لاكتشاف الاتجاهات الناشئة. يُغذّي لوحة الذكاء وتوصيات التسعير.',
    affectsEn: ['Intelligence dashboard', 'Pricing recommendations', 'Deal suggestions'],
    affectsAr: ['لوحة الذكاء', 'توصيات التسعير', 'اقتراحات العروض'],
  },
  {
    flagKey: 'flag_engine_ai_pricing',
    nameEn: 'AI Pricing Engine', nameAr: 'محرك التسعير AI',
    path: '/api/ai/pricing', impactLevel: 'core',
    icon: '🤖', color: '#14b8a6',
    descEn: 'AI-powered dynamic pricing based on demand, scarcity, and supply. Directly sets service prices shown to customers.',
    descAr: 'تسعير ديناميكي مدعوم بالذكاء الاصطناعي بناءً على الطلب والندرة والعرض. يُحدّد الأسعار المعروضة للعملاء مباشرةً.',
    affectsEn: ['Request pricing', 'Contributor earnings', 'Platform revenue', 'Competitive position'],
    affectsAr: ['تسعير الطلبات', 'أرباح المناديب', 'إيرادات المنصة', 'الموقع التنافسي'],
  },
  {
    flagKey: 'flag_engine_scarcity',
    nameEn: 'Economy Scarcity Engine', nameAr: 'محرك الندرة الاقتصادية',
    path: '/api/contributors/scarcity', impactLevel: 'additional',
    icon: '⚖️', color: '#eab308',
    descEn: 'Adjusts task bonus multipliers when scout supply is low to incentivize engagement. Not required for base operations.',
    descAr: 'يضبط مضاعفات مكافأة المهام عند انخفاض عرض المناديب. ليس ضرورياً للعمليات الأساسية.',
    affectsEn: ['Task bonuses', 'Scout engagement', 'Supply-demand balance'],
    affectsAr: ['مكافآت المهام', 'تفاعل المناديب', 'توازن العرض والطلب'],
  },
  {
    flagKey: 'flag_engine_webhooks',
    nameEn: 'Vendor Webhooks', nameAr: 'روابط الموردين',
    path: '/api/webhooks/vendors', impactLevel: 'additional',
    icon: '🔗', color: '#64748b',
    descEn: 'Processes inbound & outbound webhook events for vendor integrations. Not needed unless vendors use external APIs.',
    descAr: 'يعالج أحداث الويب هوك للتكاملات مع الموردين. غير ضروري إلا إذا كان الموردون يستخدمون API خارجية.',
    affectsEn: ['Vendor product sync', 'Real-time price updates', 'Order confirmations'],
    affectsAr: ['مزامنة منتجات الموردين', 'تحديثات الأسعار الفورية', 'تأكيدات الطلبات'],
  },
]

// ─────────────────────────────────────────────────────────
// PLATFORM FEATURES
// ─────────────────────────────────────────────────────────

const PLATFORM_FEATURES: FeatureFlag[] = [
  {
    flagKey: 'flag_economy_stabilizer_active',
    labelEn: 'Economy Stabilizer Master Guard', labelAr: 'مفتاح موازن الاقتصاد العام',
    descEn: 'Master toggle to enable/disable all 5 economy stabilizer cron processes. Note: Requires Contributor Wallets to be enabled for actual payout stabilization logic to take effect.',
    descAr: 'مفتاح التشغيل الرئيسي لتفعيل أو تعطيل عمليات موازن الاقتصاد الـ 5 بالكامل. ملاحظة: يتطلب تفعيل نظام محافظ المناديب ليكون لمنطق موازنة المدفوعات تأثير فعلي.',
    detailsEn: 'When disabled, all 5 cron endpoints (fraud-audit, network-survival, recalculate-networks, task-recycler, trend-detector) will immediately halt execution and return a status showing they are disabled.',
    detailsAr: 'عند التعطيل، ستتوقف جميع مسارات الـ cron الـ 5 عن العمل فوراً وترجع حالة تفيد بتعطيل الموازن حتى لو استدعيت بمفتاح صحيح.',
    impactLevel: 'core', icon: '⚖️', color: '#3b82f6', category: 'contributors',
  },
  {
    flagKey: 'flag_marketplace_deals',
    labelEn: 'Public Marketplace Deals', labelAr: 'عروض السوق العام',
    descEn: 'Enables the /deals page visible to all customers', descAr: 'يُفعّل صفحة /deals المرئية لجميع العملاء',
    detailsEn: 'When enabled, customers can browse and purchase pre-packaged deals and products on the public deals page without going through the full request wizard.',
    detailsAr: 'عند التفعيل، يمكن للعملاء تصفح وشراء العروض والمنتجات الجاهزة في صفحة العروض العامة بدون المرور بمعالج الطلبات الكامل.',
    impactLevel: 'core', icon: '🏪', color: '#ec4899', category: 'product',
  },
  {
    flagKey: 'flag_vendor_self_upload',
    labelEn: 'Vendor Self-Upload Portal', labelAr: 'بوابة رفع الموردين الذاتية',
    descEn: 'Allow vendors to upload their own products independently', descAr: 'السماح للتجار برفع منتجاتهم بأنفسهم',
    detailsEn: 'FUTURE FEATURE: Gives registered vendors a dedicated portal to add/edit their own products and deals. Currently disabled — all products are entered by the FINDORA admin team for quality control.',
    detailsAr: 'ميزة مستقبلية: تمنح الموردين المسجلين بوابة مخصصة لإضافة/تعديل منتجاتهم وعروضهم. معطّلة حالياً — جميع المنتجات يُدخلها فريق FINDORA للتحكم في الجودة.',
    impactLevel: 'future', icon: '🚀', color: '#6366f1', category: 'product',
  },
  {
    flagKey: 'flag_scout_subscriptions',
    labelEn: 'Scout Subscription Tiers', labelAr: 'اشتراكات المناديب',
    descEn: 'Enable paid subscription plans for scouts', descAr: 'تفعيل خطط اشتراك مدفوعة للمناديب',
    detailsEn: 'FUTURE FEATURE: Allows scouts to subscribe to premium tiers (Silver, Gold, Platinum) that unlock higher earning limits, priority task access, and advanced analytics.',
    detailsAr: 'ميزة مستقبلية: تسمح للمناديب بالاشتراك في مستويات متميزة (فضي، ذهبي، بلاتيني) لفتح حدود ربح أعلى وأولوية وصول للمهام وتحليلات متقدمة.',
    impactLevel: 'future', icon: '⭐', color: '#eab308', category: 'contributors',
  },
  {
    flagKey: 'flag_contributor_wallets',
    labelEn: 'Contributor Wallets & Payouts', labelAr: 'محافظ المناديب والمدفوعات',
    descEn: 'Enable earning wallets and withdrawal system for scouts', descAr: 'تفعيل محافظ الأرباح ونظام السحب للمناديب',
    detailsEn: 'Core part of the contributor economy. When enabled, scouts earn EGP into their wallet for completed tasks and can request withdrawals. Disabling this freezes all payout operations.',
    detailsAr: 'جزء أساسي من اقتصاد المناديب. عند التفعيل، يربح المناديب جنيهات في محافظهم مقابل المهام المكتملة ويمكنهم طلب السحب. الإيقاف يُجمّد كل عمليات الدفع.',
    impactLevel: 'core', icon: '💳', color: '#22c55e', category: 'contributors',
  },
  {
    flagKey: 'flag_gamification',
    labelEn: 'Gamification Engine (XP & Badges)', labelAr: 'محرك الألعاب (XP والشارات)',
    descEn: 'XP points, level-up system, and badges for scouts', descAr: 'نقاط XP ونظام التطور والشارات للمناديب',
    detailsEn: 'When active, contributors earn XP for tasks, level up through tiers (Rookie → Expert), and unlock badges. Significantly boosts scout engagement and retention without affecting core request flow.',
    detailsAr: 'عند التفعيل، يكسب المناديب XP للمهام ويتقدمون في المستويات (مبتدئ → خبير) ويفتحون الشارات. يرفع تفاعل المناديب والاحتفاظ بهم بشكل كبير دون التأثير على تدفق الطلبات الأساسي.',
    impactLevel: 'additional', icon: '🎮', color: '#a855f7', category: 'contributors',
  },
  {
    flagKey: 'flag_ai_intake_review',
    labelEn: 'AI Auto-Review Intake Requests', labelAr: 'مراجعة الطلبات بالذكاء AI',
    descEn: 'Let the AI agent auto-classify and score incoming requests', descAr: 'السماح للوكيل AI بتصنيف وتقييم الطلبات الواردة تلقائياً',
    detailsEn: 'The intake_reviewer AI agent pre-screens all new requests for completeness, policy compliance, and quality. Reduces human reviewer workload significantly. Disabling requires all intake to be done manually.',
    detailsAr: 'وكيل الذكاء الاصطناعي يفحص جميع الطلبات الجديدة للاكتمال والامتثال والجودة مسبقاً. يقلل عبء المراجعة البشرية بشكل كبير. الإيقاف يتطلب مراجعة يدوية كاملة.',
    impactLevel: 'core', icon: '🔍', color: '#14b8a6', category: 'ai',
  },
  {
    flagKey: 'flag_ai_pricing_suggestions',
    labelEn: 'AI Pricing Suggestions in Workspace', labelAr: 'اقتراحات التسعير AI في مساحة العمل',
    descEn: 'Show AI price recommendations to staff during request processing', descAr: 'عرض توصيات الأسعار AI للموظفين أثناء معالجة الطلبات',
    detailsEn: 'Displays real-time AI-generated price suggestions in the workspace panel when staff are processing requests. Helps standardize pricing and reduces manual calculation time.',
    detailsAr: 'يعرض اقتراحات أسعار مُولَّدة بالذكاء الاصطناعي في لوحة مساحة العمل أثناء معالجة الطلبات. يساعد في توحيد التسعير وتقليل وقت الحسابات اليدوية.',
    impactLevel: 'additional', icon: '💲', color: '#6366f1', category: 'ai',
  },
  {
    flagKey: 'flag_fraud_auto_suspend',
    labelEn: 'Auto-Suspend Flagged Accounts', labelAr: 'الإيقاف التلقائي للحسابات المشبوهة',
    descEn: 'Automatically suspend accounts exceeding fraud risk thresholds', descAr: 'إيقاف الحسابات التي تتجاوز عتبة خطر الاحتيال تلقائياً',
    detailsEn: 'When the fraud engine flags an account exceeding the configured risk threshold, it is automatically suspended pending manual review. Disabling means manual suspension only.',
    detailsAr: 'عندما يُعلّم محرك الاحتيال حساباً يتجاوز عتبة الخطر المُعدّة، يُوقف تلقائياً في انتظار المراجعة اليدوية. الإيقاف يعني أن الإيقاف يدوي فقط.',
    impactLevel: 'core', icon: '🚨', color: '#ef4444', category: 'security',
  },
  {
    flagKey: 'flag_customer_reviews',
    labelEn: 'Customer Public Reviews', labelAr: 'تقييمات العملاء العلنية',
    descEn: 'Allow customers to submit public reviews on completed requests', descAr: 'السماح للعملاء بنشر تقييمات علنية للطلبات المكتملة',
    detailsEn: 'Enables the post-delivery review system. Customers receive a review link after request completion. Reviews feed into merchant and scout trust scores.',
    detailsAr: 'يُفعّل نظام التقييم بعد التسليم. يتلقى العملاء رابط تقييم بعد اكتمال الطلب. التقييمات تُغذّي درجات ثقة التجار والمناديب.',
    impactLevel: 'additional', icon: '⭐', color: '#f59e0b', category: 'product',
  },
  {
    flagKey: 'flag_guest_checkout',
    labelEn: 'Guest Checkout (No Registration)', labelAr: 'الشراء كضيف (بدون تسجيل)',
    descEn: 'Allow customers to create requests without creating an account', descAr: 'السماح للعملاء بإنشاء طلبات بدون تسجيل حساب',
    detailsEn: 'Customers can start a request by providing only a phone number. Significantly increases conversion rates. Disabling requires full registration before any request.',
    detailsAr: 'يمكن للعملاء بدء طلب بتقديم رقم هاتف فقط. يرفع معدلات التحويل بشكل كبير. الإيقاف يتطلب التسجيل الكامل قبل أي طلب.',
    impactLevel: 'core', icon: '👤', color: '#22c55e', category: 'product',
  },
  {
    flagKey: 'flag_simulated_payment',
    labelEn: 'Simulated Payment Mode', labelAr: 'وضع الدفع التجريبي',
    descEn: 'Use checkout simulation instead of real payment gateway', descAr: 'استخدام محاكاة الدفع بدلاً من بوابة الدفع الحقيقية',
    detailsEn: 'Replaces the real payment gateway with a simulation screen that always succeeds. DISABLE this when the real payment gateway (Paymob/Stripe) is integrated and live.',
    detailsAr: 'يستبدل بوابة الدفع الحقيقية بشاشة محاكاة تنجح دائماً. أوقف هذا عند دمج وتشغيل بوابة الدفع الحقيقية (Paymob/Stripe).',
    impactLevel: 'core', icon: '💳', color: '#f59e0b', category: 'payments',
  },
  {
    flagKey: 'flag_whatsapp_notifications',
    labelEn: 'WhatsApp Notifications', labelAr: 'إشعارات واتساب',
    descEn: 'Send order & status notifications via WhatsApp API', descAr: 'إرسال إشعارات الطلبات والحالة عبر API واتساب',
    detailsEn: 'FUTURE FEATURE: Enables automated WhatsApp messages to customers and scouts for order confirmations, status updates, and payment receipts. Requires WhatsApp Business API setup.',
    detailsAr: 'ميزة مستقبلية: يُفعّل رسائل واتساب التلقائية للعملاء والمناديب لتأكيدات الطلبات وتحديثات الحالة ووصولات الدفع. يتطلب إعداد WhatsApp Business API.',
    impactLevel: 'future', icon: '📱', color: '#25d366', category: 'communications',
  },
]

// ─────────────────────────────────────────────────────────
// DAL CARDS
// ─────────────────────────────────────────────────────────

const DAL_CARDS: DALCard[] = [
  { nameEn: 'Staff DAL', nameAr: 'بيانات الموظفين', path: 'src/lib/dal/staff.ts', icon: '👥', color: '#6366f1',
    descEn: 'Manages all staff data, permissions, roles, global KPI stats, and performance metrics. Used in every staff-facing page.',
    descAr: 'يدير بيانات الموظفين والصلاحيات والأدوار وإحصاءات KPI العالمية ومقاييس الأداء. يُسخدم في كل صفحة للموظفين.',
    featuresEn: ['Staff members CRUD', 'Role & permission control', 'Global KPI aggregation', 'Performance review'],
    featuresAr: ['إنشاء/قراءة/تحديث/حذف الموظفين', 'التحكم في الأدوار والصلاحيات', 'تجميع KPI العالمية', 'تقييم الأداء'],
    href: '/staff/users'
  },
  { nameEn: 'Contributors DAL', nameAr: 'بيانات المناديب', path: 'src/lib/dal/contributors.ts', icon: '🌍', color: '#22c55e',
    descEn: 'Scout profiles, applications, wallet operations, submission reviews, and economy stabilizer controls.',
    descAr: 'ملفات المناديب والطلبات وعمليات المحافظ ومراجعات التقديمات وضوابط موازن الاقتصاد.',
    featuresEn: ['Scout profiles & wallets', 'Application processing', 'Submission quality review', 'Economy levers'],
    featuresAr: ['ملفات المناديب والمحافظ', 'معالجة الطلبات', 'مراجعة جودة التقديمات', 'ضوابط الاقتصاد'],
    href: '/staff/contributors'
  },
  { nameEn: 'Finance DAL', nameAr: 'بيانات المالية', path: 'src/lib/dal/finance.ts', icon: '💰', color: '#eab308',
    descEn: 'Full financial ledger — income/expense tracking, summaries, and ERP transaction records.',
    descAr: 'دفتر الأستاذ المالي الكامل — تتبع الدخل والمصروفات والملخصات وسجلات معاملات ERP.',
    featuresEn: ['Transaction ledger', 'Income/expense summary', 'Financial categories', 'ERP reporting'],
    featuresAr: ['دفتر المعاملات', 'ملخص الدخل والمصروفات', 'الفئات المالية', 'تقارير ERP'],
    href: '/staff/finance/transactions'
  },
  { nameEn: 'Marketplace DAL', nameAr: 'بيانات السوق', path: 'src/lib/dal/marketplace.ts', icon: '🏪', color: '#ec4899',
    descEn: 'Vendor management, product listings, deals publishing, and dynamic commission calculation.',
    descAr: 'إدارة الموردين وقوائم المنتجات ونشر العروض وحساب العمولة الديناميكية.',
    featuresEn: ['Vendor CRUD', 'Product & deal management', 'Commission engine', 'Deal publishing'],
    featuresAr: ['إدارة الموردين', 'إدارة المنتجات والعروض', 'محرك العمولة', 'نشر العروض'],
    href: '/staff/marketplace'
  },
  { nameEn: 'AI Control DAL', nameAr: 'التحكم في AI', path: 'src/lib/dal/ai-control.ts', icon: '🧠', color: '#a855f7',
    descEn: 'Enable/disable AI agents, set rate limits, manage prompt versions, and audit copilot run logs.',
    descAr: 'تفعيل/إيقاف وكلاء AI وضبط الحدود وإدارة إصدارات التعليمات ومراجعة سجلات التشغيل.',
    featuresEn: ['Agent enable/disable', 'Rate limiting', 'Prompt versioning', 'Usage audit log'],
    featuresAr: ['تفعيل/إيقاف الوكلاء', 'الحد اليومي', 'إصدار التعليمات', 'سجل الاستخدام'],
    href: '/staff/ai-control'
  },
  { nameEn: 'Vendors DAL', nameAr: 'بيانات الموردين', path: 'src/lib/dal/vendors.ts', icon: '🏢', color: '#f97316',
    descEn: 'Full vendor lifecycle — registration, activation, trust scoring, suspension, messaging, and archive.',
    descAr: 'دورة حياة الموردين الكاملة — التسجيل والتفعيل والثقة والإيقاف والمراسلة والأرشفة.',
    featuresEn: ['Vendor registration & activation', 'Trust score management', 'Suspend/archive', 'Messaging'],
    featuresAr: ['تسجيل وتفعيل الموردين', 'إدارة نقاط الثقة', 'الإيقاف والأرشفة', 'المراسلة'],
    href: '/staff/vendors'
  },
  { nameEn: 'Marketing DAL', nameAr: 'بيانات التسويق', path: 'src/lib/dal/marketing.ts', icon: '📢', color: '#ef4444',
    descEn: 'News, deals, pricing plans, and promotional content management for the public-facing platform.',
    descAr: 'إدارة الأخبار والعروض وخطط الأسعار والمحتوى الترويجي للمنصة العامة.',
    featuresEn: ['News/article CRUD', 'Deals management', 'Pricing plan control', 'Content publishing'],
    featuresAr: ['إدارة الأخبار', 'إدارة العروض', 'التحكم في خطط الأسعار', 'نشر المحتوى'],
    href: '/staff/marketing/pricing'
  },
  { nameEn: 'Payments DAL', nameAr: 'بيانات المدفوعات', path: 'src/lib/dal/payments.ts', icon: '💳', color: '#06b6d4',
    descEn: 'Payment gateway integrations, transaction logging, payment status, and payout processing.',
    descAr: 'تكاملات بوابات الدفع وتسجيل المعاملات وحالة الدفع ومعالجة المدفوعات.',
    featuresEn: ['Payment gateway logs', 'Transaction tracking', 'Payout processing', 'Gateway config'],
    featuresAr: ['سجلات بوابة الدفع', 'تتبع المعاملات', 'معالجة المدفوعات', 'إعداد البوابة'],
    href: '/staff/payments'
  },
  { nameEn: 'Requests DAL', nameAr: 'بيانات الطلبات', path: 'src/lib/dal/requests.ts', icon: '📋', color: '#8b5cf6',
    descEn: 'Request lifecycle — creation, state transitions, assignment, review decisions, and archival.',
    descAr: 'دورة حياة الطلبات — الإنشاء والانتقالات والتوزيع وقرارات المراجعة والأرشفة.',
    featuresEn: ['Request creation & state flow', 'Assignment engine', 'Reviewer decisions', 'Archive management'],
    featuresAr: ['إنشاء الطلبات وتدفق الحالة', 'محرك التوزيع', 'قرارات المراجع', 'إدارة الأرشيف'],
    href: '/staff/queue'
  },
  { nameEn: 'Performance DAL', nameAr: 'بيانات الأداء', path: 'src/lib/dal/performance.ts', icon: '📊', color: '#10b981',
    descEn: 'Calculates staff throughput, SLA compliance, and queue performance metrics.',
    descAr: 'يحسب إنتاجية الموظفين والامتثال لـ SLA ومقاييس أداء الطابور.',
    featuresEn: ['Queue performance metrics', 'Staff throughput', 'SLA tracking', 'Pipeline analytics'],
    featuresAr: ['مقاييس أداء الطابور', 'إنتاجية الموظفين', 'تتبع SLA', 'تحليلات خط الأنابيب'],
    href: '/staff/performance'
  },
  { nameEn: 'Reports DAL', nameAr: 'بيانات التقارير', path: 'src/lib/dal/reports.ts', icon: '📄', color: '#64748b',
    descEn: 'Client report lifecycle — snapshots, PDF generation, delivery status, and versioning.',
    descAr: 'دورة حياة تقارير العملاء — اللقطات وإنشاء PDF وحالة التسليم والإصدار.',
    featuresEn: ['Report snapshots', 'PDF generation', 'Delivery tracking', 'Report versioning'],
    featuresAr: ['لقطات التقارير', 'إنشاء PDF', 'تتبع التسليم', 'إصدار التقارير'],
    href: '/staff/archive'
  },
  { nameEn: 'Intelligence DAL', nameAr: 'بيانات الذكاء', path: 'src/lib/dal/intelligence.ts', icon: '📡', color: '#14b8a6',
    descEn: 'Logs and retrieves intelligence events for merchants, customers, and the platform.',
    descAr: 'يسجل ويسترجع أحداث الذكاء للتجار والعملاء والمنصة.',
    featuresEn: ['Merchant event logging', 'Customer intel events', 'Platform event tracking'],
    featuresAr: ['تسجيل أحداث التجار', 'أحداث ذكاء العملاء', 'تتبع أحداث المنصة'],
    href: '/staff/intelligence'
  },
]

// ─────────────────────────────────────────────────────────
// AI AGENT META
// ─────────────────────────────────────────────────────────

const AGENT_META: Record<string, { icon: string; labelEn: string; labelAr: string; descEn: string; descAr: string; impactLevel: 'core' | 'additional' }> = {
  intake_reviewer: { icon: '🔍', labelEn: 'Intake Reviewer', labelAr: 'مراجع الطلبات',
    descEn: 'Auto-classifies incoming requests for quality & policy compliance. Core to the intake pipeline.',
    descAr: 'يُصنّف الطلبات الواردة تلقائياً للجودة والامتثال. أساسي في خط الاستقبال.',
    impactLevel: 'core' },
  pricing_advisor: { icon: '💲', labelEn: 'Pricing Advisor', labelAr: 'مستشار التسعير',
    descEn: 'Calculates optimal price suggestions based on demand and supply dynamics.',
    descAr: 'يحسب اقتراحات السعر المثلى بناءً على ديناميكيات العرض والطلب.',
    impactLevel: 'core' },
  research_planner: { icon: '🗺️', labelEn: 'Research Planner', labelAr: 'مخطط البحث',
    descEn: 'Creates structured research plans for complex requests, breaking them into scout subtasks.',
    descAr: 'ينشئ خطط بحث منظمة للطلبات المعقدة ويقسّمها إلى مهام فرعية للمناديب.',
    impactLevel: 'additional' },
  research_retriever: { icon: '🔎', labelEn: 'Research Retriever', labelAr: 'مستخرج البيانات',
    descEn: 'Fetches data from external sources to enrich research submissions.',
    descAr: 'يجلب البيانات من المصادر الخارجية لإثراء تقديمات البحث.',
    impactLevel: 'additional' },
  report_writer: { icon: '✍️', labelEn: 'Report Writer', labelAr: 'كاتب التقارير',
    descEn: 'Assembles collected research into polished, client-ready report drafts.',
    descAr: 'يجمع بيانات البحث في مسودات تقارير احترافية جاهزة للعميل.',
    impactLevel: 'additional' },
  communication_drafter: { icon: '💬', labelEn: 'Communication Drafter', labelAr: 'كاتب المراسلات',
    descEn: 'Drafts outbound messages to clients and merchants for status updates.',
    descAr: 'يُعدّ الرسائل الصادرة للعملاء والتجار لتحديثات الحالة.',
    impactLevel: 'additional' },
  trust_safety_checker: { icon: '🛡️', labelEn: 'Trust & Safety Checker', labelAr: 'مدقق الأمان والثقة',
    descEn: 'Validates content, flags policy violations, and scores trust levels in real time.',
    descAr: 'يتحقق من المحتوى ويرصد انتهاكات السياسة ويقيّم مستويات الثقة فورياً.',
    impactLevel: 'core' },
  dashboard_insights: { icon: '📊', labelEn: 'Dashboard Insights', labelAr: 'رؤى لوحة التحكم',
    descEn: 'Generates AI insights and anomaly alerts for the executive dashboard.',
    descAr: 'يُنشئ رؤى AI وتنبيهات الشذوذ للوحة التنفيذية.',
    impactLevel: 'additional' },
}

// ─────────────────────────────────────────────────────────
// TOOLTIP PORTAL
// ─────────────────────────────────────────────────────────

function useTooltip() {
  const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const show = useCallback((content: React.ReactNode, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      content,
      x: Math.min(rect.left, window.innerWidth - 380),
      y: rect.bottom + 10,
    })
  }, [])

  const hide = useCallback(() => setTooltip(null), [])

  const Portal = tooltip ? (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: tooltip.y,
        left: Math.max(8, tooltip.x),
        zIndex: 99999,
        width: 360,
        background: 'rgba(3,7,20,0.98)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 18,
        padding: '18px 20px',
        backdropFilter: 'blur(28px)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.7)',
        pointerEvents: 'none',
      }}
    >
      {tooltip.content}
    </div>
  ) : null

  return { show, hide, Portal }
}

// ─────────────────────────────────────────────────────────
// TOGGLE SWITCH
// ─────────────────────────────────────────────────────────

function ToggleSwitch({ on, loading, onChange, disabled }: { on: boolean; loading?: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || loading}
      style={{
        position: 'relative',
        width: 44, height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? '#22c55e' : 'rgba(100,116,139,0.5)',
        transition: 'background 0.3s',
        opacity: loading ? 0.6 : 1,
        flexShrink: 0,
        outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: on ? 23 : 3,
        width: 18, height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.3s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'block',
      }} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────

export default function HubInteractiveClient({
  isRTL,
  locale,
  agentConfigs,
  initialFlags = {},
}: {
  isRTL: boolean
  locale: string
  agentConfigs: AIAgent[]
  initialFlags?: Record<string, boolean>
}) {
  // Merge DB flags with sensible defaults (engines default ON, future features default OFF)
  const defaultFlags: Record<string, boolean> = {}
  ENGINES.forEach(e => { defaultFlags[e.flagKey] = true })
  PLATFORM_FEATURES.forEach(f => { defaultFlags[f.flagKey] = f.impactLevel !== 'future' })

  const [agents, setAgents] = useState<AIAgent[]>(agentConfigs)
  const [flags, setFlags] = useState<Record<string, boolean>>({ ...defaultFlags, ...initialFlags })
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const { show, hide, Portal } = useTooltip()

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Toggle feature flag (engine or platform feature)
  const toggleFlag = async (key: string) => {
    const current = flags[key] ?? false
    setLoadingKey(key)
    try {
      const res = await fetch('/api/staff/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_key: key, value: !current }),
      })
      if (res.ok) {
        setFlags(prev => ({ ...prev, [key]: !current }))
        showToast(!current ? (isRTL ? '✅ تم التفعيل' : '✅ Enabled') : (isRTL ? '🔴 تم الإيقاف' : '🔴 Disabled'))
      } else {
        showToast(isRTL ? '❌ فشل التحديث' : '❌ Update failed', 'err')
      }
    } catch {
      showToast(isRTL ? '❌ خطأ في الاتصال' : '❌ Connection error', 'err')
    }
    setLoadingKey(null)
  }

  // Toggle AI agent
  const toggleAgent = async (agentCode: string) => {
    const current = agents.find(a => a.agent_code === agentCode)?.enabled ?? false
    setLoadingKey(agentCode)
    try {
      const res = await fetch('/api/staff/ai-agents/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_code: agentCode, enabled: !current }),
      })
      if (res.ok) {
        setAgents(prev => prev.map(a => a.agent_code === agentCode ? { ...a, enabled: !current } : a))
        showToast(!current ? (isRTL ? '✅ الوكيل مفعّل' : '✅ Agent enabled') : (isRTL ? '🔴 الوكيل موقوف' : '🔴 Agent disabled'))
      } else {
        showToast(isRTL ? '❌ فشل التحديث' : '❌ Update failed', 'err')
      }
    } catch {
      showToast(isRTL ? '❌ خطأ في الاتصال' : '❌ Connection error', 'err')
    }
    setLoadingKey(null)
  }

  // ── CSS ────────────────────────────────────────────────
  const css = `
    .hic-root { direction: ${isRTL ? 'rtl' : 'ltr'}; }

    /* ── SECTION HEADING ── */
    .hic-heading {
      font-size: 0.68rem;
      font-weight: 800;
      color: rgba(255,255,255,0.28);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 44px 0 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hic-heading::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.05);
    }

    /* ── GENERIC GRID ── */
    .hic-grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
    }
    .hic-grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }

    /* ── CARD BASE ── */
    .hic-card {
      background: rgba(8,14,32,0.75);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
      cursor: pointer;
      position: relative;
      text-decoration: none;
    }
    .hic-card:hover {
      border-color: rgba(255,255,255,0.15);
      background: rgba(15,25,55,0.85);
      transform: translateY(-2px);
    }

    .hic-card-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .hic-card-body { flex: 1; min-width: 0; }
    .hic-card-name {
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hic-card-sub {
      font-size: 0.6rem;
      color: rgba(255,255,255,0.22);
      font-family: monospace;
      margin-top: 2px;
    }
    .hic-card-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* STATUS DOT */
    .hic-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .hic-dot.on { background: #22c55e; animation: dot-pulse 2s infinite; }
    .hic-dot.off { background: rgba(100,116,139,0.6); }
    @keyframes dot-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50% { opacity:0.5; transform:scale(0.8); }
    }

    /* ── FEATURE FLAG CARD ── */
    .hic-flag-card {
      background: rgba(8,14,32,0.75);
      border-radius: 18px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s, transform 0.15s;
    }
    .hic-flag-card:hover {
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-2px);
    }
    .hic-flag-top {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .hic-flag-icon-box {
      width: 40px; height: 40px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .hic-flag-label {
      font-size: 0.82rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.3;
    }
    .hic-flag-desc {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.38);
      line-height: 1.4;
      margin-top: 2px;
    }
    .hic-flag-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 10px;
    }
    .hic-flag-status {
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hic-badge {
      font-size: 0.58rem;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ── AGENT CARD ── */
    .hic-agent-card {
      background: rgba(8,14,32,0.75);
      border-radius: 18px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s, transform 0.15s;
    }
    .hic-agent-card:hover {
      transform: translateY(-2px);
    }
    .hic-agent-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .hic-agent-icon {
      width: 42px; height: 42px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .hic-agent-name { font-size: 0.84rem; font-weight: 800; color: #fff; }
    .hic-agent-code { font-size: 0.6rem; color: rgba(255,255,255,0.25); font-family: monospace; margin-top: 2px; }
    .hic-agent-desc { font-size: 0.7rem; color: rgba(255,255,255,0.42); line-height: 1.45; }
    .hic-agent-meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .hic-agent-tag {
      font-size: 0.6rem; font-weight: 700;
      padding: 2px 8px; border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.35);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .hic-agent-footer {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 10px;
    }

    /* ── TOOLTIP INNER ── */
    .tip-h { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .tip-icon { font-size:1.4rem; }
    .tip-title { font-size:0.88rem; font-weight:800; color:#fff; }
    .tip-bdg { font-size:0.58rem; font-weight:900; padding:2px 7px; border-radius:999px; text-transform:uppercase; }
    .tip-desc { font-size:0.72rem; color:rgba(255,255,255,0.5); line-height:1.55; margin-bottom:12px; }
    .tip-lbl { font-size:0.6rem; font-weight:800; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; }
    .tip-tags { display:flex; flex-wrap:wrap; gap:5px; }
    .tip-tag { font-size:0.6rem; font-weight:700; padding:3px 9px; border-radius:999px; background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.55); border:1px solid rgba(255,255,255,0.08); }

    /* ── TOAST ── */
    .hic-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: rgba(3,7,20,0.97);
      border: 1px solid rgba(255,255,255,0.13);
      color: #fff;
      padding: 11px 24px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: toast-pop 0.25s ease;
    }
    @keyframes toast-pop {
      from { opacity:0; transform:translateX(-50%) translateY(10px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
  `

  // Build tooltip content helper
  const engineTip = (eng: EngineCard) => (
    <div>
      <div className="tip-h">
        <span className="tip-icon">{eng.icon}</span>
        <span className="tip-title">{isRTL ? eng.nameAr : eng.nameEn}</span>
        <span className="tip-bdg" style={eng.impactLevel === 'core'
          ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }
          : { background: 'rgba(99,102,241,.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.2)' }}>
          {eng.impactLevel === 'core' ? (isRTL ? '⚠️ أساسي' : '⚠️ CORE') : (isRTL ? 'إضافي' : 'ADDITIONAL')}
        </span>
      </div>
      <p className="tip-desc">{isRTL ? eng.descAr : eng.descEn}</p>
      <div className="tip-lbl">{isRTL ? 'يؤثر على:' : 'Affects:'}</div>
      <div className="tip-tags">
        {(isRTL ? eng.affectsAr : eng.affectsEn).map((a, i) => <span key={i} className="tip-tag">{a}</span>)}
      </div>
    </div>
  )

  const dalTip = (dal: DALCard) => (
    <div>
      <div className="tip-h">
        <span className="tip-icon">{dal.icon}</span>
        <span className="tip-title">{isRTL ? dal.nameAr : dal.nameEn}</span>
      </div>
      <p className="tip-desc">{isRTL ? dal.descAr : dal.descEn}</p>
      <div className="tip-lbl">{isRTL ? 'الوظائف المتاحة:' : 'Available functions:'}</div>
      <div className="tip-tags">
        {(isRTL ? dal.featuresAr : dal.featuresEn).map((f, i) => <span key={i} className="tip-tag">{f}</span>)}
      </div>
      <div style={{ marginTop: 10, fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>📁 {dal.path}</div>
    </div>
  )

  const featureTip = (f: FeatureFlag) => (
    <div>
      <div className="tip-h">
        <span className="tip-icon">{f.icon}</span>
        <span className="tip-title">{isRTL ? f.labelAr : f.labelEn}</span>
        <span className="tip-bdg" style={
          f.impactLevel === 'core' ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }
          : f.impactLevel === 'future' ? { background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.25)' }
          : { background: 'rgba(234,179,8,.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,.2)' }
        }>
          {f.impactLevel === 'core' ? (isRTL ? '⚠️ أساسي' : '⚠️ CORE')
            : f.impactLevel === 'future' ? (isRTL ? '🚀 مستقبلي' : '🚀 FUTURE')
            : (isRTL ? 'إضافي' : 'ADDITIONAL')}
        </span>
      </div>
      <p className="tip-desc">{isRTL ? f.detailsAr : f.detailsEn}</p>
    </div>
  )

  const agentTip = (agent: AIAgent) => {
    const meta = AGENT_META[agent.agent_code]
    if (!meta) return null
    return (
      <div>
        <div className="tip-h">
          <span className="tip-icon">{meta.icon}</span>
          <span className="tip-title">{isRTL ? meta.labelAr : meta.labelEn}</span>
          <span className="tip-bdg" style={meta.impactLevel === 'core'
            ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }
            : { background: 'rgba(99,102,241,.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.2)' }}>
            {meta.impactLevel === 'core' ? (isRTL ? '⚠️ أساسي' : '⚠️ CORE') : (isRTL ? 'إضافي' : 'ADDITIONAL')}
          </span>
        </div>
        <p className="tip-desc">{isRTL ? meta.descAr : meta.descEn}</p>
        <div className="tip-lbl">{isRTL ? 'الإعدادات الحالية:' : 'Current config:'}</div>
        <div className="tip-tags">
          <span className="tip-tag">📦 {agent.provider}</span>
          <span className="tip-tag">🌡️ temp: {agent.temperature}</span>
          <span className="tip-tag">📅 {agent.daily_limit}/day</span>
          <span className="tip-tag">🔒 {agent.safety_level}</span>
        </div>
      </div>
    )
  }

  // Feature category groups for display
  const flagCategories = [
    { id: 'product', labelEn: '🛍️ Product Features', labelAr: '🛍️ ميزات المنتج' },
    { id: 'contributors', labelEn: '🌍 Contributor Economy', labelAr: '🌍 اقتصاد المناديب' },
    { id: 'ai', labelEn: '🤖 AI Features', labelAr: '🤖 ميزات الذكاء الاصطناعي' },
    { id: 'security', labelEn: '🔐 Security & Trust', labelAr: '🔐 الأمان والثقة' },
    { id: 'payments', labelEn: '💳 Payments', labelAr: '💳 المدفوعات' },
    { id: 'communications', labelEn: '📱 Communications', labelAr: '📱 التواصل' },
  ]

  return (
    <div className="hic-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {Portal}
      {toast && <div className="hic-toast" style={toast.type === 'err' ? { borderColor: 'rgba(239,68,68,.4)', color: '#fca5a5' } : {}}>{toast.msg}</div>}

      {/* ══════════════════════════════════════════
          BACKGROUND ENGINES — with hover + toggle
      ══════════════════════════════════════════ */}
      <div className="hic-heading">
        {isRTL ? '⚙️ المحركات الخلفية — اوقف لشرح، فعّل أو أوقف مباشرة' : '⚙️ Background Engines — Hover for details, toggle to control'}
      </div>
      <div className="hic-grid-4">
        {ENGINES.map(eng => {
          const isOn = flags[eng.flagKey] ?? true
          const isLoading = loadingKey === eng.flagKey
          return (
            <div
              key={eng.flagKey}
              className="hic-card"
              style={{ borderColor: isOn ? `${eng.color}33` : 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => show(engineTip(eng), e)}
              onMouseLeave={hide}
            >
              <span className="hic-card-icon">{eng.icon}</span>
              <div className="hic-card-body">
                <div className="hic-card-name">{isRTL ? eng.nameAr : eng.nameEn}</div>
                <div className="hic-card-sub">{eng.path}</div>
              </div>
              <div className="hic-card-right">
                <span className="hic-dot" style={{ background: isOn ? eng.color : 'rgba(100,116,139,0.5)', animation: isOn ? 'dot-pulse 2s infinite' : 'none' }} />
                <ToggleSwitch on={isOn} loading={isLoading} onChange={() => toggleFlag(eng.flagKey)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════
          PLATFORM FEATURE FLAGS — grouped by category
      ══════════════════════════════════════════ */}
      <div className="hic-heading">
        {isRTL ? '🎛️ إعدادات ميزات المنصة — اوقف لشرح، فعّل أو أوقف مباشرة' : '🎛️ Platform Feature Flags — Hover for details, toggle to control'}
      </div>

      {flagCategories.map(cat => {
        const catFeatures = PLATFORM_FEATURES.filter(f => f.category === cat.id)
        if (catFeatures.length === 0) return null
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              {isRTL ? cat.labelAr : cat.labelEn}
            </div>
            <div className="hic-grid-3">
              {catFeatures.map(f => {
                const isOn = flags[f.flagKey] ?? false
                const isLoading = loadingKey === f.flagKey
                const isFuture = f.impactLevel === 'future'
                return (
                  <div
                    key={f.flagKey}
                    className="hic-flag-card"
                    style={{
                      border: `1px solid ${isOn ? f.color + '33' : 'rgba(255,255,255,0.07)'}`,
                      opacity: isFuture && !isOn ? 0.75 : 1,
                    }}
                    onMouseEnter={e => show(featureTip(f), e)}
                    onMouseLeave={hide}
                  >
                    <div className="hic-flag-top">
                      <div className="hic-flag-icon-box" style={{ background: isOn ? f.color + '20' : 'rgba(255,255,255,0.04)' }}>
                        {f.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="hic-flag-label">{isRTL ? f.labelAr : f.labelEn}</div>
                        <div className="hic-flag-desc">{isRTL ? f.descAr : f.descEn}</div>
                      </div>
                    </div>
                    <div className="hic-flag-footer">
                      <div className="hic-flag-status" style={{ color: isOn ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                        <span className="hic-dot" style={{ display: 'inline-block', background: isOn ? '#22c55e' : 'rgba(100,116,139,0.4)', animation: isOn ? 'dot-pulse 2s infinite' : 'none' }} />
                        {isOn ? (isRTL ? 'مفعّل' : 'On') : (isRTL ? 'موقوف' : 'Off')}
                        {isFuture && (
                          <span className="hic-badge" style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,.2)', marginInlineStart: 6 }}>
                            {isRTL ? '🚀 مستقبلي' : '🚀 FUTURE'}
                          </span>
                        )}
                      </div>
                      <ToggleSwitch on={isOn} loading={isLoading} onChange={() => toggleFlag(f.flagKey)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ══════════════════════════════════════════
          AI AGENTS — hover + toggle
      ══════════════════════════════════════════ */}
      <div className="hic-heading">
        {isRTL ? '🤖 وكلاء الذكاء الاصطناعي — اوقف لشرح، فعّل أو أوقف مباشرة' : '🤖 AI Agents — Hover for details, toggle to enable/disable'}
      </div>
      <div className="hic-grid-3">
        {agents.map(agent => {
          const meta = AGENT_META[agent.agent_code] ?? { icon: '🤖', labelEn: agent.agent_code, labelAr: agent.agent_code, descEn: '', descAr: '', impactLevel: 'additional' as const }
          const isLoading = loadingKey === agent.agent_code
          const isCore = meta.impactLevel === 'core'
          return (
            <div
              key={agent.agent_code}
              className="hic-agent-card"
              style={{ border: `1px solid ${agent.enabled ? (isCore ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.2)') : 'rgba(255,255,255,0.06)'}` }}
              onMouseEnter={e => { const t = agentTip(agent); if (t) show(t, e) }}
              onMouseLeave={hide}
            >
              <div className="hic-agent-top">
                <div className="hic-agent-icon" style={{ background: agent.enabled ? (isCore ? 'rgba(239,68,68,.12)' : 'rgba(99,102,241,.12)') : 'rgba(255,255,255,.04)' }}>
                  {meta.icon}
                </div>
                <div>
                  <div className="hic-agent-name">{isRTL ? meta.labelAr : meta.labelEn}</div>
                  <div className="hic-agent-code">{agent.agent_code}</div>
                </div>
              </div>
              <div className="hic-agent-desc">{isRTL ? meta.descAr : meta.descEn}</div>
              <div className="hic-agent-meta">
                <span className={`hic-agent-tag`} style={isCore ? { color: '#f87171', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' } : {}}>
                  {isCore ? (isRTL ? '⚠️ أساسي' : '⚠️ CORE') : (isRTL ? 'إضافي' : 'ADDITIONAL')}
                </span>
                <span className="hic-agent-tag">📦 {agent.provider}</span>
                <span className="hic-agent-tag">🌡️ {agent.temperature}</span>
                <span className="hic-agent-tag">📅 {agent.daily_limit}/{isRTL ? 'يوم' : 'day'}</span>
              </div>
              <div className="hic-agent-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.enabled ? '#22c55e' : 'rgba(100,116,139,0.4)', display: 'inline-block', animation: agent.enabled ? 'dot-pulse 2s infinite' : 'none' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: agent.enabled ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                    {agent.enabled ? (isRTL ? 'مفعّل' : 'Enabled') : (isRTL ? 'موقوف' : 'Disabled')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link href={`/${locale}/staff/intelligence/ai`} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontWeight: 700 }}>
                    {isRTL ? 'تفاصيل ↗' : 'Details ↗'}
                  </Link>
                  <ToggleSwitch on={agent.enabled} loading={isLoading} onChange={() => toggleAgent(agent.agent_code)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════
          DAL LAYER — hover tooltips only
      ══════════════════════════════════════════ */}
      <div className="hic-heading">
        {isRTL ? '🗄️ طبقة الوصول للبيانات — اوقف على أي كارت لمعرفة نطاق عمله' : '🗄️ Data Access Layer — Hover any card to see its full scope'}
      </div>
      <div className="hic-grid-4">
        {DAL_CARDS.map(dal => (
          <Link
            key={dal.path}
            href={dal.href ? `/${locale}${dal.href}` : '#'}
            className="hic-card"
            onMouseEnter={e => show(dalTip(dal), e)}
            onMouseLeave={hide}
            style={{ display: 'flex' }}
          >
            <span className="hic-card-icon">{dal.icon}</span>
            <div className="hic-card-body">
              <div className="hic-card-name">{isRTL ? dal.nameAr : dal.nameEn}</div>
              <div className="hic-card-sub">{dal.path}</div>
            </div>
            <div className="hic-card-right">
              <span className="hic-dot on" style={{ background: dal.color || '#6366f1', boxShadow: `0 0 6px ${dal.color || '#6366f1'}` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
