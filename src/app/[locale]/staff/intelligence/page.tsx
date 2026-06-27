import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { getPlatformIntelligenceOverview, getTrustFunnelMetricsAdmin } from '@/lib/dal/intelligence-dashboard';

function StatCard({ label, value, icon, href, color }: { label: string; value: string | number; icon: string; href?: string; color?: string }) {
  const content = (
    <div className="intel-stat-card" style={{ borderLeft: color ? `4px solid ${color}` : undefined }}>
      <div className="stat-icon-wrap" style={{ background: color ? `${color}15` : undefined }}>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="stat-link-wrapper">{content}</Link>;
  }
  return content;
}

export default async function IntelligenceOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === 'ar';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) {
    // Basic intelligence access for non-admins? User said "Admin and owner can access all".
    // "archive_manager should NOT automatically access intelligence"
    // I'll stick to Admin/Owner for now.
    return (
      <div className="staff-error-page">
         <h1>{isRTL ? 'غير مسموح' : 'Access Denied'}</h1>
         <p>{isRTL ? 'هذه الصفحة متاحة للمديرين فقط.' : 'This page is only available for administrators.'}</p>
      </div>
    );
  }

  const overview = await getPlatformIntelligenceOverview();
  const trustMetrics = await getTrustFunnelMetricsAdmin();

  return (
    <div className="intelligence-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .intelligence-page { width: 100%; }
        .page-header { margin-bottom: 40px; }
        .page-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.02em; }
        .page-subtitle { color: rgba(255,255,255,0.5); font-size: 1.1rem; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .intel-stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.2s ease;
        }

        .stat-link-wrapper { text-decoration: none; color: inherit; }
        .stat-link-wrapper:hover .intel-stat-card {
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
          border-color: rgba(212,166,60,0.3);
        }

        .stat-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          font-size: 1.5rem;
        }

        .stat-value { font-size: 2rem; font-weight: 900; line-height: 1.2; }
        .stat-label { font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

        .dashboard-sections {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 30px;
        }

        .section-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 30px;
        }

        .section-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }

        .funnel-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .funnel-step {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .step-info { flex: 1; }
        .step-label { font-size: 0.95rem; font-weight: 800; margin-bottom: 4px; }
        .step-meta { font-size: 0.85rem; color: rgba(255,255,255,0.45); }

        .step-progress {
          width: 200px;
          height: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 5px;
          overflow: hidden;
        }

        .step-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }

        .nav-links {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .intel-nav-btn {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          text-decoration: none;
          color: #e2e8f0;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .intel-nav-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(212,166,60,0.3);
          color: #f7d46b;
          transform: translateX(4px);
        }

        [dir="rtl"] .intel-nav-btn:hover { transform: translateX(-4px); }

        @media (max-width: 1000px) {
          .dashboard-sections { grid-template-columns: 1fr; }
        }
      ` }} />

      <header className="page-header">
        <h1 className="page-title">{isRTL ? 'ذكاء المنصة' : 'Platform Intelligence'}</h1>
        <p className="page-subtitle">{isRTL ? 'نظرة شاملة على أداء العملاء والموردين والتواصل.' : 'Overview of customers, merchants, and communication performance.'}</p>
      </header>

      <div className="stats-grid">
        <StatCard label={isRTL ? 'إجمالي العملاء' : 'Total Customers'} value={overview.totalCustomers} icon="👤" href={`/${locale}/staff/intelligence/customers`} color="#3b82f6" />
        <StatCard label={isRTL ? 'إجمالي الموردين' : 'Total Merchants'} value={overview.totalMerchants} icon="🏪" href={`/${locale}/staff/intelligence/merchants`} color="#f59e0b" />
        <StatCard label={isRTL ? 'إجمالي الطلبات' : 'Total Requests'} value={overview.totalRequests} icon="📋" color="#10b981" />
        <StatCard label={isRTL ? 'رسائل مسودة' : 'Draft Messages'} value={overview.totalDraftMessages} icon="✉️" href={`/${locale}/staff/intelligence/communications`} color="#8b5cf6" />
      </div>

      <div className="dashboard-sections">
        <section className="section-card">
          <h2 className="section-title">📊 {isRTL ? 'قمع العمليات' : 'Operations Funnel'}</h2>
          <div className="funnel-container">
            {[
              { label: isRTL ? 'طلبات مقدمة' : 'Requests Submitted', count: overview.funnel.submitted, color: '#64748b' },
              { label: isRTL ? 'طلبات مقبولة' : 'Requests Accepted', count: overview.funnel.accepted, color: '#3b82f6' },
              { label: isRTL ? 'تقارير جاهزة' : 'Reports Ready', count: overview.funnel.ready, color: '#f59e0b' },
              { label: isRTL ? 'طلبات مكتملة' : 'Completed', count: overview.funnel.completed, color: '#10b981' }
            ].map((step, idx, arr) => {
              const percentage = Math.round((step.count / (arr[0].count || 1)) * 100);
              return (
                <div key={idx} className="funnel-step">
                  <div className="step-info">
                    <div className="step-label">{step.label}</div>
                    <div className="step-meta">{step.count} {isRTL ? 'طلب' : 'Requests'} ({percentage}%)</div>
                  </div>
                  <div className="step-progress">
                    <div className="step-fill" style={{ width: `${percentage}%`, background: step.color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div>
                <div className="stat-label">{isRTL ? 'طلبات نشطة' : 'Active Requests'}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{overview.activeRequests}</div>
             </div>
             <div>
                <div className="stat-label">{isRTL ? 'طلبات مرفوضة' : 'Rejected Requests'}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: '#ef4444' }}>{overview.rejectedRequests}</div>
             </div>
          </div>
        </section>

        <aside className="section-card">
          <h2 className="section-title">🧭 {isRTL ? 'تصفح التقارير' : 'Explore Reports'}</h2>
          <div className="nav-links">
            <Link href={`/${locale}/staff/intelligence/merchants`} className="intel-nav-btn">
              <span>🏪</span>
              <span>{isRTL ? 'دليل الموردين والذكاء' : 'Merchant Intelligence'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/sourcing-config`} className="intel-nav-btn" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.03)' }}>
              <span>🔌</span>
              <span>{isRTL ? 'إعدادات محركات البحث أونلاين' : 'Online Sourcing Config'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/moat`} className="intel-nav-btn" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.03)' }}>
              <span>🏯</span>
              <span>{isRTL ? 'الخندق الدفاعي التنافسي MOAT' : 'Platform Defensive Moats'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/moat/tracker`} className="intel-nav-btn" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.03)' }}>
              <span>🧠</span>
              <span>{isRTL ? 'متتبع خندق البيانات Tracker' : 'Data Moat Tracker'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/vision`} className="intel-nav-btn" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.03)' }}>
              <span>🌐</span>
              <span>{isRTL ? 'رؤية ومستقبل المشروع Vision' : 'Project Vision & Future'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/north-star`} className="intel-nav-btn" style={{ border: '1px solid rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.03)' }}>
              <span>⭐️</span>
              <span>{isRTL ? 'مؤشر الشمال والنجاح North Star' : 'North Star Metric'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/competitors`} className="intel-nav-btn" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.03)' }}>
              <span>⚔️</span>
              <span>{isRTL ? 'تحليل ومقارنة المنافسين' : 'Competitor Comparison'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/kill-list`} className="intel-nav-btn" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.03)' }}>
              <span>☠️</span>
              <span>{isRTL ? 'قائمة المحظورات والتركيز' : 'Startup Kill List'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/crm`} className="intel-nav-btn" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.03)' }}>
              <span>🤝</span>
              <span>{isRTL ? 'لوحة تحكم CRM للنظام' : 'Platform CRM Dashboard'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/growth`} className="intel-nav-btn" style={{ border: '1px solid rgba(236, 72, 153, 0.3)', background: 'rgba(236, 72, 153, 0.03)' }}>
              <span>📢</span>
              <span>{isRTL ? 'قنوات النمو وإعلانات الـ CRM' : 'Growth & CRM Ads'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/customers`} className="intel-nav-btn">
              <span>👤</span>
              <span>{isRTL ? 'سجل العملاء والذكاء' : 'Customer Intelligence'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/communications`} className="intel-nav-btn">
              <span>✉️</span>
              <span>{isRTL ? 'مركز الرسائل الصادرة' : 'Outbound Message Center'}</span>
            </Link>
            <Link href={`/${locale}/staff/payments`} className="intel-nav-btn">
              <span>💰</span>
              <span>{isRTL ? 'مركز التحكم في المدفوعات' : 'Payments Control Center'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/ai`} className="intel-nav-btn" style={{ border: '1px solid rgba(212,166,60,0.3)', background: 'rgba(212,166,60,0.03)' }}>
              <span>🤖</span>
              <span>{isRTL ? 'مركز التحكم بالذكاء الاصطناعي' : 'AI Control Center'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/experiments`} className="intel-nav-btn" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.03)' }}>
              <span>🧪</span>
              <span>{isRTL ? 'تجارب وقرارات الشركة' : 'Company Experiments'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/roadmap`} className="intel-nav-btn" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.03)' }}>
              <span>🗺️</span>
              <span>{isRTL ? 'مراحل وتطور المشروع' : 'Project Roadmap'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/features`} className="intel-nav-btn" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.03)' }}>
              <span>📋</span>
              <span>{isRTL ? 'دورة حياة الميزات Lifecycle' : 'Feature Lifecycle'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/features/product-graph`} className="intel-nav-btn" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.03)' }}>
              <span>🌐</span>
              <span>{isRTL ? 'قاعدة معرفة المنتجات Graph' : 'Universal Product Graph'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/actions`} className="intel-nav-btn" style={{ border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.03)' }}>

              <span>🎯</span>
              <span>{isRTL ? 'خطوات التنفيذ والتشغيل' : 'Execution Actions'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/founder`} className="intel-nav-btn" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.03)' }}>
              <span>👤</span>
              <span>{isRTL ? 'تقييم أداء المؤسس' : 'Founder Dashboard'}</span>
            </Link>
            <Link href={`/${locale}/staff/intelligence/hr`} className="intel-nav-btn" style={{ border: '1px solid rgba(236, 72, 153, 0.3)', background: 'rgba(236, 72, 153, 0.03)' }}>
              <span>🛡️</span>
              <span>{isRTL ? 'نظام إدارة الموظفين HR' : 'Staff HR & Reviews'}</span>
            </Link>
          </div>
          
          <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(212,166,60,0.05)', border: '1px solid rgba(212,166,60,0.1)', borderRadius: '16px' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#f7d46b', marginBottom: '8px' }}>💡 {isRTL ? 'نصيحة ذكاء الأعمال' : 'Intelligence Tip'}</h3>
             <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
               {isRTL 
                 ? 'استخدم تقارير الموردين لتحديد الشركاء الأكثر موثوقية بناءً على تاريخ عروض الأسعار.' 
                 : 'Use merchant reports to identify the most reliable partners based on their quoting history.'}
             </p>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2 className="section-title">🛡️ {isRTL ? 'قمع الثقة والإيرادات' : 'Trust Funnel & Revenue'}</h2>
        
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
          <StatCard label={isRTL ? 'تم التسعير' : 'Priced'} value={trustMetrics.counts.priced_requests} icon="🏷️" />
          <StatCard label={isRTL ? 'تقارير جاهزة' : 'Reports Prepared'} value={trustMetrics.counts.reports_prepared} icon="📄" />
          <StatCard label={isRTL ? 'نوايا دفع' : 'Payment Intents'} value={trustMetrics.counts.payment_intents_created} icon="💳" />
          <StatCard label={isRTL ? 'مدفوعات مؤكدة' : 'Payments Confirmed'} value={trustMetrics.counts.confirmed_payments} icon="✅" color="#10b981" />
          <StatCard label={isRTL ? 'فتح المصادر' : 'Sources Unlocked'} value={trustMetrics.counts.source_reveals_unlocked} icon="🔓" color="#f59e0b" />
        </div>

        <div className="dashboard-sections" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
          <section className="section-card">
             <h3 className="section-title" style={{ fontSize: '1.1rem' }}>💰 {isRTL ? 'ملخص الإيرادات' : 'Revenue Summary'}</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                   <span className="step-label">{isRTL ? 'الإيرادات المؤكدة' : 'Confirmed Revenue'}</span>
                   <span className="stat-value" style={{ fontSize: '1.25rem', color: '#10b981' }}>{trustMetrics.revenue.confirmed_revenue_total.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                   <span className="step-label">{isRTL ? 'متوسط قيمة الدفع' : 'Avg Payment Amount'}</span>
                   <span className="stat-value" style={{ fontSize: '1.25rem' }}>{Math.round(trustMetrics.revenue.average_confirmed_payment_amount).toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span className="step-label">{isRTL ? 'التحويل: معاينة إلى دفع' : 'Preview to Unlock Rate'}</span>
                   <span className="stat-value" style={{ fontSize: '1.25rem', color: '#3b82f6' }}>{trustMetrics.conversion_rates.preview_to_unlock_rate.toFixed(1)}%</span>
                </div>
             </div>
          </section>

          <section className="section-card">
             <h3 className="section-title" style={{ fontSize: '1.1rem' }}>📈 {isRTL ? 'حسب نوع الطلب' : 'By Request Type'}</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               {trustMetrics.breakdown_by_request_kind.map(b => (
                 <div key={b.request_kind} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontWeight: 800, textTransform: 'capitalize' }}>{b.request_kind.replace('_', ' ')}</span>
                       <span style={{ color: '#10b981', fontWeight: 900 }}>{b.revenue.toLocaleString()} EGP</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                       <span>{isRTL ? 'مقدم:' : 'Submitted:'} {b.submitted}</span>
                       <span>{isRTL ? 'مؤكد:' : 'Confirmed:'} {b.confirmed_payments}</span>
                       <span>{isRTL ? 'معدل:' : 'Rate:'} {b.conversion_rate.toFixed(1)}%</span>
                    </div>
                 </div>
               ))}
             </div>
          </section>

          <section className="section-card">
             <h3 className="section-title" style={{ fontSize: '1.1rem' }}>📜 {isRTL ? 'حسب سياسة الدفع' : 'By Payment Policy'}</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               {trustMetrics.breakdown_by_payment_policy.map(b => (
                 <div key={b.payment_policy} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontWeight: 800, textTransform: 'capitalize' }}>{b.payment_policy.replace('_', ' ')}</span>
                       <span style={{ color: '#f59e0b', fontWeight: 900 }}>{b.revenue.toLocaleString()} EGP</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                       <span>{isRTL ? 'نوايا الدفع:' : 'Intents:'} {b.payment_intents}</span>
                       <span>{isRTL ? 'مؤكد:' : 'Confirmed:'} {b.confirmed_payments}</span>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
