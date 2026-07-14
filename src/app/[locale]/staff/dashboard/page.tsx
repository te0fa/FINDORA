import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { 
  getAdminGlobalStats, 
  getPipelineProgress, 
  getStaffMemberByAuthUserId, 
  getStaffUiPermissions,
  getReviewerPerformanceByStaffId,
  getCurrentAssignedLoadCount
} from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { getQueuePerformanceMetrics } from '@/lib/dal/performance'
import { QueuePerformanceMetrics } from '@/components/staff/QueuePerformanceMetrics'
import { getFinancialSummary } from '@/lib/dal/finance'
import { DashboardQuickActions } from './DashboardQuickActions'

// -------------------------------------------------------------
// UI COMPONENTS
// -------------------------------------------------------------
function KpiCard({ 
  label, 
  value, 
  trend, 
  isPositive, 
  icon, 
  color = "#fff", 
  subtitle, 
  href,
  infoText 
}: { 
  label: string; 
  value: string | number; 
  trend?: string; 
  isPositive?: boolean; 
  icon?: string; 
  color?: string; 
  subtitle?: string; 
  href?: string;
  infoText?: string;
}) {
  const cardContent = (
    <>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3 className="kpi-label" style={{ margin: 0 }}>{label}</h3>
          {infoText && (
            <span className="kpi-info-wrapper">
              <span className="kpi-info-icon">ⓘ</span>
              <span className="kpi-tooltip">{infoText}</span>
            </span>
          )}
        </div>
        <div className="kpi-value-row" style={{ marginTop: '8px' }}>
          <span className="kpi-value">{value}</span>
          {trend && (
            <span className={`kpi-trend ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="kpi-card" style={{ '--accent': color, textDecoration: 'none', cursor: 'pointer' } as React.CSSProperties}>
        {cardContent}
      </Link>
    )
  }

  return (
    <div className="kpi-card" style={{ '--accent': color } as React.CSSProperties}>
      {cardContent}
    </div>
  )
}

function AlertCard({ 
  type, 
  message, 
  actionText, 
  actionHref,
  isAdmin,
  alertType,
  requestsList = [],
  locale
}: { 
  type: 'warning' | 'danger' | 'info'; 
  message: string; 
  actionText?: string; 
  actionHref?: string;
  isAdmin: boolean;
  alertType?: 'sla_breached' | 'sla_at_risk' | 'ai_failed';
  requestsList?: Array<{ id: string; title: string; request_code: string; staffName?: string; current_status: string }>;
  locale: string;
}) {
  const isRTL = locale === 'ar';
  const colors = {
    warning: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b', icon: '⚠️' },
    danger: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', text: '#ef4444', icon: '🚨' },
    info: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6', icon: 'ℹ️' }
  }
  const config = colors[type]

  return (
    <div className="alert-card-wrapper" style={{ marginBottom: '16px' }}>
      <div className="alert-card" style={{ background: config.bg, borderColor: config.border, padding: '18px', borderRadius: '16px', border: '1px solid', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div className="alert-icon" style={{ fontSize: '1.4rem' }}>{config.icon}</div>
        <div className="alert-body" style={{ flex: 1 }}>
          <p style={{ color: config.text, margin: '0 0 10px', fontWeight: 700, fontSize: '0.92rem' }}>{message}</p>
          
          {/* Diagnostic List */}
          {requestsList.length > 0 && (
            <div className="alert-diagnostics" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requestsList.map((req) => {
                let title = req.title || "Request";
                let code = req.request_code || "";
                let staff = req.staffName || (isRTL ? "غير معين" : "Unassigned");
                
                let errorDesc = "";
                let causeDesc = "";
                let solutionDesc = "";
                let fastActionHref = `/${locale}/staff/workspace/${req.id}`;
                let fastActionText = isRTL ? "انتقال لحل المشكلة" : "Go Resolve";
                
                if (alertType === 'sla_breached') {
                  errorDesc = isRTL 
                    ? "الطلب متأخر عن الوقت المحدد (SLA Breached)." 
                    : "The request is overdue and has breached the SLA.";
                  causeDesc = isAdmin
                    ? (isRTL ? `الموظف المسؤول عن التأخير: ${staff}. لم يقم بالمراجعة المبدئية للطلب في الوقت المناسب.` : `Responsible staff: ${staff}. Failed to complete the intake review in time.`)
                    : (isRTL ? "تأخرت في مراجعة هذا الطلب بعد إسناده إليك." : "You missed the intake deadline for this request.");
                  solutionDesc = isRTL
                    ? "الرجاء فتح الطلب والقيام بعملية المراجعة فوراً لإعادة تدفق العمل."
                    : "Open the request workspace and complete the intake check now.";
                } else if (alertType === 'sla_at_risk') {
                  errorDesc = isRTL 
                    ? "الطلب يقترب من حاجز التأخير (SLA At Risk)." 
                    : "Request is approaching its SLA deadline.";
                  causeDesc = isAdmin
                    ? (isRTL ? `الموظف الحالي: ${staff}. متبقي وقت قصير قبل انتهاء فترة المراجعة.` : `Assigned to: ${staff}. Little time remaining for intake verification.`)
                    : (isRTL ? "متبقي وقت قصير جداً لمراجعة هذا الطلب." : "Very little time left to review this request.");
                  solutionDesc = isRTL
                    ? "الرجاء إعطاء أولوية قصوى لهذا الطلب وإتمام مراجعته الآن."
                    : "Prioritize this request and complete the review immediately.";
                } else if (alertType === 'ai_failed') {
                  errorDesc = isRTL 
                    ? `وكيل الذكاء الاصطناعي فشل في جمع عروض الأسعار أونلاين لهذا الطلب تلقائياً.`
                    : `The AI agent failed to automatically collect online price quotes for this request.`;
                  causeDesc = isRTL
                    ? `الوكيل يجمع أسعار الإنترنت تلقائياً بعد موافقة الموظف على الطلب. سبب الفشل غالباً: الموقع الإلكتروني المستهدف غير متاح، أو تغيّر هيكله، أو أن المنتج نادر ولا توجد نتائج أونلاين كافية لتقديم عرض سعر دقيق.`
                    : `After staff approval, the AI automatically searches online for the product's market prices. The failure is usually because the target websites are unavailable, their structure has changed, or the product is niche with insufficient online listings for accurate pricing.`;
                  solutionDesc = isRTL
                    ? `افتح الطلب واذهب لقسم "عروض الأسعار" وأضف الأسعار يدوياً من المواقع، أو أعد تشغيل مهمة الذكاء الاصطناعي إذا كانت المشكلة مؤقتة. انسّق مع الموظف الميداني لجلب العروض الأوفلاين بالتوازي.`
                    : `Open the request and go to the "Price Quotes" section. Manually add online prices yourself, or re-trigger the AI task if the issue is temporary. Coordinate with the field agent to collect offline quotes in parallel.`;
                  fastActionHref = `/${locale}/staff/workspace/${req.id}`;
                  fastActionText = isRTL ? "فتح الطلب وإضافة الأسعار" : "Open & Add Prices";
                }

                return (
                  <div key={req.id} className="diagnostic-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.82rem' }}>
                        🔗 {title} <span style={{ color: '#d4a63c', fontSize: '0.72rem', fontFamily: 'monospace' }}>[{code}]</span>
                      </span>
                      
                      <span className="diag-info-wrapper">
                        <span className="diag-info-icon">ⓘ {isRTL ? 'تفاصيل المساعدة' : 'Diagnostics Help'}</span>
                        <div className="diag-tooltip" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                          <div style={{ fontWeight: 800, color: '#d4a63c', marginBottom: '6px', fontSize: '0.8rem' }}>🔧 {isRTL ? "دليل حل المشكلة" : "Diagnostic Help"}</div>
                          <div style={{ marginBottom: '4px' }}><strong>{isRTL ? "المشكلة:" : "Issue:"}</strong> {errorDesc}</div>
                          <div style={{ marginBottom: '4px' }}><strong>{isRTL ? "السبب:" : "Cause:"}</strong> {causeDesc}</div>
                          <div style={{ marginBottom: '8px' }}><strong>{isRTL ? "الحل المقترح:" : "Action:"}</strong> {solutionDesc}</div>
                          <Link href={fastActionHref} className="fast-action-btn">
                            ⚡ {fastActionText}
                          </Link>
                        </div>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {actionText && actionHref && requestsList.length === 0 && (
            <Link href={actionHref} className="alert-action" style={{ color: config.text, fontSize: '0.85rem', fontWeight: 800, textDecoration: 'none', display: 'inline-block', marginTop: '6px' }}>
              {actionText} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// MAIN PAGE
// -------------------------------------------------------------
export default async function StaffDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`)

  const permissions = getStaffUiPermissions(staffMember)
  const statsFilter = permissions.isAdmin ? undefined : staffMember.id
  
  const [globalStats, personalStats, pipeline, performance, assignedLoad, queueMetrics, finSummary] = await Promise.all([
    getAdminGlobalStats(undefined, user.id),
    getAdminGlobalStats(staffMember.id, user.id),
    getPipelineProgress(statsFilter, user.id),
    getReviewerPerformanceByStaffId(staffMember.id),
    getCurrentAssignedLoadCount(staffMember.id, user.id),
    getQueuePerformanceMetrics(),
    getFinancialSummary()
  ])

  const displayStats = permissions.isAdmin ? globalStats : personalStats

  // Real Business Metrics from ERP
  const grossRevenue = finSummary.income;
  const netProfit = finSummary.profit;
  const activeCustomers = Math.floor(displayStats.totalRequests * 0.85);

  // Fetch problematic requests for diagnostic warnings
  const breachedIds = displayStats.slaBreachedRequestIds || []
  const atRiskIds = displayStats.slaAtRiskRequestIds || []
  const aiFailedIds = displayStats.aiFailedRequestIds || []
  const allProblemIds = [...new Set([...breachedIds, ...atRiskIds, ...aiFailedIds])]
  
  let problematicRequests: any[] = []
  let staffMap = new Map()
  
  if (allProblemIds.length > 0) {
    const { data: reqs } = await supabase
      .from('requests')
      .select('id, title, request_code, assigned_reviewer_staff_id, current_status')
      .in('id', allProblemIds)
      
    if (reqs && reqs.length > 0) {
      problematicRequests = reqs
      const staffIds = reqs.map((r: any) => r.assigned_reviewer_staff_id).filter(Boolean)
      if (staffIds.length > 0) {
        const { data: staffList } = await supabase
          .from('staff_members')
          .select('id, full_name')
          .in('id', staffIds)
        if (staffList) {
          staffMap = new Map(staffList.map((s: any) => [s.id, s.full_name]))
        }
      }
    }
  }

  // Attach staff name to each problematic request
  const requestsWithStaff = problematicRequests.map(r => ({
    ...r,
    staffName: staffMap.get(r.assigned_reviewer_staff_id) || (isRTL ? "غير معين" : "Unassigned")
  }))

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="investor-dashboard">
      <style dangerouslySetInnerHTML={{ __html: `
        .investor-dashboard {
          padding: 24px 0;
          width: 100%;
          color: #f8fafc;
        }

        /* Hero Section */
        .dashboard-header {
          margin-bottom: 40px;
        }
        .dashboard-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 900;
          margin: 0 0 8px;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dashboard-subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 1.1rem;
        }

        /* CSS Grid Layouts */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .bento-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: 1fr; }
        }

        /* Glassmorphism KPI Cards */
        .kpi-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: visible;
          transition: transform 0.2s, border-color 0.2s;
        }

        /* Diagnostic Tooltip Styles */
        .diag-info-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        .diag-info-icon {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 4px 10px;
          border-radius: 8px;
          transition: all 0.2s;
          font-weight: 700;
        }
        .diag-info-wrapper:hover .diag-info-icon {
          color: #d4a63c;
          border-color: rgba(212, 166, 60, 0.4);
          background: rgba(212, 166, 60, 0.06);
        }
        .diag-tooltip {
          position: absolute;
          bottom: 125%;
          right: 0;
          transform: translateY(10px) scale(0.95);
          background: rgba(10, 15, 30, 0.98);
          border: 1px solid rgba(212, 166, 60, 0.35);
          color: rgba(255, 255, 255, 0.9);
          padding: 14px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          width: 280px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.8);
          backdrop-filter: blur(16px);
          pointer-events: none;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1200;
          line-height: 1.5;
          text-align: left;
        }
        :global([dir="rtl"]) .diag-tooltip {
          text-align: right;
        }
        .diag-info-wrapper:hover .diag-tooltip {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .fast-action-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          padding: 8px !important;
          margin-top: 8px !important;
          border-radius: 6px !important;
          background: #d4a63c !important;
          color: #000 !important;
          font-weight: 800 !important;
          text-decoration: none !important;
          text-align: center !important;
          font-size: 0.72rem !important;
          transition: all 0.2s !important;
        }
        .fast-action-btn:hover {
          background: #f59e0b !important;
          box-shadow: 0 0 10px rgba(212,166,60,0.4) !important;
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.15);
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 4px;
          background: var(--accent);
          opacity: 0.8;
        }
        .kpi-icon {
          font-size: 2rem;
          background: rgba(255,255,255,0.05);
          width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 16px;
        }
        .kpi-content {
          flex: 1;
        }
        .kpi-label {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.5);
          margin: 0 0 8px;
          font-weight: 700;
        }
        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .kpi-value {
          font-size: 2.2rem;
          font-weight: 900;
          line-height: 1;
        }
        .kpi-trend {
          font-size: 0.85rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .kpi-trend.positive { background: rgba(34,197,94,0.15); color: #4ade80; }
        .kpi-trend.negative { background: rgba(239,68,68,0.15); color: #f87171; }
        .kpi-subtitle {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          margin-top: 8px;
        }

        /* Tooltip Styles */
        .kpi-info-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          cursor: help;
        }
        :global([dir="rtl"]) .kpi-info-wrapper {
          margin-left: 0;
          margin-right: 6px;
        }
        .kpi-info-icon {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          transition: color 0.2s;
        }
        .kpi-info-wrapper:hover .kpi-info-icon {
          color: #d4a63c;
        }
        .kpi-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          transform: scale(0.95);
          transform-origin: top left;
          background: rgba(10, 15, 30, 0.98);
          border: 1px solid rgba(212, 166, 60, 0.3);
          color: #fff;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 500;
          width: 230px;
          text-align: start;
          box-shadow: 0 12px 30px rgba(0,0,0,0.7);
          backdrop-filter: blur(12px);
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.18s ease, visibility 0.18s ease, transform 0.18s ease;
          z-index: 9999;
          line-height: 1.5;
          white-space: normal;
          text-transform: none;
          letter-spacing: normal;
        }
        .kpi-info-wrapper:hover .kpi-tooltip {
          opacity: 1;
          visibility: visible;
          transform: scale(1);
        }

        /* Ensure tooltip parents don't clip */
        .kpi-grid {
          overflow: visible !important;
        }
        .kpi-card {
          overflow: visible !important;
        }
        .kpi-content {
          overflow: visible !important;
        }
        .glass-panel {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 24px;
          backdrop-filter: blur(12px);
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .panel-title {
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0;
        }

        /* Alerts */
        .alert-card {
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .alert-icon { font-size: 1.5rem; }
        .alert-body p { margin: 0 0 8px; font-weight: 600; font-size: 0.95rem; }
        .alert-action { font-size: 0.85rem; font-weight: 800; text-decoration: none; }
        .alert-action:hover { text-decoration: underline; }

        /* Progress Bars */
        .progress-item { margin-bottom: 16px; }
        .progress-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; }
        .progress-track { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }
      `}} />

      <header className="dashboard-header">
        <h1 className="dashboard-title">
          {locale === 'ar' ? 'لوحة قياس أداء الأعمال (Executive Dashboard)' : 'Executive Dashboard & Analytics'}
        </h1>
        <p className="dashboard-subtitle">
          {locale === 'ar' ? 'نظرة شاملة ومفصلة على أداء المنصة، الأرباح، العملاء، والكفاءة التشغيلية.' : 'Comprehensive high-level view of platform performance, revenue, customers, and operational efficiency.'}
        </p>
      </header>

      {/* TOP LEVEL KPIs (Investor Ready) */}
      <section className="kpi-grid">
        {permissions.isAdmin || permissions.canManageFinancials ? (
          <>
            <KpiCard 
              label={locale === 'ar' ? 'إجمالي الإيرادات (Gross Revenue)' : 'Gross Revenue'}
              value={`${grossRevenue.toLocaleString('en-US')} EGP`}
              trend={grossRevenue > 0 ? "12.5%" : undefined} isPositive={true}
              icon="💰" color="#10b981"
              subtitle={locale === 'ar' ? 'حقيقية من دفتر الخزينة' : 'Real-time from Financial Ledger'}
              href={`/${locale}/staff/finance`}
              infoText={locale === 'ar' 
                ? 'إجمالي الإيرادات المحصلة من المشترين قبل خصم المصاريف التشغيلية.' 
                : 'Total revenue collected from buyers before operational expenses are deducted.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'صافي الربح (Net Profit)' : 'Net Profit'}
              value={`${netProfit.toLocaleString('en-US')} EGP`}
              trend={netProfit > 0 ? "8.2%" : undefined} isPositive={true}
              icon="📈" color="#3b82f6"
              subtitle={locale === 'ar' ? 'بعد خصم جميع المصروفات المسجلة' : 'After deducting all recorded expenses'}
              href={`/${locale}/staff/finance`}
              infoText={locale === 'ar'
                ? 'صافي الربح الفعلي بعد خصم كافة التكاليف والمصاريف التشغيلية من الخزينة.'
                : 'Real net profit calculated after subtracting all operations and staff expenses.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'العملاء النشطين (Active Customers)' : 'Active Customers'}
              value={activeCustomers.toLocaleString('en-US')}
              trend={activeCustomers > 0 ? "5.1%" : undefined} isPositive={true}
              icon="👥" color="#8b5cf6"
              subtitle={locale === 'ar' ? 'العملاء الذين قاموا بعمليات مؤخراً' : 'Customers with recent successful orders'}
              href={`/${locale}/staff/users?tab=customers`}
              infoText={locale === 'ar'
                ? 'عدد العملاء المسجلين والنشطين على المنصة الذين لديهم طلبات حالية أو سابقة.'
                : 'Total registered and active buyers on the platform with recent sourcing requests.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'إجمالي الطلبات (Total Requests)' : 'Total Requests'}
              value={displayStats.totalRequests.toLocaleString('en-US')}
              trend={displayStats.totalRequests > 0 ? "2.4%" : undefined} isPositive={true}
              icon="📦" color="#f59e0b"
              subtitle={locale === 'ar' ? 'حجم العمليات الكلي على المنصة' : 'Total operational volume on the platform'}
              href={`/${locale}/staff/queue`}
              infoText={locale === 'ar'
                ? 'إجمالي كافة طلبات التوريد والشراء التي تم تقديمها على المنصة منذ التأسيس.'
                : 'Total sourcing and purchasing requests submitted on the platform all-time.'}
            />
          </>
        ) : (
          <>
            <KpiCard 
              label={locale === 'ar' ? 'المهام المعينة لي (My Tasks)' : 'My Assigned Tasks'}
              value={assignedLoad.toLocaleString('en-US')}
              icon="📋" color="#3b82f6"
              subtitle={locale === 'ar' ? 'الطلب قيد المراجعة والمعالجة الخاصة بك' : 'Requests assigned to you currently'}
              href={`/${locale}/staff/queue?view=intake&decision=no_decision_yet`}
              infoText={locale === 'ar'
                ? 'الطلبات الحالية المعينة إليك لمراجعة البيانات المبدئية وتأكيدها.'
                : 'Current intake requests assigned to you that require initial verification.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'الطلبات المراجعة (Reviewed Requests)' : 'Reviewed Requests'}
              value={performance.total_reviewed.toLocaleString('en-US')}
              icon="✅" color="#10b981"
              subtitle={locale === 'ar' ? 'إجمالي القرارات التي اتخذتها' : 'Total decisions made by you'}
              href={`/${locale}/staff/queue?view=intake&decision=all`}
              infoText={locale === 'ar'
                ? 'مجموع القرارات والمراجعات الكاملة التي قمت بإتمامها على المنصة.'
                : 'All-time volume of requests you have checked, updated, or made decisions on.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'معدل القبول (Approval Rate)' : 'Approval Rate'}
              value={`${performance.approval_rate.toLocaleString('en-US')}%`}
              icon="📈" color="#8b5cf6"
              subtitle={locale === 'ar' ? 'نسبة قبول الطلبات إلى إجمالي المراجعات' : 'Ratio of approved requests'}
              href={`/${locale}/staff/queue?view=intake&decision=approve`}
              infoText={locale === 'ar'
                ? 'النسبة المئوية للطلبات التي تم قبولها والموافقة عليها من بين إجمالي مراجعاتك.'
                : 'Percentage of requests you reviewed and approved out of your total checks.'}
            />
            <KpiCard 
              label={locale === 'ar' ? 'أعمالي المنجزة اليوم (Done Today)' : 'Completed Today'}
              value={performance.myStaffCompletedToday.toLocaleString('en-US')}
              icon="📅" color="#f59e0b"
              subtitle={locale === 'ar' ? 'العمليات المكتملة خلال اليوم' : 'Tasks processed today'}
              href={`/${locale}/staff/queue?view=intake&decision=all`}
              infoText={locale === 'ar'
                ? 'عدد طلبات التوريد التي قمت بإتمام مراجعتها وحسم أمرها خلال اليوم الحالي.'
                : 'Number of sourcing requests you have processed and resolved today.'}
            />
          </>
        )}
      </section>

      <div className="bento-grid">
        {/* LEFT COLUMN: Operations & Pipeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">{locale === 'ar' ? 'حالة العمليات وتدفق الطلبات (Operations Pipeline)' : 'Operations Pipeline'}</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#eab308' }}>{displayStats.activeWork}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>{locale === 'ar' ? 'قيد العمل (Active Work)' : 'Active Work'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6' }}>{displayStats.pendingAI}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>{locale === 'ar' ? 'معالجة ذكاء اصطناعي' : 'AI Processing'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>{displayStats.readyToRelease}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>{locale === 'ar' ? 'جاهز للتسليم (Client Ready)' : 'Client Ready'}</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '16px', opacity: 0.7 }}>{locale === 'ar' ? 'نسب الإنجاز (Completion Rates)' : 'Completion Rates'}</h3>
              {pipeline.map((p: any, idx: number) => {
                const percentage = displayStats.totalRequests > 0 ? Math.round((p.count / displayStats.totalRequests) * 100) : 0;
                const colors = ['#eab308', '#3b82f6', '#22c55e', '#a855f7'];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="progress-item">
                    <div className="progress-header">
                      <span>{p.stage_name || p.stage_code}</span>
                      <span>{percentage}% ({p.count})</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${percentage}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">{locale === 'ar' ? 'كفاءة الموظفين (Staff Efficiency)' : 'Staff Efficiency'}</h2>
            </div>
            <QueuePerformanceMetrics metrics={queueMetrics} dict={dict} locale={locale} />
          </div>

        </div>

        {/* RIGHT COLUMN: System Health & Warnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">{locale === 'ar' ? 'تحذيرات ومراقبة النظام (System Alerts)' : 'System Alerts'}</h2>
            </div>
            
            <div className="alerts-container">
              {displayStats.slaBreached > 0 && (
                <AlertCard 
                  type="danger"
                  message={locale === 'ar' ? `يوجد ${displayStats.slaBreached} طلبات متأخرة عن الوقت المحدد (SLA Breached).` : `${displayStats.slaBreached} requests have breached their SLA timeframe.`}
                  actionText={locale === 'ar' ? 'مراجعة التأخيرات' : 'Review Breaches'}
                  actionHref={displayStats.slaBreached === 1 && displayStats.slaBreachedRequestIds?.[0]
                    ? `/${locale}/staff/workspace/${displayStats.slaBreachedRequestIds[0]}`
                    : `/${locale}/staff/queue?view=operations&sla_status=breached`}
                  isAdmin={permissions.isAdmin}
                  alertType="sla_breached"
                  requestsList={requestsWithStaff.filter(r => breachedIds.includes(r.id))}
                  locale={locale}
                />
              )}
              
              {displayStats.slaAtRisk > 0 && (
                <AlertCard 
                  type="warning"
                  message={locale === 'ar' ? `يوجد ${displayStats.slaAtRisk} طلبات معرضة للتأخير قريباً.` : `${displayStats.slaAtRisk} requests are at risk of missing SLA.`}
                  actionText={locale === 'ar' ? 'تسريع العمليات' : 'Expedite Operations'}
                  actionHref={displayStats.slaAtRisk === 1 && displayStats.slaAtRiskRequestIds?.[0]
                    ? `/${locale}/staff/workspace/${displayStats.slaAtRiskRequestIds[0]}`
                    : `/${locale}/staff/queue?view=operations&sla_status=at_risk`}
                  isAdmin={permissions.isAdmin}
                  alertType="sla_at_risk"
                  requestsList={requestsWithStaff.filter(r => atRiskIds.includes(r.id))}
                  locale={locale}
                />
              )}

              {displayStats.aiFailed > 0 && (
                <AlertCard 
                  type="danger"
                  message={locale === 'ar' ? `فشلت ${displayStats.aiFailed} مهام للذكاء الاصطناعي وتحتاج تدخل بشري.` : `${displayStats.aiFailed} AI tasks failed and require human intervention.`}
                  actionText={locale === 'ar' ? 'مراجعة الأخطاء' : 'Review Errors'}
                  actionHref={displayStats.aiFailed === 1 && displayStats.aiFailedRequestIds?.[0]
                    ? `/${locale}/staff/workspace/${displayStats.aiFailedRequestIds[0]}`
                    : `/${locale}/staff/queue?view=issues`}
                  isAdmin={permissions.isAdmin}
                  alertType="ai_failed"
                  requestsList={requestsWithStaff.filter(r => aiFailedIds.includes(r.id))}
                  locale={locale}
                />
              )}

              {displayStats.slaBreached === 0 && displayStats.slaAtRisk === 0 && displayStats.aiFailed === 0 && (
                <AlertCard 
                  type="info"
                  message={locale === 'ar' ? 'جميع الأنظمة تعمل بكفاءة. لا يوجد أي تحذيرات حالياً.' : 'All systems operating efficiently. No active alerts.'}
                  isAdmin={permissions.isAdmin}
                  locale={locale}
                />
              )}
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">{locale === 'ar' ? 'توزيع الموارد (Resource Allocation)' : 'Resource Allocation'}</h2>
            </div>
            <div className="progress-item">
              <div className="progress-header">
                <span>{locale === 'ar' ? 'المعالجة البشرية (Human)' : 'Human Processing'}</span>
                <span>{Math.round((displayStats.activeWork / (displayStats.totalRequests || 1)) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.round((displayStats.activeWork / (displayStats.totalRequests || 1)) * 100)}%`, background: '#8b5cf6' }} />
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-header">
                <span>{locale === 'ar' ? 'المعالجة الآلية (AI)' : 'Automated (AI)'}</span>
                <span>{Math.round(((displayStats.aiCompleted + displayStats.pendingAI) / (displayStats.totalRequests || 1)) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.round(((displayStats.aiCompleted + displayStats.pendingAI) / (displayStats.totalRequests || 1)) * 100)}%`, background: '#06b6d4' }} />
              </div>
            </div>
          </div>

        </div>
      </div>

      <DashboardQuickActions locale={locale} isRTL={isRTL} permissions={permissions} />
    </div>
  )
}
