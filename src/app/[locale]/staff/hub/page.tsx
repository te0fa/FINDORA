import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminGlobalStats, getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getFinancialSummary } from '@/lib/dal/finance'
import { getAIAgentConfigsAdmin } from '@/lib/dal/ai-control'
import { getAllEconomyConfigs } from '@/lib/contributors/config'
import { getHotDomains } from '@/lib/dal/link-attempts'
import HubInteractiveClient from './HubInteractiveClient'

export const metadata = {
  title: 'Master Control Hub — FINDORA Admin',
  description: 'Comprehensive command center for the entire FINDORA platform',
}

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface HubLink {
  labelEn: string
  labelAr: string
  href: string
  badge?: string
  badgeColor?: string
  isNew?: boolean
}

interface HubSection {
  id: string
  titleEn: string
  titleAr: string
  descEn: string
  descAr: string
  icon: string
  gradient: string
  borderColor: string
  links: HubLink[]
  mainHref: string
  tooltipEn: string
  tooltipAr: string
}

// ─────────────────────────────────────────────────────────
// COMPLETE PLATFORM SITEMAP (All pages discovered in codebase)
// ─────────────────────────────────────────────────────────

const PLATFORM_SECTIONS: HubSection[] = [
  {
    id: 'operations',
    titleEn: 'Core Operations',
    titleAr: '⚡ العمليات الأساسية',
    descEn: 'Daily request pipeline, workspace, and queue management',
    descAr: 'إدارة الطلبات اليومية ومساحات العمل والطابور',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, hsl(220,89%,66%), hsl(258,89%,66%))',
    borderColor: 'rgba(99,102,241,0.4)',
    mainHref: '/staff/dashboard',
    tooltipEn: 'Core operations pipeline. Manage incoming customer requests, assign staff, review search plan progress, and release completed results.',
    tooltipAr: 'لوحة معالجة الطلبات الأساسية. متابعة الطلبات الواردة، تعيين الموظفين، مراجعة خطط البحث، وتسليم النتائج النهائية.',
    links: [
      { labelEn: 'Executive Dashboard', labelAr: 'لوحة القياس التنفيذية', href: '/staff/dashboard' },
      { labelEn: 'Intake Queue (New Requests)', labelAr: 'طابور الطلبات الجديدة', href: '/staff/queue', badge: 'LIVE', badgeColor: '#22c55e' },
      { labelEn: 'Active Workspaces', labelAr: 'مساحات العمل النشطة', href: '/staff/workspace' },
      { labelEn: 'Release & Archive', labelAr: 'الأرشيف والتسليم', href: '/staff/archive' },
    ]
  },
  {
    id: 'finance',
    titleEn: 'Financial Ledger & Payments',
    titleAr: '💰 الخزينة والمدفوعات',
    descEn: 'Revenue tracking, transaction history, and payment gateway logs',
    descAr: 'تتبع الإيرادات وسجل المعاملات وبوابات الدفع',
    icon: '💰',
    gradient: 'linear-gradient(135deg, hsl(43,96%,56%), hsl(25,95%,55%))',
    borderColor: 'rgba(234,179,8,0.4)',
    mainHref: '/staff/finance/transactions',
    tooltipEn: 'Financial ledger and gateways. Access ERP transactions, verify online payments, inspect gateway logs, and audit revenue splits.',
    tooltipAr: 'الخزانة المالية والمدفوعات. استعراض حركات الخزينة وسجل المعاملات اليومية، سجلات بوابة الدفع، والتسعير الذكي.',
    links: [
      { labelEn: 'Transactions ERP Ledger', labelAr: 'دفتر الأستاذ - حركات الخزينة', href: '/staff/finance/transactions' },
      { labelEn: 'Payment Gateway Logs', labelAr: 'سجلات بوابات الدفع', href: '/staff/payments' },
      { labelEn: 'AI Pricing Engine', labelAr: 'محرك التسعير بالذكاء الاصطناعي', href: '/staff/intelligence/pricing' },
      { labelEn: 'Investor Metrics', labelAr: 'مقاييس المستثمرين', href: '/staff/intelligence/investor' },
    ]
  },
  {
    id: 'contributors',
    titleEn: 'Scouts & Contributors',
    titleAr: '🌍 المناديب والمساهمين',
    descEn: 'Scout network, wallets, submissions, gamification, and economy control',
    descAr: 'شبكة المناديب والمحافظ والتقييمات والألعاب والاقتصاد',
    icon: '🌍',
    gradient: 'linear-gradient(135deg, hsl(152,69%,51%), hsl(175,69%,45%))',
    borderColor: 'rgba(34,197,94,0.4)',
    mainHref: '/staff/contributors',
    tooltipEn: 'Scout and contributor network. View scouts profiles, check rewards wallets, audit data submissions, and adjust gamification config.',
    tooltipAr: 'إدارة شبكة المناديب والمساهمين. تتبع ملفات مسؤولي الميدان، إدارة المحافظ والأرباح، مراجعة جودة البيانات، وإعدادات الجيميفيكيشن.',
    links: [
      { labelEn: 'Scouts Database', labelAr: 'قاعدة بيانات المناديب', href: '/staff/contributors' },
      { labelEn: 'Wallets & Rewards Management', labelAr: 'إدارة المحافظ والأرباح', href: '/staff/contributors/wallets' },
      { labelEn: 'Quality Review (Submissions)', labelAr: 'مراجعة التقديمات', href: '/staff/contributors/submissions' },
      { labelEn: 'Economy Stabilizer Control', labelAr: 'موازن اقتصاد المناديب', href: '/staff/contributors/economy' },
      { labelEn: 'Gamification Engine', labelAr: 'محرك الألعاب والمستويات', href: '/staff/intelligence/gamification' },
      { labelEn: 'Fraud & Risk Detection', labelAr: 'اكتشاف الاحتيال والمخاطر', href: '/staff/intelligence/risk', badge: 'AI', badgeColor: '#a855f7' },
      { labelEn: 'Tasks Intelligence', labelAr: 'ذكاء المهام', href: '/staff/intelligence/tasks' },
    ]
  },
  {
    id: 'marketplace',
    titleEn: 'Marketplace & Deals (Supply Push)',
    titleAr: '🏪 السوق والعروض',
    descEn: 'Vendor management, products, deals publishing, and marketplace commission control',
    descAr: 'إدارة الموردين والمنتجات ونشر العروض والتحكم في العمولة',
    icon: '🏪',
    gradient: 'linear-gradient(135deg, hsl(280,89%,66%), hsl(320,89%,60%))',
    borderColor: 'rgba(168,85,247,0.4)',
    mainHref: '/staff/marketplace',
    tooltipEn: 'Merchant listings and offers hub. Manage product listings catalog, register new business vendors, and configure active promotional deals.',
    tooltipAr: 'إدارة السوق وعروض التجار. تصفح وتعديل العروض المنشورة، تسجيل الموردين الجدد، وإدارة كتالوج السلع والخدمات.',
    links: [
      { labelEn: 'Marketplace Dashboard', labelAr: 'لوحة تحكم السوق الجديدة', href: '/staff/marketplace', badge: 'NEW', badgeColor: '#ec4899' },
      { labelEn: 'Vendors Hub (Legacy)', labelAr: 'مركز الموردين', href: '/staff/vendors' },
      { labelEn: 'Register New Vendor', labelAr: 'تسجيل مورد جديد', href: '/staff/vendors/new' },
      { labelEn: 'Dynamic Deals (Marketing)', labelAr: 'العروض الترويجية', href: '/staff/marketing/deals' },
    ]
  },
  {
    id: 'intelligence',
    titleEn: 'Intelligence & AI Control',
    titleAr: '🧠 الذكاء الاصطناعي',
    descEn: 'AI settings, agent control, economy config, and merchant intelligence',
    descAr: 'إعدادات الذكاء الاصطناعي والوكلاء وإعدادات الاقتصاد وذكاء التجار',
    icon: '🧠',
    gradient: 'linear-gradient(135deg, hsl(258,89%,66%), hsl(290,89%,60%))',
    borderColor: 'rgba(139,92,246,0.4)',
    mainHref: '/staff/intelligence',
    tooltipEn: 'AI engine settings. Edit global prompts, control automated agents, monitor CRM indicators, and investigate system risks.',
    tooltipAr: 'مركز التحكم بالذكاء الاصطناعي. تعديل موجهات النظام، تشغيل وإطفاء الوكلاء الآليين، ومراقبة مؤشرات الأداء والنمو.',
    links: [
      { labelEn: 'Intelligence Overview', labelAr: 'نظرة عامة على الذكاء', href: '/staff/intelligence' },
      { labelEn: 'AI Settings & Prompts', labelAr: 'إعدادات الذكاء الاصطناعي', href: '/staff/intelligence/ai' },
      { labelEn: 'Agent Control Center', labelAr: 'مركز التحكم بالوكلاء', href: '/staff/intelligence/agent-control' },
      { labelEn: 'Economy Configuration', labelAr: 'إعدادات الاقتصاد والتسعير', href: '/staff/intelligence/economy-config' },
      { labelEn: 'Merchants Intelligence', labelAr: 'ذكاء التجار', href: '/staff/intelligence/merchants' },
      { labelEn: 'Customer Database', labelAr: 'قاعدة بيانات العملاء', href: '/staff/intelligence/customers' },
      { labelEn: 'Communications Log', labelAr: 'سجل الاتصالات', href: '/staff/intelligence/communications' },
      { labelEn: 'Fraud Investigation', labelAr: 'التحقيق في الاحتيال', href: '/staff/intelligence/fraud' },
    ]
  },
  {
    id: 'marketing',
    titleEn: 'Marketing & Sales',
    titleAr: '📢 التسويق والمبيعات',
    descEn: 'Pricing plans, content, news, deals, and verification settings',
    descAr: 'خطط الأسعار والمحتوى والأخبار والعروض وإعدادات التحقق',
    icon: '📢',
    gradient: 'linear-gradient(135deg, hsl(0,84%,60%), hsl(30,84%,55%))',
    borderColor: 'rgba(239,68,68,0.4)',
    mainHref: '/staff/marketing/pricing',
    tooltipEn: 'Marketing configuration. Customize subscription pricing plans, edit news blog announcements, and manage landing page text updates.',
    tooltipAr: 'التسويق والمبيعات. إعداد باقات الاشتراك، نشر الأخبار والإعلانات العامة، وتعديل إعدادات التحقق وقنوات الإعلانات.',
    links: [
      { labelEn: 'Pricing Plans (Dynamic)', labelAr: 'خطط الأسعار الذكية', href: '/staff/marketing/pricing' },
      { labelEn: 'News & Announcements', labelAr: 'الأخبار والإعلانات', href: '/staff/marketing/news' },
      { labelEn: 'Content Marketing', labelAr: 'المحتوى التسويقي', href: '/staff/marketing/content' },
      { labelEn: 'Verification Settings', labelAr: 'إعدادات التحقق من الطلبات', href: '/staff/marketing/verification-settings' },
    ]
  },
  {
    id: 'users',
    titleEn: 'Users & Access Control',
    titleAr: '👥 المستخدمون والصلاحيات',
    descEn: 'Staff management, roles, and permissions across the platform',
    descAr: 'إدارة الموظفين والأدوار والصلاحيات على المنصة',
    icon: '👥',
    gradient: 'linear-gradient(135deg, hsl(200,80%,55%), hsl(220,89%,60%))',
    borderColor: 'rgba(14,165,233,0.4)',
    mainHref: '/staff/users',
    tooltipEn: 'Access control settings. Manage staff user profiles, allocate roles, and audit system operations permissions.',
    tooltipAr: 'إدارة الهويات والصلاحيات. إضافة وتعديل حسابات الموظفين والمديرين، وتوزيع الأدوار والصلاحيات على المنصة.',
    links: [
      { labelEn: 'Staff Members', labelAr: 'إدارة الموظفين', href: '/staff/users' },
    ]
  },
  {
    id: 'settings',
    titleEn: 'System Settings',
    titleAr: '⚙️ إعدادات النظام',
    descEn: 'Core system configuration, payment gateways, and specializations',
    descAr: 'الإعدادات الأساسية للنظام وبوابات الدفع والتخصصات',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg, hsl(220,15%,40%), hsl(220,15%,55%))',
    borderColor: 'rgba(100,116,139,0.4)',
    mainHref: '/staff/settings/specializations',
    tooltipEn: 'System configuration settings. Edit core category specializations database, configure online payment gateways credentials.',
    tooltipAr: 'الإعدادات العامة للنظام. إدارة تخصصات البحث النشطة بالمنصة، وإدخال مفاتيح الربط لبوابات الدفع الإلكتروني.',
    links: [
      { labelEn: 'Payment Gateway Config', labelAr: 'إعدادات بوابات الدفع', href: '/staff/settings/payments' },
      { labelEn: 'Specializations & Skills', labelAr: 'التخصصات والمهن', href: '/staff/settings/specializations' },
    ]
  },
  {
    id: 'public',
    titleEn: 'Public Website & Customer Flows',
    titleAr: '🌐 الموقع العام وتدفقات العميل',
    descEn: 'All customer-facing pages and flows visible to the public',
    descAr: 'جميع صفحات العملاء والواجهات المرئية للعامة',
    icon: '🌐',
    gradient: 'linear-gradient(135deg, hsl(170,70%,45%), hsl(195,70%,45%))',
    borderColor: 'rgba(20,184,166,0.4)',
    mainHref: '/',
    tooltipEn: 'Sitemap for public customer pages. View landing request wizard, public deals listings, tracking widget, and checkout simulator.',
    tooltipAr: 'روابط واجهات العملاء العامة. للوصول المباشر لصفحات العملاء العامة، معالج بدء الطلبات، ومحاكاة عمليات الدفع.',
    links: [
      { labelEn: 'Homepage (Landing)', labelAr: 'الصفحة الرئيسية', href: '/' },
      { labelEn: 'Deals Hub (Public)', labelAr: 'سوق العروض (للعملاء)', href: '/deals' },
      { labelEn: 'Pricing Page (Public)', labelAr: 'صفحة الأسعار (للعملاء)', href: '/pricing' },
      { labelEn: 'Start a Request (Wizard)', labelAr: 'بدء طلب جديد', href: '/start-request' },
      { labelEn: 'Track Request', labelAr: 'تتبع طلب', href: '/track-request' },
      { labelEn: 'Recover Requests', labelAr: 'استعادة الطلبات', href: '/recover-requests' },
      { labelEn: 'Contributors Landing', labelAr: 'صفحة المناديب', href: '/contributors' },
      { labelEn: 'Scout Apply Form', labelAr: 'نموذج التقديم للمناديب', href: '/contributors/apply' },
      { labelEn: 'Simulated Checkout', labelAr: 'الدفع التجريبي (محاكاة)', href: '/customer/checkout/simulate' },
    ]
  },
]

// ─────────────────────────────────────────────────────────
// CRON JOBS & API ENGINES
// ─────────────────────────────────────────────────────────

const SYSTEM_ENGINES = [
  { nameEn: 'Fraud Audit Cron', nameAr: 'فحص الاحتيال التلقائي', path: '/api/cron/fraud-audit', status: 'active' },
  { nameEn: 'Network Survival Cron', nameAr: 'نبضة شبكة المناديب', path: '/api/cron/network-survival', status: 'active' },
  { nameEn: 'Recalculate Networks', nameAr: 'إعادة حساب الشبكات', path: '/api/cron/recalculate-networks', status: 'active' },
  { nameEn: 'Task Recycler Cron', nameAr: 'إعادة تدوير المهام', path: '/api/cron/task-recycler', status: 'active' },
  { nameEn: 'Trend Detector Cron', nameAr: 'كاشف الاتجاهات', path: '/api/cron/trend-detector', status: 'active' },
  { nameEn: 'AI Pricing Engine', nameAr: 'تسعير الذكاء الاصطناعي', path: '/api/ai/pricing', status: 'active' },
  { nameEn: 'Economy Scarcity Engine', nameAr: 'محرك الندرة الاقتصادية', path: '/api/contributors/scarcity', status: 'active' },
  { nameEn: 'Vendor Webhooks (In/Out)', nameAr: 'روابط الموردين', path: '/api/webhooks/vendors', status: 'active' },
]

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────

export default async function StaffHubPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }
  const permissions = getStaffUiPermissions(staffMember)

  // Live stats
  let stats: any = null
  let finance: any = null
  let agentConfigs: any[] = []
  let initialFlags: Record<string, boolean> = {}
  // HOT_DOMAIN_THRESHOLD: domains rejected >= 10 times in 24h trigger a banner.
  // Hardcoded constant — can be made configurable if this proves valuable.
  const HOT_DOMAIN_THRESHOLD = 10
  let hotDomains: { domain: string; count: number }[] = []
  try {
    const [statsData, financeData, agentsData, economyConfigs, hotDomainsData] = await Promise.all([
      getAdminGlobalStats(),
      getFinancialSummary(),
      getAIAgentConfigsAdmin(),
      getAllEconomyConfigs(),
      getHotDomains(HOT_DOMAIN_THRESHOLD, 24).catch(() => []),
    ])
    stats = statsData
    finance = financeData
    agentConfigs = agentsData
    hotDomains = hotDomainsData
    // Extract feature flags (keys starting with flag_)
    for (const cfg of economyConfigs) {
      if (cfg.config_key.startsWith('flag_')) {
        initialFlags[cfg.config_key] = cfg.value === 'true' || cfg.value === true
      }
    }
  } catch (_) {
    // Graceful degradation
  }

  const kpis = [
    {
      label: isRTL ? 'إجمالي الطلبات' : 'Total Requests',
      value: stats?.totalRequests ?? '—',
      icon: '📋',
      color: '#6366f1',
      href: `/${locale}/staff/dashboard`,
      desc: isRTL 
        ? 'إجمالي الطلبات المسجلة بالنظام من البداية شاملة جميع الحالات والأنواع.' 
        : 'Total requests registered in the system from the beginning, including all statuses and types.',
    },
    {
      label: isRTL ? 'قيد التشغيل' : 'In Operations',
      value: stats?.inOperations ?? '—',
      icon: '⚡',
      color: '#22c55e',
      href: `/${locale}/staff/dashboard`,
      desc: isRTL 
        ? 'الطلبات النشطة التي يتم معالجتها حالياً من قبل الموظفين أو الذكاء الاصطناعي.' 
        : 'Active requests currently being processed by staff or AI.',
    },
    {
      label: isRTL ? 'إجمالي الدخل' : 'Total Income',
      value: finance?.income ? `${Number(finance.income).toLocaleString()} EGP` : '—',
      icon: '💰',
      color: '#eab308',
      href: `/${locale}/staff/finance/transactions`,
      desc: isRTL 
        ? 'إجمالي المبالغ والمدفوعات التي تم تحصيلها عبر البوابات المختلفة.' 
        : 'Total payments and revenue collected across different gateways.',
    },
    {
      label: isRTL ? 'صافي الربح' : 'Net Profit',
      value: finance?.profit ? `${Number(finance.profit).toLocaleString()} EGP` : '—',
      icon: '📈',
      color: '#14b8a6',
      href: `/${locale}/staff/finance/transactions`,
      desc: isRTL 
        ? 'صافي أرباح المنصة بعد خصم مستحقات الشركاء والمصاريف التشغيلية.' 
        : 'Net platform profits after deducting partner shares and operating expenses.',
    },
    {
      label: isRTL ? 'في انتظار المراجعة' : 'Pending Intake',
      value: stats?.pendingIntake ?? '—',
      icon: '⏳',
      color: '#f59e0b',
      href: `/${locale}/staff/queue`,
      desc: isRTL 
        ? 'الطلبات الجديدة المرفوعة من العملاء والتي تنتظر الفحص الأولي والتوزيع.' 
        : 'New requests submitted by customers awaiting initial screening and assignment.',
    },
    {
      label: isRTL ? 'اختراق SLA' : 'SLA Breached',
      value: stats?.slaBreached ?? '—',
      icon: '🚨',
      color: '#ef4444',
      href: `/${locale}/staff/dashboard`,
      desc: isRTL 
        ? 'الطلبات التي تجاوزت الحد الزمني المسموح لمعالجتها وتتطلب تدخل فوري.' 
        : 'Requests that exceeded the allowed processing time limit and require immediate action.',
    },
    {
      label: isRTL ? 'مكتملة' : 'Completed',
      value: stats?.completedCount ?? '—',
      icon: '✅',
      color: '#a855f7',
      href: `/${locale}/staff/archive`,
      desc: isRTL 
        ? 'الطلبات التي تم توريدها أو توفير البدائل المناسبة لها بنجاح للعميل.' 
        : 'Requests that have been successfully fulfilled or resolved for the customer.',
    },
    {
      label: isRTL ? 'مؤرشفة' : 'Archived',
      value: stats?.archivedCount ?? '—',
      icon: '📦',
      color: '#64748b',
      href: `/${locale}/staff/archive`,
      desc: isRTL 
        ? 'الطلبات الملغاة أو التي تم أرشفتها لأسباب إدارية أو عدم جدية العميل.' 
        : 'Cancelled or archived requests due to administrative reasons or customer inactivity.',
    },
  ]

  const allowedKpis = kpis.filter(k => {
    if (k.label === 'إجمالي الدخل' || k.label === 'صافي الربح' || k.label === 'Total Income' || k.label === 'Net Profit') {
      return permissions?.isAdmin || permissions?.canManageFinancials;
    }
    return permissions?.isAdmin || permissions?.canReviewIntake || permissions?.canResearch || permissions?.canReport;
  });

  // ── STAFF WORKFLOW GUIDES ──
  const guides = []
  if (permissions?.isAdmin) {
    guides.push({
      role: isRTL ? 'مدير المنصة (Administrator)' : 'Platform Administrator',
      icon: '🛡️',
      steps: isRTL ? [
        'راقب أداء المنصة المالي والتشغيلي من مؤشرات الأداء الحية.',
        'راجع قسم الذكاء الاصطناعي لتعديل الموجهات وضبط معدلات استهلاك الميزات.',
        'أشرف على حسابات وصلاحيات الموظفين، وقم باعتماد الحسابات الجديدة للتجار.',
        'افحص المعاملات المالية المكتملة وعمولات السوق للشركاء.'
      ] : [
        'Monitor overall financial and operational health via Live KPIs.',
        'Access AI Control to fine-tune prompts and adjust daily limit configs.',
        'Supervise staff accounts, roles, and approve new vendor requests.',
        'Verify transaction ledgers and manage partner commission policies.'
      ]
    })
  }
  if (permissions?.isIntakeReviewer) {
    guides.push({
      role: isRTL ? 'مراجع الطلبات الواردة (Intake Reviewer)' : 'Intake Reviewer',
      icon: '⏳',
      steps: isRTL ? [
        'افتح "طابور الطلبات الجديدة" لمشاهدة الطلبات المرفوعة من العملاء.',
        'راجع تفاصيل الطلب وتأكد من أن الميزانية والمنطقة المفضلة واضحة ومحددة.',
        'افحص تصنيف المنتج والفئة والبيانات المقترحة تلقائياً بالذكاء الاصطناعي.',
        'قم بالموافقة على الطلب ليتم إرساله للبحث، أو اطلب تعديلاً إذا كانت التفاصيل غير كافية.'
      ] : [
        'Open the "Intake Queue" to view newly submitted customer requests.',
        'Review request description and ensure preferred budget and governorate are set.',
        'Verify AI auto-classifications, product category fields, and custom specs.',
        'Approve request to launch sourcing research, or request details clarification.'
      ]
    })
  }
  if (permissions?.isSourcingResearcher) {
    guides.push({
      role: isRTL ? 'باحث التوريد (Sourcing Researcher)' : 'Sourcing Researcher',
      icon: '🔍',
      steps: isRTL ? [
        'افتح "مساحات العمل النشطة" وقم باستلام مهمة بحث معلقة.',
        'ابحث عن البدائل والمنتجات المطلوبة في الأسواق الإلكترونية والموردين المحليين.',
        'قم بإضافة الخيارات والأسعار الدقيقة وتاريخ التسليم والضمان إلى مسودة العروض في مساحة العمل.',
        'بمجرد توفير خيارين أو ثلاثة مناسبين، قم بتقديم المسودة ليقوم المراجع بفحصها.'
      ] : [
        'Access "Active Workspaces" to claim a pending sourcing request assignment.',
        'Search online websites or contact local suppliers to find the requested product.',
        'Enter quotes (price, specs, warranty, delivery time) into the workspace draft list.',
        'Provide 2-3 suitable alternatives and submit the draft shortlist for final review.'
      ]
    })
  }
  if (permissions?.isReportBuilder) {
    guides.push({
      role: isRTL ? 'منسق العروض والتقارير (Report Builder)' : 'Report Builder',
      icon: '📄',
      steps: isRTL ? [
        'ادخل على مساحات العمل التي انتهى الباحثون من توفير عروضها.',
        'قارن بين الأسعار والمواصفات المعروضة، واصنع التوليفة والتوصية النهائية للعميل.',
        'اكتب التقرير النهائي بالذكاء الاصطناعي أو راجع الاقتراحات المكتوبة للتوصية بالبديل الأفضل.',
        'اضغط على "إرسال التقرير للعميل" لرفع النتائج على هاتف بريد العميل وبدء الدفع.'
      ] : [
        'Open workspaces where researchers have submitted shortlisted candidates.',
        'Compare the options and compile the final recommended proposal structure.',
        'Generate or review the AI synthesis report, highlighting the best choice details.',
        'Click "Release to Customer" to dispatch the final proposal link to the customer.'
      ]
    })
  }

  return (
    <div className="hub-root" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* ── RESET & ROOT ── */
        .hub-root {
          min-height: 100vh;
          padding: 32px 24px 80px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
          color: #f1f5f9;
        }

        /* ── HERO HEADER ── */
        .hub-hero {
          position: relative;
          padding: 48px 40px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
          border: 1px solid rgba(99,102,241,0.25);
          backdrop-filter: blur(20px);
          overflow: hidden;
          margin-bottom: 40px;
        }
        .hub-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.2), transparent);
          pointer-events: none;
        }
        .hub-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 20px;
        }
        .hub-hero-badge-dot {
          width: 7px; height: 7px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        .hub-hero h1 {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 900;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #fff 30%, #a5b4fc 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.15;
        }
        .hub-hero p {
          font-size: 1.05rem;
          color: rgba(255,255,255,0.55);
          max-width: 600px;
          line-height: 1.6;
          margin: 0;
        }
        .hub-hero-meta {
          margin-top: 24px;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.35);
        }
        .hub-hero-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ── KPI STRIP ── */
        .kpi-strip {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }
        .kpi-tile {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 20px 22px;
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s, border-color 0.2s;
          position: relative;
          overflow: hidden;
        }
        .kpi-tile:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.15);
        }
        .kpi-tile-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .kpi-info-container {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
        }
        [dir="rtl"] .kpi-info-container {
          left: 10px;
          right: auto;
        }
        .kpi-info-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.45);
          font-size: 10px;
          font-weight: 800;
          font-family: serif;
          cursor: help;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .kpi-info-icon:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .kpi-tooltip {
          visibility: hidden;
          width: 220px;
          background: #0f172a;
          color: #fff;
          text-align: start;
          border-radius: 12px;
          padding: 10px 14px;
          position: absolute;
          z-index: 100;
          bottom: 130%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s, visibility 0.2s;
          font-size: 0.72rem;
          line-height: 1.45;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
          pointer-events: none;
          white-space: normal;
        }
        [dir="rtl"] .kpi-tooltip {
          text-align: right;
        }
        .kpi-info-icon:hover .kpi-tooltip {
          visibility: visible;
          opacity: 1;
        }
        .kpi-tile::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--kpi-color, #6366f1);
          opacity: 0.6;
        }
        .kpi-tile-icon {
          font-size: 1.8rem;
          flex-shrink: 0;
        }
        .kpi-tile-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .kpi-tile-value {
          font-size: 1.6rem;
          font-weight: 900;
          color: #fff;
          line-height: 1;
        }

        /* ── SECTION HEADING ── */
        .section-heading {
          font-size: 0.72rem;
          font-weight: 800;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 40px 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-heading::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        /* ── PLATFORM GRID ── */
        .platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        /* ── HUB CARD ── */
        .hub-card {
          background: rgba(10,17,35,0.7);
          border: 1px solid var(--card-border, rgba(255,255,255,0.08));
          border-radius: 24px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hub-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .hc-top-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .hc-top-link:hover .hc-top {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .card-info-container {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 10;
        }
        [dir="rtl"] .card-info-container {
          left: 14px;
          right: auto;
        }
        .card-info-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
          font-weight: 800;
          font-family: serif;
          cursor: help;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .card-info-icon:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .card-tooltip {
          visibility: hidden;
          width: 250px;
          background: #0f172a;
          color: #fff;
          text-align: start;
          border-radius: 12px;
          padding: 10px 14px;
          position: absolute;
          z-index: 100;
          bottom: 130%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s, visibility 0.2s;
          font-size: 0.75rem;
          line-height: 1.45;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
          pointer-events: none;
          white-space: normal;
        }
        [dir="rtl"] .card-tooltip {
          text-align: right;
        }
        .card-info-icon:hover .card-tooltip {
          visibility: visible;
          opacity: 1;
        }
        .hc-top {
          padding: 20px 24px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
        }
        .hc-top-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        .hc-icon-wrapper {
          width: 44px; height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          background: var(--card-gradient, rgba(99,102,241,0.15));
          flex-shrink: 0;
        }
        .hc-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
          line-height: 1.3;
        }
        .hc-desc {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
          margin: 0;
          line-height: 1.4;
        }
        .hc-body {
          padding: 16px 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* ── HUB LINK ── */
        .hub-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(255,255,255,0.7);
          font-size: 0.82rem;
          font-weight: 600;
          background: rgba(255,255,255,0.02);
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .hub-link:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border-color: rgba(255,255,255,0.08);
          transform: translateX(${isRTL ? '-3px' : '3px'});
        }
        .hub-link-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hub-link-arrow {
          opacity: 0.2;
          font-size: 0.85rem;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .hub-link:hover .hub-link-arrow { opacity: 0.8; }
        .hub-link-badge {
          font-size: 0.6rem;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        /* ── ENGINES SECTION ── */
        .engines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .engine-tile {
          background: rgba(10,17,35,0.6);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          backdrop-filter: blur(12px);
        }
        .engine-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
        }
        .engine-path {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.25);
          font-family: monospace;
          margin-top: 2px;
        }
        .engine-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.65rem;
          font-weight: 800;
          color: #22c55e;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .engine-status-dot {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        /* ── QUICK ACTIONS ── */
        .quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 32px;
        }
        .qa-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .qa-btn:hover { transform: translateY(-2px); }
        .qa-primary {
          background: hsl(258,89%,66%);
          color: #fff;
          border-color: hsl(258,89%,76%);
          box-shadow: 0 4px 16px rgba(139,92,246,0.25);
        }
        .qa-primary:hover { background: hsl(258,89%,72%); }
        .qa-gold {
          background: rgba(234,179,8,0.1);
          color: hsl(43,96%,56%);
          border-color: rgba(234,179,8,0.3);
        }
        .qa-gold:hover { background: rgba(234,179,8,0.2); }
        .qa-green {
          background: rgba(34,197,94,0.1);
          color: #22c55e;
          border-color: rgba(34,197,94,0.3);
        }
        .qa-green:hover { background: rgba(34,197,94,0.2); }
        .qa-red {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border-color: rgba(239,68,68,0.3);
        }
        .qa-red:hover { background: rgba(239,68,68,0.2); }
        .qa-blue {
          background: rgba(99,102,241,0.1);
          color: #818cf8;
          border-color: rgba(99,102,241,0.3);
        }
        .qa-blue:hover { background: rgba(99,102,241,0.2); }

        /* ── RESPONSIVE ── */
        @media (max-width: 700px) {
          .hub-root { padding: 20px 12px 60px; }
          .hub-hero { padding: 32px 24px; }
          .platform-grid { grid-template-columns: 1fr; }
          .kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }
      `}} />

      {/* ── HERO ── */}
      <header className="hub-hero">
        <div className="hub-hero-badge">
          <span className="hub-hero-badge-dot" />
          {isRTL ? 'لوحة التحكم الرئيسية — FINDORA Admin' : 'Master Control Center — FINDORA Admin'}
        </div>
        <h1>{isRTL ? 'مركز التحكم الشامل' : 'Master Control Hub'}</h1>
        <p>
          {isRTL
            ? 'الخريطة الكاملة للمنصة — تحكم في كل شيء من مكان واحد. الطلبات، المناديب، الماليات، السوق، الذكاء الاصطناعي، والعملاء.'
            : 'The complete platform command center. Control everything from one place — requests, scouts, finance, marketplace, AI, and customers.'}
        </p>
        <div className="hub-hero-meta">
          <span>📋 {stats?.totalRequests ?? '…'} {isRTL ? 'إجمالي الطلبات' : 'Total Requests'}</span>
          <span>⚡ {stats?.inOperations ?? '…'} {isRTL ? 'قيد التشغيل' : 'In Operations'}</span>
          <span>⏳ {stats?.pendingIntake ?? '…'} {isRTL ? 'في الانتظار' : 'Pending Intake'}</span>
          <span>💰 {finance?.profit != null ? `${Number(finance.profit).toLocaleString()} EGP` : '…'} {isRTL ? 'صافي ربح' : 'Net Profit'}</span>
          <span>⚙️ {SYSTEM_ENGINES.length} {isRTL ? 'محرك نشط' : 'Engines Running'}</span>
        </div>
      </header>

      {/* ── HOT DOMAIN BANNER (threshold: 10 rejections in 24h) ── */}
      {hotDomains.length > 0 && (
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
          {hotDomains.map(({ domain, count }) => (
            <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <span style={{ color: '#fbbf24', fontSize: '0.875rem', flex: 1 }}>
                {isRTL ? 'عملاء كتير بيحاولوا يستخدموا ' : 'Many customers tried using '}
                <strong style={{ fontFamily: 'monospace', color: '#fde68a' }}>{domain}</strong>
                {isRTL ? ` (${count} محاولة خلال 24 ساعة) — فكر تضيفه` : ` (${count} attempts in 24h) — consider adding it`}
              </span>
              <Link href={`/${locale}/admin/link-analytics`} style={{ fontSize: '0.75rem', color: '#fbbf24', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                {isRTL ? 'عرض التحليلات' : 'View Analytics'}
              </Link>
              <Link href={`/${locale}/admin/link-domains?prefill=${encodeURIComponent(domain)}`} style={{ fontSize: '0.75rem', background: 'rgba(234,179,8,0.15)', color: '#fde68a', padding: '0.2rem 0.6rem', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {isRTL ? '+ أضف' : '+ Add'}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── STAFF WORKFLOW GUIDES ── */}
      {guides.length > 0 && (
        <div className="workflow-guides-container" style={{ marginBottom: '2.5rem' }}>
          <div className="section-heading">{isRTL ? '📋 دليل خطوات العمل اليومية المخصص لك' : '📋 Your Assigned Daily Workflow Guide'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            {guides.map((g, idx) => (
              <div key={idx} className="guide-card" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '1.25rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f7d46b', margin: 0 }}>{g.role}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {g.steps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.78rem', lineHeight: 1.45, color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(247, 212, 107, 0.1)',
                        color: '#f7d46b',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {sIdx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      {(() => {
        const allowedActions = [
          { href: `/${locale}/staff/queue`, label: isRTL ? 'طابور الطلبات' : 'Intake Queue', cls: 'qa-primary', icon: '⚡', visible: permissions?.isAdmin || permissions?.canReviewIntake },
          { href: `/${locale}/staff/contributors/submissions`, label: isRTL ? 'مراجعة التقديمات' : 'Review Submissions', cls: 'qa-green', icon: '✅', visible: permissions?.isAdmin || permissions?.isQualityReviewer },
          { href: `/${locale}/staff/intelligence/risk`, label: isRTL ? 'كشف الاحتيال' : 'Fraud Detection', cls: 'qa-red', icon: '🚨', visible: permissions?.isAdmin || permissions?.canViewIntelligence },
          { href: `/${locale}/staff/marketplace`, label: isRTL ? 'إضافة عرض جديد' : 'Publish Deal', cls: 'qa-gold', icon: '🏪', visible: permissions?.isAdmin || permissions?.canManageDeals },
          { href: `/${locale}/staff/contributors/wallets`, label: isRTL ? 'إدارة المحافظ' : 'Wallet Management', cls: 'qa-blue', icon: '💳', visible: permissions?.isAdmin || permissions?.canManageFinancials },
          { href: `/${locale}/staff/intelligence/economy-config`, label: isRTL ? 'إعدادات الاقتصاد' : 'Economy Config', cls: 'qa-gold', icon: '⚙️', visible: permissions?.isAdmin || permissions?.canManageAI },
          { href: `/${locale}/staff/vendors/new`, label: isRTL ? 'تسجيل مورد' : 'New Vendor', cls: 'qa-green', icon: '➕', visible: permissions?.isAdmin || permissions?.canManageVendors },
          { href: `/${locale}/staff/finance/transactions`, label: isRTL ? 'سجل المعاملات' : 'Transactions', cls: 'qa-blue', icon: '📊', visible: permissions?.isAdmin || permissions?.canManageFinancials }
        ].filter(a => a.visible);

        if (allowedActions.length === 0) return null;

        return (
          <>
            <div className="section-heading">{isRTL ? '🔥 إجراءات سريعة' : '🔥 Quick Actions'}</div>
            <div className="quick-actions">
              {allowedActions.map((a, i) => (
                <Link key={i} href={a.href} className={`qa-btn ${a.cls}`}>{a.icon} {a.label}</Link>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── LIVE KPI STRIP ── */}
      {allowedKpis.length > 0 && (
        <>
          <div className="section-heading">{isRTL ? '📊 مؤشرات الأداء اللحظية' : '📊 Live KPI Overview'}</div>
          <div className="kpi-strip">
            {allowedKpis.map((k, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div className="kpi-info-container">
                  <div className="kpi-info-icon">
                    i
                    <div className="kpi-tooltip">
                      {k.desc}
                    </div>
                  </div>
                </div>
                <Link href={k.href} className="kpi-tile-link">
                  <div className="kpi-tile" style={{ '--kpi-color': k.color } as React.CSSProperties}>
                    <div className="kpi-tile-icon">{k.icon}</div>
                    <div>
                      <div className="kpi-tile-label">{k.label}</div>
                      <div className="kpi-tile-value">{k.value}</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── PLATFORM SECTIONS ── */}
      <div className="section-heading">{isRTL ? '🗺️ خريطة المنصة الكاملة' : '🗺️ Full Platform Map'}</div>
      <div className="platform-grid">
        {PLATFORM_SECTIONS.filter(section => {
          if (section.id === 'operations') {
            return permissions?.isAdmin || permissions?.canReviewIntake || permissions?.canResearch || permissions?.canSourceOffline || permissions?.canReport;
          }
          if (section.id === 'finance') {
            return permissions?.isAdmin || permissions?.canManageFinancials;
          }
          if (section.id === 'contributors') {
            return permissions?.isAdmin || permissions?.isSourcingResearcher || permissions?.isQualityReviewer || permissions?.canAccessQueue;
          }
          if (section.id === 'marketplace') {
            return permissions?.isAdmin || permissions?.canManageDeals || permissions?.canManageVendors;
          }
          if (section.id === 'intelligence') {
            return permissions?.isAdmin || permissions?.canViewIntelligence || permissions?.canManageAI;
          }
          if (section.id === 'marketing') {
            return permissions?.isAdmin || permissions?.canManageMarketing;
          }
          if (section.id === 'users') {
            return permissions?.isAdmin;
          }
          if (section.id === 'settings') {
            return permissions?.isAdmin;
          }
          if (section.id === 'public') {
            return permissions?.isAdmin;
          }
          return false;
        }).map((section) => {
          const allowedLinks = section.links.filter(link => {
            if (link.href.includes('/queue')) return permissions?.isAdmin || permissions?.canReviewIntake;
            if (link.href.includes('/workspace')) return permissions?.isAdmin || permissions?.canResearch || permissions?.canReport;
            if (link.href.includes('/archive')) return permissions?.isAdmin || permissions?.canReport || permissions?.canManageArchive;
            if (link.href.includes('/finance/transactions')) return permissions?.isAdmin || permissions?.canManageFinancials;
            if (link.href.includes('/payments')) return permissions?.isAdmin || permissions?.canManageFinancials;
            if (link.href.includes('/intelligence/pricing')) return permissions?.isAdmin || permissions?.canManageAI || permissions?.canViewIntelligence;
            if (link.href.includes('/intelligence/investor')) return permissions?.isAdmin;
            if (link.href.includes('/contributors/wallets')) return permissions?.isAdmin || permissions?.canManageFinancials;
            if (link.href.includes('/contributors/submissions')) return permissions?.isAdmin || permissions?.isQualityReviewer;
            if (link.href.includes('/contributors/economy')) return permissions?.isAdmin || permissions?.canManageAI;
            if (link.href.includes('/intelligence/gamification')) return permissions?.isAdmin || permissions?.canViewIntelligence;
            if (link.href.includes('/intelligence/risk')) return permissions?.isAdmin || permissions?.canViewIntelligence;
            if (link.href.includes('/intelligence/tasks')) return permissions?.isAdmin || permissions?.canViewIntelligence;
            if (link.href.includes('/marketplace') && !link.href.includes('/auctions') && !link.href.includes('/points')) return permissions?.isAdmin || permissions?.canManageDeals;
            if (link.href.includes('/vendors')) return permissions?.isAdmin || permissions?.canManageVendors;
            if (link.href.includes('/vendors/new')) return permissions?.isAdmin || permissions?.canManageVendors;
            if (link.href.includes('/marketing/deals')) return permissions?.isAdmin || permissions?.canManageDeals;
            if (link.href.includes('/intelligence/ai')) return permissions?.isAdmin || permissions?.canManageAI;
            if (link.href.includes('/intelligence/agent-control')) return permissions?.isAdmin || permissions?.canManageAI;
            if (link.href.includes('/intelligence/economy-config')) return permissions?.isAdmin || permissions?.canManageAI;
            if (link.href.includes('/intelligence/customers')) return permissions?.isAdmin || permissions?.canViewIntelligence;
            if (link.href.includes('/intelligence/communications')) return permissions?.isAdmin;
            if (link.href.includes('/intelligence/fraud')) return permissions?.isAdmin;
            if (link.href.includes('/marketing/pricing')) return permissions?.isAdmin || permissions?.canManageMarketing;
            if (link.href.includes('/marketing/news')) return permissions?.isAdmin || permissions?.canManageMarketing;
            if (link.href.includes('/marketing/content')) return permissions?.isAdmin || permissions?.canManageMarketing;
            if (link.href.includes('/marketing/verification-settings')) return permissions?.isAdmin || permissions?.canManageMarketing;
            if (link.href.includes('/users')) return permissions?.isAdmin;
            if (link.href.includes('/settings/payments')) return permissions?.isAdmin;
            if (link.href.includes('/settings/specializations')) return permissions?.isAdmin;
            return true;
          });

          if (allowedLinks.length === 0) return null;

          return (
            <div
              key={section.id}
              className="hub-card"
              style={{ '--card-border': section.borderColor, '--card-gradient': section.gradient, position: 'relative' } as React.CSSProperties}
            >
              <div className="card-info-container">
                <div className="card-info-icon">
                  i
                  <div className="card-tooltip">
                    {isRTL ? section.tooltipAr : section.tooltipEn}
                  </div>
                </div>
              </div>

              <Link href={`/${locale}${section.mainHref}`} className="hc-top-link">
                <div className="hc-top">
                  <div className="hc-top-inner">
                    <div className="hc-icon-wrapper" style={{ background: section.gradient }}>
                      {section.icon}
                    </div>
                    <div>
                      <h2 className="hc-title">{isRTL ? section.titleAr : section.titleEn}</h2>
                    </div>
                  </div>
                  <p className="hc-desc">{isRTL ? section.descAr : section.descEn}</p>
                </div>
              </Link>

              <div className="hc-body">
                {allowedLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    href={`/${locale}${link.href}`}
                    className="hub-link"
                  >
                    <div className="hub-link-left">
                      <span>{isRTL ? link.labelAr : link.labelEn}</span>
                      {link.badge && (
                        <span
                          className="hub-link-badge"
                          style={{ background: `${link.badgeColor}22`, color: link.badgeColor, border: `1px solid ${link.badgeColor}44` }}
                        >
                          {link.badge}
                        </span>
                      )}
                    </div>
                    <span className="hub-link-arrow" style={isRTL ? { transform: 'scaleX(-1)' } : {}}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── INTERACTIVE ENGINES + DAL + AI AGENTS (Admin Only) ── */}
      {permissions?.isAdmin && (
        <HubInteractiveClient
          isRTL={isRTL}
          locale={locale}
          agentConfigs={agentConfigs}
          initialFlags={initialFlags}
        />
      )}

    </div>
  )
}
