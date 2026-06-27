import { createClient } from '@/lib/supabase/server'
import { getCustomerRequests } from '@/lib/dal/requests'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { getStaffMemberByAuthUserId, resolveStaffHomePath } from '@/lib/dal/staff'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PhoneVerificationCard from './PhoneVerificationCard'

type PortalRequest = {
  request_id: string
  title: string
  current_status: string
  customer_visible_status: string
  pipeline_completion_pct: number
  client_released_at: string | null
  latest_report_id: string | null
  latest_report_status: string | null
  snapshot_count: number
  unlock_count: number
  request_created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  open:        { bg: 'rgba(212,166,60,0.12)', text: '#d4a63c', dot: '#d4a63c' },
  submitted:   { bg: 'rgba(212,166,60,0.12)', text: '#d4a63c', dot: '#d4a63c' },
  in_progress: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', dot: '#60a5fa' },
  research:    { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', dot: '#60a5fa' },
  reporting:   { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', dot: '#c084fc' },
  client_ready:{ bg: 'rgba(34,197,94,0.12)', text: '#4ade80', dot: '#4ade80' },
  released:    { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', dot: '#4ade80' },
}

function getStatusLabel(status: string, isReleased: boolean, dict: any, locale: string) {
  if (isReleased) return locale === 'ar' ? 'جاهز للعرض' : 'Report Ready'
  const labels: Record<string, string> = {
    open: locale === 'ar' ? 'قيد المراجعة' : 'Under Review',
    submitted: locale === 'ar' ? 'قيد المراجعة' : 'Under Review',
    in_progress: locale === 'ar' ? 'جاري البحث' : 'In Progress',
    research: locale === 'ar' ? 'جاري البحث' : 'In Progress',
    reporting: locale === 'ar' ? 'إعداد التقرير' : 'Reporting',
    client_ready: locale === 'ar' ? 'جاهز' : 'Ready',
  }
  return labels[status] || status.replace(/_/g, ' ')
}

function getStatusMessage(status: string, isReleased: boolean, locale: string) {
  if (isReleased) return locale === 'ar' ? 'تم إيجاد الموردين - التقرير جاهز للعرض.' : 'Suppliers matched — report is ready to view.'
  const ar: Record<string, string> = {
    open: 'الطلب قيد المراجعة وتحليل المتطلبات.',
    submitted: 'الطلب قيد المراجعة وتحليل المتطلبات.',
    in_progress: 'جاري التواصل مع الموردين والتفاوض.',
    research: 'جاري التواصل مع الموردين والتفاوض.',
    reporting: 'جاري إعداد تقرير الأسعار النهائي.',
  }
  const en: Record<string, string> = {
    open: 'Request is under review and requirements analysis.',
    submitted: 'Request is under review and requirements analysis.',
    in_progress: 'Actively contacting and negotiating with suppliers.',
    research: 'Actively contacting and negotiating with suppliers.',
    reporting: 'Compiling final price comparison report.',
  }
  return locale === 'ar' ? (ar[status] || 'طلبك قيد المعالجة.') : (en[status] || 'Your request is being processed.')
}

export default async function CustomerDashboard({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (staffMember && staffMember.is_active) {
    redirect(resolveStaffHomePath(locale, staffMember))
  }

  const customer = await getCustomerByAuthId(user.id)
  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: '#ef4444' }}>Profile Not Found</h2>
        <Link href={`/${locale}/auth/login`} className="link">Return to Login</Link>
      </div>
    )
  }

  const requests: PortalRequest[] = await getCustomerRequests((customer as any).id)

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>{dict.customer_dashboard.title}</h1>
        <Link href={`/${locale}/start-request`}>
          <button className="btn-accent" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7v14"/></svg>
            {dict.customer_dashboard.new_request}
          </button>
        </Link>
      </div>

      {/* Phone Verification */}
      <PhoneVerificationCard 
        customerId={customer.id}
        isPhoneVerified={!!customer.phone_verified_at}
        isFreeTrialUsed={!!customer.free_trial_used_at}
        phoneNumber={customer.phone_number_raw || ''}
        locale={locale}
      />

      {/* How it works Banner */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,166,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a63c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
            {locale === 'ar' ? 'كيف يعمل فايندورا؟' : 'How Findora works'}
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            {locale === 'ar'
              ? 'إرسال الطلب مجاني. نقوم بمراجعة طلبك وإعداد تقرير. تفاصيل الموردين مقفولة حتى الدفع.'
              : 'Submitting a request is free. We review it and prepare a sourcing report. Supplier details remain locked until payment.'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: locale === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', value: requests.length, color: '#d4a63c' },
          { label: locale === 'ar' ? 'الطلبات النشطة' : 'Active Requests', value: requests.filter(r => !r.client_released_at).length, color: '#60a5fa' },
          { label: locale === 'ar' ? 'الطلبات المكتملة' : 'Completed', value: requests.filter(r => !!r.client_released_at).length, color: '#4ade80' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', borderTop: `3px solid ${stat.color}` }}>
            <p style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.4 }}>📥</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>{dict.customer_dashboard.empty}</p>
          <Link href={`/${locale}/start-request`}>
            <button className="btn-accent" style={{ width: 'auto', padding: '0.8rem 2rem' }}>{dict.customer_dashboard.start_first}</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((req: any) => {
            const isReleased = !!req.client_released_at
            const hasSnapshots = Number(req.snapshot_count ?? 0) > 0
            const reportTarget = isReleased && hasSnapshots ? `/${locale}/reports/${req.request_id}` : null
            const status = req.customer_visible_status || req.current_status
            const sc = STATUS_COLORS[isReleased ? 'released' : status] || STATUS_COLORS.open
            const pct = req.pipeline_completion_pct ?? 0

            const budgetText = req.budget_min || req.budget_max
              ? `${req.budget_min || '0'} – ${req.budget_max || '∞'} EGP`
              : (locale === 'ar' ? 'غير محددة' : 'Not set')

            const locationText = req.preferred_governorate
              ? `${req.preferred_governorate}${req.preferred_area ? ', ' + req.preferred_area : ''}`
              : (locale === 'ar' ? 'كل مصر' : 'All Egypt')

            const urgencyColors: Record<string, string> = {
              critical: '#ef4444', high: '#f97316', normal: '#d4a63c', low: '#94a3b8'
            }
            const urgencyColor = urgencyColors[req.urgency_level?.toLowerCase()] || '#d4a63c'

            return (
              <div key={req.request_id} style={{
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                {/* Top accent line */}
                <div style={{ height: 3, background: isReleased ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#d4a63c,#fbbf24)' }} />
                
                <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                  {/* Left: Main Info */}
                  <div>
                    {/* Badges row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '20px', color: 'rgba(255,255,255,0.4)' }}>
                        {req.request_code}
                      </span>
                      {req.urgency_level && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: `${urgencyColor}18`, color: urgencyColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: urgencyColor, display: 'inline-block' }} />
                          {locale === 'ar' ? `أولوية: ${req.urgency_level}` : `${req.urgency_level} priority`}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(req.request_created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {req.title}
                    </h3>

                    {/* Description snippet */}
                    {req.raw_description && (
                      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {req.raw_description}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.9rem 1.1rem', marginBottom: '1rem' }}>
                      {[
                        { label: locale === 'ar' ? 'الميزانية' : 'Budget', value: budgetText },
                        { label: locale === 'ar' ? 'المنطقة' : 'Region', value: locationText },
                        { label: locale === 'ar' ? 'خيارات الموردين' : 'Suppliers Found', value: req.snapshot_count > 0 ? `${req.snapshot_count} ${locale === 'ar' ? 'عروض' : 'options'}` : (locale === 'ar' ? 'جاري البحث' : 'Searching…') },
                      ].map((m) => (
                        <div key={m.label}>
                          <p style={{ margin: '0 0 3px 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>{m.label}</p>
                          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{locale === 'ar' ? 'تقدم العملية' : 'Progress'}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4a63c' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isReleased ? '#10b981' : '#d4a63c', borderRadius: 10, transition: 'width 1s ease' }} />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                        {getStatusMessage(status, isReleased, locale)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div style={{ minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    {/* Status badge */}
                    <span style={{ padding: '6px 14px', borderRadius: '20px', background: sc.bg, color: sc.text, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
                      {getStatusLabel(status, isReleased, dict, locale)}
                    </span>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <Link href={`/${locale}/requests/${req.request_id}`} style={{ display: 'block', width: '100%' }}>
                        <button style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                          {locale === 'ar' ? 'التفاصيل والمحادثة' : 'Details & Chat'}
                        </button>
                      </Link>

                      {reportTarget && (
                        <Link href={reportTarget} style={{ display: 'block', width: '100%' }}>
                          <button className="btn-accent" style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {dict.customer_dashboard.view_report}
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}><path d="m9 18 6-6-6-6"/></svg>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
