import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { createAdminClient } from '@/lib/dal/customers'

export default async function StaffPerformancePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`)

  const permissions = getStaffUiPermissions(staffMember)

  // Fetch decided requests by this staff member
  const adminClient = await createAdminClient()

  // Fetch full staff member details including created_at
  const { data: fullStaff } = await adminClient
    .from('staff_members')
    .select('id, auth_user_id, full_name, staff_role, created_at')
    .eq('id', staffMember.id)
    .single()

  const { data: decidedRequests, error: dbError } = await adminClient
    .from('requests')
    .select('id, request_code, title, current_status, reviewer_decision, reviewer_decided_at, created_at')
    .eq('reviewer_decided_by_staff_id', staffMember.id)
    .not('reviewer_decision', 'is', null)
    .order('reviewer_decided_at', { ascending: false })

  if (dbError) {
    console.error('Error fetching decided requests:', dbError)
  }

  const list = decidedRequests || []

  // Appointment date
  const hireDate = fullStaff?.created_at
    ? new Date(fullStaff.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : (isRTL ? 'غير محدد' : 'Not specified')

  // Total resolved requests
  const totalResolved = list.length
  const totalApproved = list.filter(r => r.reviewer_decision === 'approve').length
  const totalRejected = list.filter(r => r.reviewer_decision === 'reject').length
  const totalClarifications = list.filter(r => r.reviewer_decision === 'needs_clarification').length

  const approvalRate = totalResolved > 0 ? Math.round((totalApproved / totalResolved) * 100) : 0

  // Calculate average decision time (in hours)
  let totalHours = 0
  let timedCount = 0
  list.forEach(r => {
    if (r.reviewer_decided_at && r.created_at) {
      const diffMs = new Date(r.reviewer_decided_at).getTime() - new Date(r.created_at).getTime()
      if (diffMs > 0) {
        totalHours += diffMs / (1000 * 60 * 60)
        timedCount++
      }
    }
  })
  const avgDecisionHours = timedCount > 0 ? parseFloat((totalHours / timedCount).toFixed(1)) : 0

  // SLA Compliance rate (SLA target is 24 hours)
  const slaTargetHours = 24
  const onTimeCount = list.filter(r => {
    if (r.reviewer_decided_at && r.created_at) {
      const diffMs = new Date(r.reviewer_decided_at).getTime() - new Date(r.created_at).getTime()
      return diffMs / (1000 * 60 * 60) <= slaTargetHours
    }
    return true
  }).length
  const slaCompliance = totalResolved > 0 ? Math.round((onTimeCount / totalResolved) * 100) : 100

  // Calculate dynamic Grade, Rating, Deficiencies, and Advice
  let grade = isRTL ? 'مقبول (D)' : 'Acceptable (D)'
  let ratingStars = 3
  const deficiencies: string[] = []
  const advices: string[] = []

  if (totalResolved === 0) {
    grade = isRTL ? 'تحت التقييم' : 'Under Evaluation'
    ratingStars = 1
    deficiencies.push(isRTL ? 'لم يتم إنجاز أي عمليات مراجعة طلبات حتى الآن.' : 'No requests reviewed yet.')
    advices.push(isRTL ? 'ابدأ بقبول ومراجعة الطلبات المعلقة في طابور العمل لتنشيط حسابك.' : 'Start claiming and reviewing pending requests in the intake queue to activate your performance log.')
  } else {
    // Grade & Rating
    if (totalResolved >= 15 && avgDecisionHours <= 6 && slaCompliance >= 95) {
      grade = isRTL ? 'امتياز (Excellent - A)' : 'Excellent (A)'
      ratingStars = 5
    } else if (totalResolved >= 8 && avgDecisionHours <= 12 && slaCompliance >= 85) {
      grade = isRTL ? 'جيد جداً (Very Good - B)' : 'Very Good (B)'
      ratingStars = 4
    } else if (totalResolved >= 3 && avgDecisionHours <= 24) {
      grade = isRTL ? 'جيد (Good - C)' : 'Good (C)'
      ratingStars = 3
    } else {
      grade = isRTL ? 'مقبول (Acceptable - D)' : 'Acceptable (D)'
      ratingStars = 2
    }

    // Deficiencies
    if (avgDecisionHours > 18) {
      deficiencies.push(isRTL 
        ? `بطء في اتخاذ القرار (متوسط الوقت المستغرق ${avgDecisionHours} ساعة يتجاوز الحد الموصى به وهو 12 ساعة).` 
        : `Slow decision making (average time of ${avgDecisionHours} hrs exceeds the recommended 12-hour limit).`)
    }
    if (slaCompliance < 80) {
      deficiencies.push(isRTL 
        ? `انخفاض معدل الالتزام باتفاقية مستوى الخدمة (${slaCompliance}%). يوجد طلبات تجاوزت الموعد المحدد.` 
        : `Low SLA compliance rate (${slaCompliance}%). Some requests breached target response clocks.`)
    }
    if (approvalRate > 95) {
      deficiencies.push(isRTL 
        ? 'معدل قبول مرتفع جداً (أكثر من 95%)، يوصى بالتدقيق أكثر في مواصفات الطلب وفحص ملاءمة البراند والأسعار المرفقة.' 
        : 'Very high approval rate (above 95%), implying potential lack of strict filtering. Verify attachments carefully.')
    }
    if (approvalRate < 25) {
      deficiencies.push(isRTL 
        ? 'معدل رفض مرتفع جداً (أكثر من 75%)، يرجى مراجعة المعايير وتجنب الرفض المتشدد للطلبات القابلة للتسوية.' 
        : 'High rejection rate (above 75%). Make sure you are not rejecting salvageable requests unnecessarily.')
    }
    if (deficiencies.length === 0) {
      deficiencies.push(isRTL 
        ? 'أداء متميز! لا توجد نقاط قصور واضحة في الوقت الحالي.' 
        : 'Outstanding performance! No clear deficiencies detected currently.')
    }

    // Advices
    if (avgDecisionHours > 12) {
      advices.push(isRTL 
        ? 'قم بمراجعة لوحة المهام بشكل متكرر مرتين يومياً على الأقل لضمان إنهاء الطلبات الجديدة فور استلامها.' 
        : 'Check your assigned tasks dashboard at least twice daily to process incoming requests promptly.')
    }
    if (slaCompliance < 90) {
      advices.push(isRTL 
        ? 'أعط الأولوية دائماً للطلبات التي تظهر شارات صفراء أو حمراء (قريب من التأخير / متأخر) في طابور العمل.' 
        : 'Always prioritize requests with warning badges (Near SLA / Breached SLA) in the queue to maintain operations.')
    }
    advices.push(isRTL 
      ? 'استخدم مساعد الذكاء الاصطناعي (AI Copilot) لتسريع صياغة تقرير التسعير المرجعي وتقدير قيمة رسوم الخدمة.' 
      : 'Use the AI Copilot to quickly generate intake analyses and pricing proposals for complex items.')
    advices.push(isRTL 
      ? 'استخدم ميزة "استفسار العميل" مباشرة بدلاً من الرفض الفوري إذا كان الطلب يحتاج فقط لبعض التوضيحات البسيطة.' 
      : 'Use the direct customer chat/clarification feature instead of rejecting when a request just needs slight details.')
  }

  // Daily Statistics grouping
  const dailyStatsMap: Record<string, { approved: number; rejected: number; pending: number; total: number }> = {}
  list.forEach(r => {
    if (r.reviewer_decided_at) {
      const dateStr = new Date(r.reviewer_decided_at).toISOString().split('T')[0]
      if (!dailyStatsMap[dateStr]) {
        dailyStatsMap[dateStr] = { approved: 0, rejected: 0, pending: 0, total: 0 }
      }
      dailyStatsMap[dateStr].total++
      if (r.reviewer_decision === 'approve') dailyStatsMap[dateStr].approved++
      else if (r.reviewer_decision === 'reject') dailyStatsMap[dateStr].rejected++
      else if (r.reviewer_decision === 'needs_clarification') dailyStatsMap[dateStr].pending++
    }
  })

  const dailyStatsList = Object.entries(dailyStatsMap).map(([date, counts]) => ({
    date,
    ...counts
  })).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="investor-dashboard">
      <style dangerouslySetInnerHTML={{ __html: `
        .investor-dashboard {
          padding: 24px 0;
          width: 100%;
          color: #f8fafc;
        }
        .header-section {
          margin-bottom: 32px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 24px;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .badge-info {
          background: rgba(212,166,60,0.1);
          border: 1px solid rgba(212,166,60,0.2);
          color: #d4a63c;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .kpi-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(20px);
        }
        .kpi-val {
          font-size: 2.2rem;
          font-weight: 900;
          color: #fff;
          margin: 8px 0 4px;
        }
        .section-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 968px) {
          .section-layout {
            grid-template-columns: 1fr;
          }
        }
        .glass-panel {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 24px;
          backdrop-filter: blur(20px);
          margin-bottom: 24px;
        }
        .panel-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .perf-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
        }
        .perf-table th, .perf-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.85rem;
        }
        .perf-table th {
          color: rgba(255,255,255,0.4);
          font-weight: 700;
        }
        .bullet-list {
          padding: 0;
          margin: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .bullet-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .star-rating {
          color: #eab308;
          font-size: 1.25rem;
          letter-spacing: 2px;
        }
      `}} />

      <div className="header-section">
        <div className="header-row">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>
              {isRTL ? 'تقييم وتقرير أداء الموظف' : 'Employee Performance Review'}
            </h1>
            <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              {isRTL 
                ? `الاسم: ${fullStaff?.full_name || staffMember.full_name || ''} (${user.email || ''}) | دور العمل: ${fullStaff?.staff_role || staffMember.staff_role || ''}`
                : `Name: ${fullStaff?.full_name || staffMember.full_name || ''} (${user.email || ''}) | Role: ${fullStaff?.staff_role || staffMember.staff_role || ''}`}
            </p>
          </div>
          <div className="badge-info">
            📅 {isRTL ? `تاريخ التعيين: ${hireDate}` : `Hired on: ${hireDate}`}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="kpi-card">
          <div style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 700 }}>{isRTL ? 'إجمالي الطلبات المنجزة' : 'Total Requests Resolved'}</div>
          <div className="kpi-val">{totalResolved}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            ✅ {totalApproved} {isRTL ? 'قبول' : 'approved'} | ❌ {totalRejected} {isRTL ? 'رفض' : 'rejected'}
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 700 }}>{isRTL ? 'معدل الموافقة والقبول' : 'Approval Rate'}</div>
          <div className="kpi-val" style={{ color: '#10b981' }}>{approvalRate}%</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{isRTL ? 'نسبة قبول الطلبات الكلية' : 'Total acceptance ratio'}</div>
        </div>

        <div className="kpi-card">
          <div style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 700 }}>{isRTL ? 'متوسط سرعة القرار' : 'Avg Decision Speed'}</div>
          <div className="kpi-val" style={{ color: '#3b82f6' }}>{avgDecisionHours} <span style={{ fontSize: '1rem' }}>{isRTL ? 'ساعة' : 'hrs'}</span></div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{isRTL ? 'منذ استلام أو إنشاء الطلب' : 'From intake creation to decision'}</div>
        </div>

        <div className="kpi-card">
          <div style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 700 }}>{isRTL ? 'الالتزام بـ SLA (الوقت)' : 'SLA Compliance'}</div>
          <div className="kpi-val" style={{ color: '#8b5cf6' }}>{slaCompliance}%</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{isRTL ? 'القرارات المتخذة خلال 24 ساعة' : 'Decisions finalized within 24h'}</div>
        </div>
      </div>

      <div className="section-layout">
        {/* LEFT: Evaluation, Score and Daily Stats */}
        <div>
          {/* Card for Grade and Evaluation */}
          <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(212,166,60,0.05) 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid rgba(212,166,60,0.15)' }}>
            <h2 className="panel-title">
              <span>🏆</span>
              {isRTL ? 'التقدير العام وتقييم الكفاءة' : 'Overall Grade & Evaluation'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px 32px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isRTL ? 'التقدير الحالي' : 'Current Grade'}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d4a63c', marginTop: '8px' }}>{grade}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '6px' }}>{isRTL ? 'تقييم النجوم' : 'Rating Rating'}</div>
                <div className="star-rating">
                  {'★'.repeat(ratingStars)}{'☆'.repeat(5 - ratingStars)}
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.83rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, maxWidth: '400px' }}>
                  {isRTL 
                    ? 'يتم احتساب التقدير والتقييم تلقائياً بناءً على سرعة مراجعة الطلبات، الالتزام بالوقت المستهدف (SLA)، وعدد الطلبات المنجزة.'
                    : 'The evaluation grade is computed dynamically based on request review speed, SLA compliance rate, and total workload completed.'}
                </p>
              </div>
            </div>
          </div>

          {/* Daily Table Statistics */}
          <div className="glass-panel">
            <h2 className="panel-title">
              <span>📊</span>
              {isRTL ? 'سجل العمليات اليومي' : 'Daily Operations History'}
            </h2>
            {dailyStatsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>
                {isRTL ? 'لا توجد بيانات مسجلة للأيام السابقة.' : 'No daily history logged yet.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="perf-table" style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                  <thead>
                    <tr>
                      <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                      <th>{isRTL ? 'إجمالي المراجعات' : 'Total Resolved'}</th>
                      <th style={{ color: '#10b981' }}>{isRTL ? 'الطلبات المقبولة' : 'Approved'}</th>
                      <th style={{ color: '#ef4444' }}>{isRTL ? 'الطلبات المرفوضة' : 'Rejected'}</th>
                      <th style={{ color: '#eab308' }}>{isRTL ? 'طلبات التوضيح' : 'Clarified'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStatsList.map((day) => (
                      <tr key={day.date}>
                        <td style={{ fontWeight: 'bold' }}>{day.date}</td>
                        <td style={{ fontWeight: 800 }}>{day.total}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{day.approved}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{day.rejected}</td>
                        <td style={{ color: '#eab308', fontWeight: 600 }}>{day.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Advice and Deficiencies */}
        <div>
          {/* Panel for Deficiencies */}
          <div className="glass-panel" style={{ borderLeft: isRTL ? 'none' : '4px solid #ef4444', borderRight: isRTL ? '4px solid #ef4444' : 'none' }}>
            <h2 className="panel-title" style={{ color: '#ef4444' }}>
              <span>⚠️</span>
              {isRTL ? 'نقاط القصور والضعف' : 'Identified Deficiencies'}
            </h2>
            <ul className="bullet-list">
              {deficiencies.map((def, idx) => (
                <li key={idx} className="bullet-item">
                  <span className="bullet-icon">🚨</span>
                  <span>{def}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Panel for Advice */}
          <div className="glass-panel" style={{ borderLeft: isRTL ? 'none' : '4px solid #10b981', borderRight: isRTL ? '4px solid #10b981' : 'none' }}>
            <h2 className="panel-title" style={{ color: '#10b981' }}>
              <span>💡</span>
              {isRTL ? 'نصائح وإرشادات تحسين الأداء' : 'Advice to Improve'}
            </h2>
            <ul className="bullet-list">
              {advices.map((adv, idx) => (
                <li key={idx} className="bullet-item">
                  <span className="bullet-icon">✨</span>
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
