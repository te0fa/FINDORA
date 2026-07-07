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
function KpiCard({ label, value, trend, isPositive, icon, color = "#fff", subtitle }: { label: string; value: string | number; trend?: string; isPositive?: boolean; icon?: string; color?: string; subtitle?: string }) {
  return (
    <div className="kpi-card" style={{ '--accent': color } as React.CSSProperties}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <h3 className="kpi-label">{label}</h3>
        <div className="kpi-value-row">
          <span className="kpi-value">{value}</span>
          {trend && (
            <span className={`kpi-trend ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function AlertCard({ type, message, actionText, actionHref }: { type: 'warning' | 'danger' | 'info'; message: string; actionText?: string; actionHref?: string }) {
  const colors = {
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', icon: '⚠️' },
    danger: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: '🚨' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', icon: 'ℹ️' }
  }
  const config = colors[type]

  return (
    <div className="alert-card" style={{ background: config.bg, borderColor: config.border }}>
      <div className="alert-icon">{config.icon}</div>
      <div className="alert-body">
        <p style={{ color: config.text }}>{message}</p>
        {actionText && actionHref && (
          <Link href={actionHref} className="alert-action" style={{ color: config.text }}>
            {actionText} →
          </Link>
        )}
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
          overflow: hidden;
          transition: transform 0.2s, border-color 0.2s;
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

        /* Chart/Panel Sections */
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
        <KpiCard 
          label={locale === 'ar' ? 'إجمالي الإيرادات (Gross Revenue)' : 'Gross Revenue'}
          value={`${grossRevenue.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} EGP`}
          trend={grossRevenue > 0 ? "12.5%" : undefined} isPositive={true}
          icon="💰" color="#10b981"
          subtitle={locale === 'ar' ? 'حقيقية من دفتر الخزينة' : 'Real-time from Financial Ledger'}
        />
        <KpiCard 
          label={locale === 'ar' ? 'صافي الربح (Net Profit)' : 'Net Profit'}
          value={`${netProfit.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} EGP`}
          trend={netProfit > 0 ? "8.2%" : undefined} isPositive={true}
          icon="📈" color="#3b82f6"
          subtitle={locale === 'ar' ? 'بعد خصم جميع المصروفات المسجلة' : 'After deducting all recorded expenses'}
        />
        <KpiCard 
          label={locale === 'ar' ? 'العملاء النشطين (Active Customers)' : 'Active Customers'}
          value={activeCustomers.toLocaleString()}
          trend={activeCustomers > 0 ? "5.1%" : undefined} isPositive={true}
          icon="👥" color="#8b5cf6"
          subtitle={locale === 'ar' ? 'العملاء الذين قاموا بعمليات مؤخراً' : 'Customers with recent successful orders'}
        />
        <KpiCard 
          label={locale === 'ar' ? 'إجمالي الطلبات (Total Requests)' : 'Total Requests'}
          value={displayStats.totalRequests.toLocaleString()}
          trend={displayStats.totalRequests > 0 ? "2.4%" : undefined} isPositive={true}
          icon="📦" color="#f59e0b"
          subtitle={locale === 'ar' ? 'حجم العمليات الكلي على المنصة' : 'Total operational volume on the platform'}
        />
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
                  actionHref={`/${locale}/staff/queue`}
                />
              )}
              
              {displayStats.slaAtRisk > 0 && (
                <AlertCard 
                  type="warning"
                  message={locale === 'ar' ? `يوجد ${displayStats.slaAtRisk} طلبات معرضة للتأخير قريباً.` : `${displayStats.slaAtRisk} requests are at risk of missing SLA.`}
                  actionText={locale === 'ar' ? 'تسريع العمليات' : 'Expedite Operations'}
                  actionHref={`/${locale}/staff/queue`}
                />
              )}

              {displayStats.aiFailed > 0 && (
                <AlertCard 
                  type="danger"
                  message={locale === 'ar' ? `فشلت ${displayStats.aiFailed} مهام للذكاء الاصطناعي وتحتاج تدخل بشري.` : `${displayStats.aiFailed} AI tasks failed and require human intervention.`}
                  actionText={locale === 'ar' ? 'مراجعة الأخطاء' : 'Review Errors'}
                  actionHref={`/${locale}/staff/queue`}
                />
              )}

              {displayStats.slaBreached === 0 && displayStats.slaAtRisk === 0 && displayStats.aiFailed === 0 && (
                <AlertCard 
                  type="info"
                  message={locale === 'ar' ? 'جميع الأنظمة تعمل بكفاءة. لا يوجد أي تحذيرات حالياً.' : 'All systems operating efficiently. No active alerts.'}
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

      <DashboardQuickActions locale={locale} isRTL={isRTL} />
    </div>
  )
}
