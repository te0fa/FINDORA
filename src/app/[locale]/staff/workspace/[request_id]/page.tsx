import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getRequestFullWorkspace,
  getStaffMemberByAuthUserId,
  getStaffUiPermissions,
} from '@/lib/dal/staff'
import {
  handleAddToShortlist,
  handlePrepareClientBundle,
  handleReleaseToCustomer,
  handleReviewerDecision,
  handleSaveOnlineFinding,
  handleSaveOfflineQuote,
  handleUpdateScopePricing,
  handleTransition,
  handleUpsertSnapshot,
  handleDeleteSnapshot,
  handleMarkReportReady,
  handleGenerateUnifiedReport,
  handlePromoteOnlineQuote,
  handleGenerateOfflineAIReport,
  handleGenerateFinalSynthesisProposal,
  handleTriggerOnlineSourcing,
  handleSendClarificationMessage
} from './actions'
import { handleManualResearchTrigger } from './research-actions'
import { getStaffActionPermissions } from '@/lib/workflow/action-permissions'
import { handleArchiveRequest, handleRestoreRequest } from '../../queue/actions'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { createAdminClient } from '@/lib/dal/customers'
import { SlaStatusBadge } from '@/components/staff/SlaStatusBadge'
import { ActionHistoryPanel } from '@/components/staff/ActionHistoryPanel'
import { AICopilotPanel } from '@/components/staff/AICopilotPanel'
import { AIIntelligencePanel } from '@/components/staff/AIIntelligencePanel'
import { AdminControlPanel } from '@/components/staff/AdminControlPanel'
import { ReviewerDecisionForm } from '@/components/staff/ReviewerDecisionForm'

const REFERENCE_IMAGE_BUCKET = 'request-reference-images'

async function getReferenceImageUrl(referenceImagePath?: string | null) {
  if (!referenceImagePath) return null

  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient.storage
      .from(REFERENCE_IMAGE_BUCKET)
      .createSignedUrl(referenceImagePath, 60 * 60)

    if (error) {
      console.error('Failed to create signed URL for reference image:', error)
      return null
    }

    return data?.signedUrl || null
  } catch (error) {
    console.error('Unexpected error while creating signed URL:', error)
    return null
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function formatUrgency(value: string | null | undefined, dict: any) {
  if (value === 'urgent') return dict.staff_workspace.urgency_urgent
  if (value === 'high') return dict.staff_workspace.urgency_high
  return dict.staff_workspace.urgency_normal
}

export default async function RequestWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ request_id: string; locale: string }>
  searchParams?: Promise<{ error?: string; success?: string; decision_type?: string }>
}) {
  const { request_id, locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const errorCode = resolvedSearchParams?.error
  const successCode = resolvedSearchParams?.success
  const requestId = request_id

  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)
  let workspaceData = null
  try {
    workspaceData = await getRequestFullWorkspace(requestId, staffMember)
  } catch (err) {
    console.warn('[WORKSPACE_ACCESS_DENIED]', err)
    redirect(`/${locale}/staff/queue?error=not_assigned`)
  }

  if (!workspaceData) {
    return (
      <main style={{ padding: '40px 24px 80px', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, textAlign: 'center' }}>
            {dict.common.error}: {dict.staff_workspace.workspace_not_found}
          </div>
        </div>
      </main>
    )
  }

  const { request: typedRequest, research_runs: researchRuns, shortlist, merchant_quotes: merchantQuotes, online_merchant_quotes: onlineMerchantQuotes, stage_clock: stageClock, sla_monitoring: slaMonitoring, state } = workspaceData
  const request = typedRequest as any
  const preferences = (workspaceData as any).preferences || {}
  const isAdmin = permissions.isAdmin
  const isResearcher = permissions.canResearch
  const isFieldAgent = permissions.canSourceOffline
  const isReporter = permissions.canReport
  const isAssigned = request.assigned_reviewer_staff_id === staffMember.id

  const adminClient = await createAdminClient()
  const [messagesRes, jobsRes, chatMessagesRes] = await Promise.all([
    adminClient.from('outbound_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: false }),
    adminClient.from('agent_jobs').select('*').eq('request_id', requestId).order('created_at', { ascending: false }),
    adminClient.from('request_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  ])
  const emailLogs = messagesRes.data || []
  const jobsList = jobsRes.data || []
  const chatMessages = chatMessagesRes.data || []

  const actionPermissions = getStaffActionPermissions({
    staff: staffMember,
    permissions,
    state,
    request,
    snapshotCount: request.snapshot_count
  })

  let canAccessWorkspace = false
  if (isAdmin || permissions.canManageArchive) {
    canAccessWorkspace = true
  } else {
    // Standard access rules based on canonical state
    if (state === 'INTAKE') {
      canAccessWorkspace = permissions.canReviewIntake && isAssigned
    } else if (state === 'ISSUES') {
      canAccessWorkspace = (permissions.canReviewIntake && isAssigned) || isReporter
    } else if (state === 'OPERATIONS') {
      canAccessWorkspace = isResearcher || isFieldAgent || isReporter
    } else if (state === 'READY' || state === 'COMPLETED') {
      canAccessWorkspace = isReporter
    }
  }

  if (!canAccessWorkspace) {
    redirect(`/${locale}/staff/queue?error=not_assigned`)
  }

  const referenceImageUrl = await getReferenceImageUrl(request.reference_image_path)
  const hasReleased = !!request.client_released_at
  const isTerminal = state === 'REJECTED' || state === 'COMPLETED' || request.current_status === 'closed'

  return (
    <main className="page-container animate-in" dir={isRTL ? 'rtl' : 'ltr'} data-testid="staff-workspace-page" data-request-id={requestId} data-request-code={request.request_code}>
      <style dangerouslySetInnerHTML={{ __html: `
        .page-container {
          padding: 0 1rem 100px;
          color: white;
          position: relative;
          min-height: 100vh;
        }

        .content-container {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .crumbs { display: flex; gap: 0.75rem; padding: 1.5rem 0; overflow-x: auto; scrollbar-width: none; }
        .crumbs::-webkit-scrollbar { display: none; }
        
        .crumb-link {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: rgba(255,255,255,0.5);
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .crumb-link:hover { background: rgba(255,255,255,0.08); color: white; border-color: var(--accent); }

        .page-head { margin-block-end: 2.5rem; }
        .eyebrow { color: var(--accent); font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-block-end: 0.5rem; }
        .page-title { 
          font-size: clamp(2rem, 5vw, 3rem); 
          font-weight: 900; 
          margin: 0 0 0.75rem 0; 
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .page-sub { color: rgba(255,255,255,0.4); font-size: 1rem; max-width: 800px; line-height: 1.6; font-weight: 500; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .main-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; align-items: start; }
        
        @media (max-width: 1150px) { 
          .main-grid { grid-template-columns: 1fr; } 
        }

        .section-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          border-radius: 24px;
          padding: 2rem;
          margin-block-end: 2rem;
        }

        .card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-block-end: 1.5rem;
        }

        .card-title-text {
          font-size: 1.25rem;
          font-weight: 900;
          margin: 0;
          color: white;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        
        .field-box { 
          background: rgba(255,255,255,0.02); 
          border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 16px; 
          padding: 1.25rem; 
        }
        
        .field-label { 
          font-size: 0.65rem; 
          font-weight: 800; 
          color: rgba(255,255,255,0.3); 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          margin-block-end: 0.5rem; 
        }
        
        .field-value { font-size: 0.95rem; font-weight: 700; color: white; line-height: 1.5; }

        .image-frame { 
          border-radius: 20px; 
          overflow: hidden; 
          background: #000; 
          border: 1px solid rgba(255,255,255,0.1); 
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .image-frame img { width: 100%; height: 100%; object-fit: contain; }

        .run-card { 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.08); 
          border-radius: 20px; 
          padding: 1.5rem; 
          margin-block-end: 1.25rem; 
        }
        
        .run-top { display: flex; justify-content: space-between; align-items: center; margin-block-end: 1rem; }
        
        .finding-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        
        .item-box { 
          background: rgba(0,0,0,0.2); 
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; 
          padding: 1rem; 
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .item-link { color: var(--accent); text-decoration: none; font-weight: 800; font-size: 0.9rem; line-height: 1.4; display: block; }
        .item-link:hover { text-decoration: underline; }

        .finding-price { font-size: 1.25rem; font-weight: 900; color: white; }

        .shortlist-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 1.25rem;
          margin-block-end: 1rem;
          position: relative;
          overflow: hidden;
        }

          .shortlist-item.recommended {
            border-inline-start: 4px solid var(--accent);
            background: rgba(212,166,60,0.05);
          }

          .builder-snapshot {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 16px;
            padding: 1rem;
            margin-block-end: 1rem;
          }
        ` }} />

      <div className="content-container">
        <nav className="crumbs">
          <Link href={`/${locale}/staff/queue`} className="crumb-link">
            {dict.staff_workspace.breadcrumb_queue}
          </Link>
          <Link href={`/${locale}/staff/dashboard`} className="crumb-link">
            {dict.navigation.dashboard}
          </Link>
          <span className="crumb-link active" style={{ borderColor: 'transparent', opacity: 0.3 }}>
            {request.request_code}
          </span>
        </nav>

        <header className="page-head">
          <div className="eyebrow" data-testid="staff-request-code">{request.request_code || 'REQ'}</div>
          <h1 className="page-title">{dict.staff_workspace.page_title}</h1>
          <div className="page-sub">
            {dict.staff_workspace.page_sub}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBlockStart: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {slaMonitoring && (
              <SlaStatusBadge 
                status={(slaMonitoring.sla_status || 'on_time') as 'on_time' | 'warning' | 'breached'} 
                label={dict.sla[`status_${slaMonitoring.sla_status || 'on_time'}` as keyof typeof dict.sla]} 
              />
            )}
            
            {stageClock && (
              <span className="badge badge-muted">
                {dict.sla.stage_age}: <span style={{ color: '#fff', marginInlineStart: '0.25rem' }}>
                  {stageClock.stage_age_hours?.toFixed(1)}h
                </span>
              </span>
            )}

            {stageClock?.current_stage_entered_at && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                {dict.sla.entered_at}: {new Date(stageClock.current_stage_entered_at).toISOString().replace('T', ' ').slice(0, 16)}
              </span>
            )}
          </div>
        </header>
        
        {errorCode && !['note_required', 'pricing_required'].includes(errorCode) && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBlockEnd: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '1rem', fontWeight: 800 }}>
                {isRTL ? 'حدث خطأ' : 'An Error Occurred'}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                {decodeURIComponent(errorCode)}
              </p>
            </div>
          </div>
        )}

        {isTerminal && (
          <div style={{ 
            background: state === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${state === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
            padding: '1.5rem',
            borderRadius: '16px',
            marginBlockEnd: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
            <span style={{ fontSize: '2rem' }}>{state === 'REJECTED' ? '🚫' : '✅'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: state === 'REJECTED' ? '#fca5a5' : '#86efac' }}>
                {state === 'REJECTED' 
                  ? (isRTL ? 'هذا الطلب مرفوض (للقراءة فقط)' : 'This request is Rejected (Read-Only)') 
                  : (isRTL ? 'هذا الطلب مكتمل (للقراءة فقط)' : 'This request is Completed (Read-Only)')}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.7, fontWeight: 600 }}>
                {state === 'REJECTED'
                  ? (isRTL ? 'لا يمكن تعديل الطلبات المرفوضة. يرجى مراجعة ملخص التحكم لمعرفة الأسباب.' : 'Rejected requests cannot be modified. Check Control Summary for reasons.')
                  : (isRTL ? 'تم إغلاق هذا الطلب ولا يمكن إجراء المزيد من التعديلات.' : 'This request has been closed and no further modifications can be made.')}
              </p>
            </div>
          </div>
        )}

        {/* CLIENT FEEDBACK ALERT HIGHLIGHT */}
        {request.current_status === 'client_feedback_pending' && (
          <div style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '20px',
            padding: '1.5rem 2rem',
            marginBlockEnd: '2.5rem',
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            <span style={{ fontSize: '1.75rem' }}>⚠️</span>
            <div>
              <h3 style={{ margin: 0, color: '#fdba74', fontSize: '1.1rem', fontWeight: 900 }}>
                {isRTL ? 'تنبيه: العميل طلب تحديثاً للطلب' : 'Client Requested Scope Update'}
              </h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5 }}>
                <strong>{isRTL ? 'الرسالة:' : 'Message:'}</strong> &ldquo;{emailLogs.find(m => m.status === 'received')?.rendered_body || request.reviewer_notes || 'Client requested update'}&rdquo;
              </p>
              <div style={{ marginBlockStart: '1rem', display: 'flex', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', background: 'rgba(249,115,22,0.2)', color: '#fdba74', padding: '0.25rem 0.75rem', borderRadius: '8px', fontWeight: 700 }}>
                  CLIENT_FEEDBACK_PENDING
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {isRTL ? 'يرجى مراجعة وتعديل نطاق البحث أو إعادة تشغيل وكلاء البحث.' : 'Please review, modify search parameters, or restart sourcing workflows.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BATCH 7B.6: Request Control Summary & Admin Overrides */}
        <AdminControlPanel 
          request={request}
          state={state}
          isAdmin={isAdmin}
          dict={dict}
          locale={locale}
          isRTL={isRTL}
          lastUpdated={request.updated_at}
        />



        {/* Interactive Progress Checklist */}
        <section className="section-card glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h2 className="card-title-text" style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: '#f7d46b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span>
            {isRTL ? 'خطوات معالجة هذا الطلب خطوة بخطوة' : 'Step-by-Step Request Sourcing Actions'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', position: 'relative' }}>
            {[
              {
                step: 1,
                title: isRTL ? '1. مراجعة الطلب' : '1. Intake Review',
                desc: isRTL ? 'اعتماد الطلب وفحص تفاصيل العميل وتصنيفها.' : 'Approve request details, classification, and budget.',
                active: ['submitted', 'open'].includes(request.current_status),
                done: !['submitted', 'open'].includes(request.current_status),
              },
              {
                step: 2,
                title: isRTL ? '2. البحث والتوريد' : '2. Sourcing Research',
                desc: isRTL ? 'تجميع عروض الأسعار والبدائل المناسبة وإضافتها للمسودة.' : 'Find alternative quotes and add them to shortlist.',
                active: request.current_status === 'in_progress',
                done: ['ready_to_release', 'released'].includes(request.current_status),
              },
              {
                step: 3,
                title: isRTL ? '3. إعداد التقرير' : '3. Report Compilation',
                desc: isRTL ? 'مراجعة خيارات البدائل المجمعة وصياغة التقرير والتوصية.' : 'Structure candidates and write agent recommendation.',
                active: request.current_status === 'ready_to_release',
                done: request.current_status === 'released',
              },
              {
                step: 4,
                title: isRTL ? '4. التسليم للعميل' : '4. Dispatch Release',
                desc: isRTL ? 'إرسال رابط التقرير النهائي للعميل لبدء الدفع والاستلام.' : 'Release proposal and notify customer to pay.',
                active: request.current_status === 'released',
                done: request.current_status === 'released',
              }
            ].map((s) => {
              const isLocked = !s.done && !s.active
              return (
                <div 
                  key={s.step} 
                  style={{
                    background: s.active ? 'rgba(247, 212, 107, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                    border: `1px solid ${s.active ? 'rgba(247, 212, 107, 0.3)' : s.done ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
                    borderRadius: '16px',
                    padding: '1.25rem',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    opacity: isLocked ? 0.45 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: s.done ? 'rgba(34, 197, 94, 0.15)' : s.active ? '#f7d46b' : 'rgba(255, 255, 255, 0.08)',
                      color: s.done ? '#4ade80' : s.active ? '#020617' : 'rgba(255, 255, 255, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: s.done ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                    }}>
                      {s.done ? '✓' : s.step}
                    </div>
                    <strong style={{ fontSize: '0.85rem', color: s.active ? '#f7d46b' : s.done ? '#fff' : 'rgba(255, 255, 255, 0.4)' }}>
                      {s.title}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', lineHeight: 1.4, color: s.active ? 'rgba(255, 255, 255, 0.85)' : s.done ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.25)' }}>
                    {s.desc}
                  </p>
                  {s.active && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      insetInlineEnd: '12px',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      background: 'rgba(247, 212, 107, 0.15)',
                      color: '#f7d46b',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      animation: 'pulse 2s infinite'
                    }}>
                      {isRTL ? 'جاري الآن' : 'Active'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="main-grid">
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* 1. Request Info (Moved to top) */}
            <section className="section-card glass-card" data-testid="staff-overview-section">
              <h2 className="card-title-text">{dict.staff_workspace.overview}</h2>
              <div className="field-grid">
                <div className="field-box">
                  <div className="field-label">{dict.staff_workspace.title}</div>
                  <div className="field-value">{request.title}</div>
                </div>
                <div className="field-box">
                  <div className="field-label">{dict.staff_workspace.customer}</div>
                  <div className="field-value">{request.customer_name}</div>
                </div>
                <div className="field-box" style={{ gridColumn: '1 / -1' }}>
                  <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {dict.staff_workspace.desc}
                    {request.source_type === 'ai_voice' && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', background: 'rgba(212,166,60,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(212,166,60,0.2)' }}>
                        🎙️ {isRTL ? 'تسجيل صوتي' : 'Voice Message'}
                      </span>
                    )}
                  </div>
                  <div className="field-value" style={{ fontWeight: 500, opacity: 0.8 }}>{request.raw_description}</div>
                </div>
              </div>
            </section>

            {/* 2. Preferences (Moved to top) */}
            <section className="section-card glass-card" data-testid="staff-preferences-section">
              <h2 className="card-title-text">{dict.staff_workspace.preferences}</h2>
              <div className="field-grid">
                <div className="field-box">
                  <div className="field-label">{dict.new_request.budget}</div>
                  <div className="field-value">
                    {preferences.budget_min ?? '-'} - {preferences.budget_max ?? '-'} {dict.common.currency_egp}
                  </div>
                </div>
                <div className="field-box">
                  <div className="field-label">{dict.staff_queue.filter_urgency}</div>
                  <div className="field-value">
                    <span className={`badge ${preferences.urgency_level === 'urgent' ? 'badge-red' : preferences.urgency_level === 'high' ? 'badge-gold' : 'badge-muted'}`}>
                      {formatUrgency(preferences.urgency_level, dict)}
                    </span>
                  </div>
                </div>
                <div className="field-box" style={{ gridColumn: '1 / -1' }}>
                  <div className="field-label">{dict.staff_queue.filter_search_scope}</div>
                  <div className="field-value">{preferences.search_scope || '-'}</div>
                </div>
              </div>
            </section>

            {/* 0. Reviewer Panel (Intake/Issues) */}
            {actionPermissions.canReviewIntake && (
              <section className="section-card glass-card" id="reviewer-panel">
                <h2 className="card-title-text">{dict.staff_workspace.reviewer_panel}</h2>
                
                {request.intake_ai_decision && (() => {
                  let displayIntakeSummary = request.intake_summary;
                  let parsed: any = null;
                  if (displayIntakeSummary) {
                    try {
                      parsed = JSON.parse(displayIntakeSummary);
                      displayIntakeSummary = parsed.summary || parsed.summary_en || displayIntakeSummary;
                    } catch (e) {
                      // plain text
                    }
                  }
                  return (
                    <div className="field-box" style={{ marginBlockEnd: '1.5rem', borderInlineStart: '4px solid var(--accent)' }}>
                      <div className="field-label">{dict.staff_workspace.ai_decision}</div>
                      <div className="badge badge-gold" style={{ marginBlockEnd: '0.5rem' }}>{request.intake_ai_decision}</div>
                      
                      {parsed ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: '1.5' }}>
                            {displayIntakeSummary}
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {parsed.category && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                                🏷️ {parsed.category}
                              </span>
                            )}
                            {parsed.priority && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                                ⚡ {parsed.priority}
                              </span>
                            )}
                            {parsed.budget_range && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                                💰 {parsed.budget_range}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{request.intake_summary}</p>
                      )}
                    </div>
                  );
                })()}

                <ReviewerDecisionForm 
                  requestId={requestId} 
                  locale={locale} 
                  dict={dict} 
                  isRTL={isRTL} 
                  errorCode={errorCode} 
                  decisionType={resolvedSearchParams.decision_type} 
                  defaultNote={request.reviewer_notes || ''}
                  requestData={request}
                />
              </section>
            )}
            {/* BATCH 5C: Scope & Pricing Review Panel */}
            {(actionPermissions.canReviewIntake || isTerminal) && (
              <section className="section-card glass-card" id="pricing-panel" style={{ opacity: isTerminal ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBlockEnd: '1.5rem' }}>
                  <div style={{ background: isTerminal ? 'rgba(255,255,255,0.1)' : 'var(--accent)', color: isTerminal ? 'white' : 'black', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <h2 className="card-title-text" style={{ margin: 0 }}>
                    {isRTL ? 'مراجعة النطاق والتسعير' : 'Scope & Pricing Review'} 
                    {isTerminal && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginInlineStart: '0.5rem' }}>({isRTL ? 'للقراءة فقط' : 'Read-Only'})</span>}
                  </h2>
                </div>

                <form action={isTerminal ? undefined : handleUpdateScopePricing} className="stack" style={{ gap: '1.5rem' }} data-testid="pricing-update-form">
                  <input type="hidden" name="requestId" value={requestId} />
                  <input type="hidden" name="locale" value={locale} />

                  <div className="field-grid">
                    <div className="field-box">
                      <div className="field-label">{isRTL ? 'اختيار العميل' : 'Customer Selection'}</div>
                      <div className="field-value" style={{ opacity: 0.6 }}>
                        {request.source_channel || 'NOT SELECTED'}
                      </div>
                    </div>

                    <div className="field-box">
                      <div className="field-label">{isRTL ? 'التصنيف المعتمد' : 'Confirmed Classification'}</div>
                      {isTerminal ? (
                        <div className="field-value">{request.request_kind?.replace('_', ' ')?.toUpperCase() || '-'}</div>
                      ) : (
                        <select 
                          name="requestKind" 
                          defaultValue={request.request_kind || 'everyday_purchase'}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                        >
                          <option value="everyday_purchase" style={{ color: 'black' }}>Everyday Purchase</option>
                          <option value="high_value_deals" style={{ color: 'black' }}>High-Value Deals</option>
                          <option value="projects_supplies" style={{ color: 'black' }}>Projects & Supplies</option>
                        </select>
                      )}
                    </div>

                    <div className="field-box">
                      <div className="field-label">{isRTL ? 'نموذج التسعير' : 'Pricing Model'}</div>
                      {isTerminal ? (
                        <div className="field-value">{request.pricing_model?.replace('_', ' ')?.toUpperCase() || '-'}</div>
                      ) : (
                        <select 
                          name="pricingModel" 
                          defaultValue={request.pricing_model || 'fixed_fee'}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                        >
                          <option value="fixed_fee" style={{ color: 'black' }}>Fixed Fee</option>
                          <option value="percentage_fee" style={{ color: 'black' }}>Percentage Fee</option>
                          <option value="fixed_plus_percentage" style={{ color: 'black' }}>Fixed + Percentage</option>
                          <option value="custom_quote" style={{ color: 'black' }}>Custom Quote</option>
                          <option value="retainer" style={{ color: 'black' }}>Retainer</option>
                        </select>
                      )}
                    </div>

                    <div className="field-box">
                      <div className="field-label">{isRTL ? 'سياسة الدفع' : 'Payment Policy'}</div>
                      {isTerminal ? (
                        <div className="field-value">{request.payment_policy?.replace('_', ' ')?.toUpperCase() || '-'}</div>
                      ) : (
                        <select 
                          name="paymentPolicy" 
                          defaultValue={request.payment_policy || 'pay_after_preview'}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                        >
                          <option value="pay_after_preview" style={{ color: 'black' }}>Pay After Preview (Trust Flow)</option>
                          <option value="upfront_deposit" style={{ color: 'black' }}>Upfront Deposit</option>
                          <option value="milestone_plan" style={{ color: 'black' }}>Milestone Plan</option>
                          <option value="custom_agreement" style={{ color: 'black' }}>Custom Agreement</option>
                        </select>
                      )}
                    </div>

                    <div className="field-box" style={{ border: errorCode === 'pricing_required' ? '1px solid #fca5a5' : '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="field-label">{isRTL ? 'رسوم الخدمة' : 'Service Fee'} (EGP) {!isTerminal && <span style={{ color: 'var(--accent)' }}>*</span>}</div>
                      {isTerminal ? (
                        <div className="field-value" style={{ color: 'var(--accent)', fontSize: '1.25rem' }}>{request.service_fee_amount?.toLocaleString() || '0'}</div>
                      ) : (
                        <input 
                          type="number" 
                          name="serviceFee" 
                          id="serviceFee"
                          defaultValue={request.service_fee_amount || 0}
                          required
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                        />
                      )}
                      {errorCode === 'pricing_required' && (
                        <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: 700, marginBlockStart: '0.5rem' }}>
                          {isRTL ? "يجب تحديد رسوم خدمة صالحة وملاحظات التسعير قبل قبول الطلب." : "Set a valid service fee and pricing notes before approving this request."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="field-box">
                    <div className="field-label">{isRTL ? 'ملاحظات التسعير الداخلية' : 'Internal Pricing Notes'}</div>
                    {isTerminal ? (
                      <div className="field-value" style={{ fontWeight: 500, opacity: 0.8 }}>{request.pricing_notes || '-'}</div>
                    ) : (
                      <textarea 
                        name="pricingNotes" 
                        defaultValue={request.pricing_notes || ''} 
                        placeholder="Pricing logic, discount applied, or package details..."
                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', outline: 'none', minHeight: '80px', resize: 'vertical', fontSize: '0.9rem' }}
                      />
                    )}
                  </div>

                  {!isTerminal && (
                    <button type="submit" className="btn-accent" style={{ background: 'var(--accent)', color: 'black', fontWeight: 900, alignSelf: 'flex-start' }}>
                      Confirm Scope & Pricing
                    </button>
                  )}
                </form>
              </section>
            )}

            {/* AI Intelligence Panel */}
            <AIIntelligencePanel 
              requestId={requestId}
              locale={locale}
              dict={dict}
              isRTL={isRTL}
              requestData={request}
              preferences={preferences}
            />

            <AICopilotPanel 
              requestId={requestId}
              requestData={request}
              preferences={preferences}
              snapshots={workspaceData.report_snapshots}
              dict={dict}
              isRTL={isRTL}
              actionPermissions={actionPermissions}
              isAdmin={isAdmin}
              canReviewIntake={permissions.canReviewIntake}
              canResearch={permissions.canResearch}
              canReport={permissions.canReport}
            />
            

            {/* 3. Research Runs */}
            {(isAdmin || permissions.canResearch) && (
              <section className="section-card glass-card" data-testid="staff-research-runs-section">
                <div className="card-title-row">
                  <h2 className="card-title-text">{dict.staff_workspace.research_runs}</h2>
                </div>
                
                {actionPermissions.canAddOnlineFinding && (
                  <form action={handleManualResearchTrigger} style={{ marginBottom: '2rem' }}>
                    <input type="hidden" name="requestId" value={requestId} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="btn-accent" style={{ background: 'var(--accent)', color: 'black', fontWeight: 900, padding: '0.75rem 1.5rem', borderRadius: '12px' }} data-testid="research-trigger-ai">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      {dict.staff_workspace.btn_trigger_ai}
                    </button>
                  </form>
                )}

                {/* Manual Research Finding Form */}
                {actionPermissions.canAddOnlineFinding && (
                  <div style={{ marginBlockEnd: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBlockEnd: '1.25rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {dict.staff_workspace.add_finding}
                    </h3>
                    <form action={handleSaveOnlineFinding} className="stack" style={{ gap: '1rem' }} data-testid="research-add-finding-form">
                      <input type="hidden" name="requestId" value={requestId} />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <input name="product_title" placeholder={dict.staff_workspace.finding_title} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="research-finding-title-input" />
                        <input name="source_name" placeholder={dict.staff_workspace.finding_source} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="research-finding-source-input" />
                        <input name="listing_url" placeholder={dict.staff_workspace.finding_url} type="url" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="research-finding-url-input" />
                        <input name="price_amount" placeholder={dict.staff_workspace.finding_price} type="number" step="0.01" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="research-finding-price-input" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input name="availability_status" placeholder={dict.staff_workspace.finding_availability} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                        <input name="specs" placeholder={dict.staff_workspace.finding_specs} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                      </div>
                      <textarea name="notes" placeholder={dict.staff_workspace.finding_notes} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical' }} data-testid="research-finding-notes-input" />
                      <button type="submit" className="btn-secondary" style={{ alignSelf: 'flex-start' }} data-testid="research-finding-save">{dict.common.save}</button>
                    </form>
                  </div>
                )}

                {researchRuns.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {researchRuns.map((run: any) => (
                      <div key={run.id} className="run-card">
                        <div className="run-top">
                          <span className="badge badge-muted">{run.run_kind}</span>
                          <span className={`badge ${run.status === 'completed' ? 'badge-green' : 'badge-gold'}`}>
                            {run.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBlockEnd: '1.5rem', fontWeight: 500 }}>
                          {run.summary || dict.staff_workspace.no_summary}
                        </p>
                        
                        <div className="finding-grid">
                          {run.research_items?.map((item: any) => (
                            <div key={item.id} className="item-box" data-testid="research-finding-item" data-research-item-id={item.id}>
                              <a href={item.listing_url || '#'} target="_blank" className="item-link">
                                {item.product_title}
                              </a>
                              <div className="finding-price">{item.price_amount?.toLocaleString()} {item.currency_code}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{item.source_name}</div>
                              
                              {actionPermissions.canAddShortlist && (
                                <form action={handleAddToShortlist} style={{ marginBlockStart: 'auto' }}>
                                  <input type="hidden" name="request_id" value={requestId} />
                                  <input type="hidden" name="research_item_id" value={item.id} />
                                  <input type="hidden" name="candidate_channel" value="online" />
                                  <input type="hidden" name="name" value={item.product_title} />
                                  <input type="hidden" name="price" value={`${item.price_amount} ${item.currency_code || dict.common.currency_egp}`} />
                                  <input type="hidden" name="locale" value={locale} />
                                  <input type="hidden" name="description" value="" />
                                  <button type="submit" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', width: '100%' }} data-testid={`shortlist-add-finding-${item.id}`} data-research-item-id={item.id}>
                                    {dict.staff_workspace.add_to_shortlist}
                                  </button>
                                </form>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-text">{dict.staff_workspace.no_research}</div>
                  </div>
                )}
              </section>
            )}

            {/* 4. Merchant Quotes */}
            {(isAdmin || permissions.canSourceOffline) && (
              <section className="section-card glass-card" data-testid="staff-merchant-quotes-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '1.5rem' }}>
                  <h2 className="card-title-text" style={{ margin: 0 }}>{dict.staff_workspace.field_agent_panel}</h2>
                  
                  {merchantQuotes.length > 0 && (
                    <form action={handleGenerateOfflineAIReport}>
                      <input type="hidden" name="requestId" value={requestId} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        🤖 {isRTL ? 'تحليل العروض الميدانية بالـ AI' : 'Analyze Offline Deals (AI)'}
                      </button>
                    </form>
                  )}
                </div>
                
                {/* Manual Merchant Quote Form */}
                {actionPermissions.canAddOfflineQuote && (
                  <div style={{ marginBlockEnd: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBlockEnd: '1.25rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {dict.staff_workspace.add_quote}
                    </h3>
                    <form action={handleSaveOfflineQuote} className="stack" style={{ gap: '1rem' }} data-testid="field-add-quote-form" encType="multipart/form-data">
                      <input type="hidden" name="requestId" value={requestId} />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <input name="merchant_name" placeholder={dict.staff_workspace.quote_merchant} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="field-quote-merchant-input" />
                        <input name="product_title" placeholder={dict.staff_workspace.quote_product} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="field-quote-product-input" />
                        <input name="price_amount" placeholder={dict.staff_workspace.quote_price} type="number" step="0.01" required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="field-quote-price-input" />
                        <input name="availability_status" placeholder={dict.staff_workspace.quote_availability} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} data-testid="field-quote-availability-input" />
                      </div>
                      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <input name="contact_person" placeholder={dict.staff_workspace.quote_contact} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                        <input name="phone_number" placeholder={dict.staff_workspace.quote_phone} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                        <input name="installment_details" placeholder={dict.staff_workspace.quote_installment} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                        <input name="governorate" placeholder={dict.staff_workspace.quote_governorate} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                        <input name="area" placeholder={dict.staff_workspace.quote_area} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                      </div>
                      <input name="address" placeholder={dict.staff_workspace.quote_address} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem' }} />
                      
                      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBlockStart: '0.25rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBlockEnd: '0.5rem' }}>
                            📸 {isRTL ? 'صورة المنتج' : 'Product Photo'}
                          </label>
                          <input type="file" name="product_image" accept="image/*" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBlockEnd: '0.5rem' }}>
                            📇 {isRTL ? 'كارت المحل' : 'Business Card Photo'}
                          </label>
                          <input type="file" name="business_card_image" accept="image/*" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', width: '100%' }} />
                        </div>
                      </div>

                      <textarea name="notes" placeholder={dict.staff_workspace.quote_notes} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'white', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical' }} data-testid="field-quote-notes-input" />
                      <button type="submit" className="btn-secondary" style={{ alignSelf: 'flex-start' }} data-testid="field-quote-save">{dict.common.save}</button>
                    </form>
                  </div>
                )}
                {merchantQuotes.length > 0 ? (() => {
                  const sortedOffline = [...merchantQuotes].sort((a: any, b: any) => {
                    if (a.ai_rank !== null && b.ai_rank !== null) return a.ai_rank - b.ai_rank;
                    if (a.ai_rank !== null) return -1;
                    if (b.ai_rank !== null) return 1;
                    return 0;
                  });

                  return (
                    <div className="finding-grid">
                      {sortedOffline.map((quote: any) => {
                        const hasAiMetrics = quote.ai_match_score !== null && quote.ai_match_score !== undefined;
                        
                        return (
                          <div key={quote.id} className="item-box" data-testid="merchant-quote-item" data-merchant-quote-id={quote.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', borderRadius: '15px', background: 'rgba(255,255,255,0.02)', border: hasAiMetrics ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                            {hasAiMetrics && (
                              <div style={{ position: 'absolute', top: 0, right: isRTL ? 'auto' : 0, left: isRTL ? 0 : 'auto', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 900, borderBottomLeftRadius: isRTL ? 0 : '10px', borderBottomRightRadius: isRTL ? '10px' : 0 }}>
                                #{quote.ai_rank} {isRTL ? 'تقييم' : 'Rank'}
                              </div>
                            )}
                            
                            {quote.product_image_path && (
                              <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', marginBlockEnd: '0.5rem' }}>
                                <img src={quote.product_image_path} alt={quote.product_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', marginInlineEnd: hasAiMetrics ? '60px' : '0' }}>
                                {quote.merchant_name || quote.option_label || '-'}
                              </div>
                              {quote.business_card_image_path && (
                                <a href={quote.business_card_image_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px', textDecoration: 'none', fontWeight: 800 }}>
                                  📇 {isRTL ? 'كارت المحل ↗' : 'Card Verified ↗'}
                                </a>
                              )}
                            </div>

                            <div className="field-value" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600 }}>
                              {quote.product_title || '-'}
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBlock: '2px', alignItems: 'center' }}>
                              {quote.governorate && (
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                  📍 {quote.governorate}{quote.area ? `, ${quote.area}` : ''}
                                </span>
                              )}
                              {quote.installment_details && (
                                <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                  💳 {quote.installment_details}
                                </span>
                              )}
                              {hasAiMetrics && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                  🎯 {quote.ai_match_score}% Match
                                </span>
                              )}
                            </div>

                            {/* AI Detailed Breakdown */}
                            {hasAiMetrics && (
                              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingBlockStart: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(quote.ai_rating_stars || 0)) + '☆'.repeat(5 - Math.round(quote.ai_rating_stars || 0))}</span>
                                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>({quote.ai_rating_stars})</span>
                                </div>
                                <div style={{ color: '#60a5fa', fontWeight: 800 }}>
                                  📢 {isRTL ? quote.ai_verdict_ar : quote.ai_verdict_en}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', lineHeight: '1.3' }}>
                                  💡 {isRTL ? quote.ai_advantages_ar : quote.ai_advantages_en}
                                </div>
                              </div>
                            )}

                            <div className="finding-price" style={{ marginBlockStart: 'auto', paddingBlockStart: '0.5rem', fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>
                              {quote.price_amount?.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{dict.common.currency_egp}</span>
                            </div>

                            {quote.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '8px' }}>
                                📝 {quote.notes}
                              </div>
                            )}

                            {actionPermissions.canAddShortlist && (
                              <form action={handleAddToShortlist} style={{ marginBlockStart: '0.5rem' }}>
                                <input type="hidden" name="request_id" value={requestId} />
                                <input type="hidden" name="merchant_quote_id" value={quote.id} />
                                <input type="hidden" name="candidate_channel" value="offline" />
                                <input type="hidden" name="name" value={`${quote.merchant_name || quote.option_label || '-'}: ${quote.product_title || '-'}`} />
                                <input type="hidden" name="price" value={`${quote.price_amount} ${dict.common.currency_egp}`} />
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="description" value="" />
                                <button type="submit" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', width: '100%' }} data-testid={`shortlist-add-quote-${quote.id}`} data-merchant-quote-id={quote.id}>
                                  {dict.staff_workspace.add_to_shortlist}
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏪</div>
                    <div className="empty-state-text">
                      {isRTL 
                        ? 'لم يتم تسجيل أي عروض أسعار ميدانية بعد.' 
                        : 'No field quotes recorded yet.'}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Online Sourcing Hub */}
            {(isAdmin || isResearcher || isFieldAgent) && (() => {
              const sortedQuotes = [...(onlineMerchantQuotes || [])].sort((a: any, b: any) => {
                if (a.ai_rank !== null && b.ai_rank !== null) return a.ai_rank - b.ai_rank;
                if (a.ai_rank !== null) return -1;
                if (b.ai_rank !== null) return 1;
                return 0;
              });

              return (
                <section className="section-card glass-card" data-testid="staff-online-sourcing-section">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '1.5rem' }}>
                    <div>
                      <h2 className="card-title-text" style={{ margin: 0 }}>
                        🌐 {isRTL ? 'محرك البحث والمقارنة التلقائي أونلاين' : 'Online Price Sourcing Hub'}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                        {isRTL 
                          ? 'يقوم بالبحث التلقائي في المتاجر وتحليل النتائج وترتيبها بالذكاء الاصطناعي.'
                          : 'Aggregates multi-source web quote retrievals and applies AI deal ranking & grading.'}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <form action={handleTriggerOnlineSourcing}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          ⚡ {isRTL ? 'فحص وجلب الأسعار' : 'Scan & Retrieve Prices'}
                        </button>
                      </form>

                      {onlineMerchantQuotes && onlineMerchantQuotes.length > 0 && (
                        <form action={handleGenerateUnifiedReport}>
                          <input type="hidden" name="requestId" value={requestId} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
                          >
                            🤖 {isRTL ? 'تحليل وتوحيد العروض بالـ AI' : 'Analyze & Unify Deals (AI)'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {sortedQuotes && sortedQuotes.length > 0 ? (
                    <div className="finding-grid">
                      {sortedQuotes.map((quote: any) => {
                        const hasAiMetrics = quote.ai_match_score !== null && quote.ai_match_score !== undefined;
                        
                        return (
                          <div key={quote.id} className="item-box" style={{ background: 'rgba(255,255,255,0.02)', border: hasAiMetrics ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '0.65rem', position: 'relative', overflow: 'hidden' }}>
                            {hasAiMetrics && (
                              <div style={{ position: 'absolute', top: 0, right: isRTL ? 'auto' : 0, left: isRTL ? 0 : 'auto', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 900, borderBottomLeftRadius: isRTL ? 0 : '10px', borderBottomRightRadius: isRTL ? '10px' : 0 }}>
                                #{quote.ai_rank} {isRTL ? 'تقييم' : 'Rank'}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '2px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                {quote.source_name?.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginInlineEnd: hasAiMetrics ? '60px' : '0' }}>
                                {new Date(quote.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div style={{ fontWeight: 900, color: 'white', fontSize: '1rem', marginBlockStart: '0.2' }}>
                              {quote.store_name}
                            </div>
                            
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={quote.title}>
                              {quote.title}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBlock: '4px' }}>
                              <span style={{ fontSize: '1.3rem', fontWeight: 950, color: '#f59e0b' }}>
                                {quote.price?.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{dict.common.currency_egp}</span>
                              </span>
                              
                              {hasAiMetrics && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                  🎯 {quote.ai_match_score}% {isRTL ? 'تطابق' : 'Match'}
                                </span>
                              )}
                            </div>

                            {/* AI Detailed Breakdown */}
                            {hasAiMetrics && (
                              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingBlockStart: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(quote.ai_rating_stars || 0)) + '☆'.repeat(5 - Math.round(quote.ai_rating_stars || 0))}</span>
                                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>({quote.ai_rating_stars}/5)</span>
                                </div>
                                <div style={{ color: '#60a5fa', fontWeight: 800 }}>
                                  📢 {isRTL ? quote.ai_verdict_ar : quote.ai_verdict_en}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
                                  💡 {isRTL ? quote.ai_advantages_ar : quote.ai_advantages_en}
                                </div>
                              </div>
                            )}

                            {quote.product_url && (
                              <a href={quote.product_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none', fontWeight: 700, marginBlockStart: '4px' }}>
                                {isRTL ? 'زيارة الرابط الأصلي ↗' : 'Visit Store Link ↗'}
                              </a>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: 'auto', paddingBlockStart: '0.5rem' }}>
                              {actionPermissions.canAddShortlist && (
                                <form action={handleAddToShortlist} style={{ flex: 1 }}>
                                  <input type="hidden" name="request_id" value={requestId} />
                                  <input type="hidden" name="online_quote_id" value={quote.id} />
                                  <input type="hidden" name="candidate_channel" value="online" />
                                  <input type="hidden" name="name" value={`${quote.store_name}: ${quote.title}`} />
                                  <input type="hidden" name="price" value={`${quote.price} ${dict.common.currency_egp}`} />
                                  <input type="hidden" name="locale" value={locale} />
                                  <input type="hidden" name="description" value="" />
                                  <button type="submit" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 0.5rem', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    📌 {isRTL ? 'إضافة للمسودة' : 'Shortlist'}
                                  </button>
                                </form>
                              )}

                              {hasAiMetrics && (
                                <form action={handlePromoteOnlineQuote} style={{ flex: 1 }}>
                                  <input type="hidden" name="quoteId" value={quote.id} />
                                  <input type="hidden" name="requestId" value={requestId} />
                                  <input type="hidden" name="locale" value={locale} />
                                  <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.5rem', width: '100%', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    📤 {isRTL ? 'تصدير للعميل' : 'Publish'}
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">🌐</div>
                      <div className="empty-state-text">
                        {isRTL 
                          ? 'لم يتم جلب عروض أسعار أونلاين بعد. اضغط على "فحص وجلب الأسعار" لبدء البحث.' 
                          : 'No online prices fetched yet. Click "Scan & Retrieve Prices" to begin.'}
                      </div>
                    </div>
                  )}
                </section>
              );
            })()}

            {/* UPGRADED RESEARCH AGENTS & COMMUNICATION TIMELINE PANEL */}
            <section className="section-card glass-card">
              <h2 className="card-title-text" style={{ marginBlockEnd: '1.5rem' }}>
                🤖 {isRTL ? 'وكلاء البحث والتواصل' : 'Sourcing Agents & Communications'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Sourcing Agents Status */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBlockEnd: '1rem' }}>
                    🛰️ {isRTL ? 'حالة وكلاء البحث' : 'Research Agents Status'}
                  </h3>
                  {jobsList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {jobsList.map((job: any) => (
                        <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>
                              {job.job_type === 'online_research' ? '🌐 Online Research Agent' : '🏪 Field Sourcing Agent'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBlockStart: '0.25rem' }}>
                              Started: {new Date(job.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <span className={`badge ${job.status === 'completed' ? 'badge-green' : job.status === 'running' ? 'badge-gold' : 'badge-muted'}`} style={{ marginInlineStart: 'auto' }}>
                            {job.status?.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      {isRTL ? 'لم يتم بدء أي وكيل بعد' : 'No research agent jobs triggered yet.'}
                    </div>
                  )}
                </div>

                {/* Communication Logs */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBlockEnd: '1rem' }}>
                    📧 {isRTL ? 'سجل اتصالات العميل' : 'Customer Communication Timeline'}
                  </h3>
                  {emailLogs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', scrollbarWidth: 'none' }}>
                      {emailLogs.map((log: any) => (
                        <details key={log.id} style={{ background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                          <summary style={{ fontWeight: 800, fontSize: '0.8rem', color: '#fff', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span>{log.status === 'received' ? '📥' : '📤'}</span>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {log.rendered_subject || 'Communication Event'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                              {new Date(log.created_at || log.sent_at).toLocaleDateString()}
                            </span>
                          </summary>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBlockStart: '0.75rem', paddingBlockStart: '0.75rem', borderBlockStart: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {log.rendered_body}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      {isRTL ? 'لا توجد اتصالات مسجلة' : 'No communication history found.'}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* NEW SECTION: FINAL UNIFIED CLIENT PROPOSAL */}
            <section className="section-card glass-card" style={{ marginBlockStart: '2rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '1.5rem' }}>
                <div>
                  <h2 className="card-title-text" style={{ margin: 0 }}>
                    ✨ {isRTL ? 'المقترح النهائي الموحد للعميل (توليف AI)' : 'Final Unified Client Proposal (AI Synthesis)'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                    {isRTL 
                      ? 'دمج وتوليف أفضل 5 عروض أونلاين وأوفلاين مع إخفاء بيانات التواصل والروابط لحين الدفع.'
                      : 'Aggregates & synthesizes the top 5 absolute best deals overall, masking merchant identity and URLs until payment.'}
                  </p>
                </div>
                
                <form action={handleGenerateFinalSynthesisProposal}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(167, 139, 250, 0.3)' }}
                    data-testid="compile-synthesis-proposal-btn"
                  >
                    🤖 {isRTL ? 'تجميع مقترح العميل النهائي' : 'Compile Final Client Proposal'}
                  </button>
                </form>
              </div>

              {workspaceData.report_snapshots && workspaceData.report_snapshots.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginBlockEnd: '0.5rem' }}>
                    📋 {isRTL ? 'معاينة خيارات التقرير للعميل (الـ 5 الأفضل):' : 'Customer Report Preview (Top 5 Deals):'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {workspaceData.report_snapshots.map((snap: any) => {
                      const isLocked = snap.reveal_locked !== false;
                      
                      return (
                        <div key={snap.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.2)', position: 'relative', overflow: 'hidden' }}>
                          {/* Rank & Lock Status Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '0.75rem' }}>
                            <span style={{ background: 'var(--accent)', color: 'black', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 900 }}>
                              #{snap.display_rank} {isRTL ? 'العرض' : 'Deal'}
                            </span>
                            
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: isLocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isLocked ? '#f87171' : '#34d399', border: isLocked ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)' }}>
                              {isLocked ? (isRTL ? '🔒 مغلق للعميل' : '🔒 Locked for Client') : (isRTL ? '🔓 مفتوح' : '🔓 Unlocked')}
                            </span>
                          </div>

                          <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'white', marginBlockEnd: '0.25rem' }}>
                            {snap.display_title}
                          </div>

                          <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#f59e0b', marginBlockEnd: '0.75rem' }}>
                            {snap.display_price_amount?.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{dict.common.currency_egp}</span>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBlockEnd: '1rem', background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '10px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--accent)', display: 'block', marginBlockEnd: '4px' }}>📝 {isRTL ? 'الوصف العام:' : 'Public Description:'}</span>
                            {snap.highlight_summary}
                          </div>

                          {/* Pros & Cons */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBlockEnd: '1rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                              <span style={{ fontWeight: 800, color: '#34d399', display: 'block', marginBlockEnd: '6px', fontSize: '0.8rem' }}>
                                👍 {isRTL ? 'المميزات:' : 'Advantages:'}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                                {isRTL ? snap.advantages_ar : snap.advantages_en}
                              </p>
                            </div>

                            <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                              <span style={{ fontWeight: 800, color: '#f87171', display: 'block', marginBlockEnd: '6px', fontSize: '0.8rem' }}>
                                👎 {isRTL ? 'العيوب:' : 'Disadvantages:'}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                                {isRTL ? snap.disadvantages_ar : snap.disadvantages_en}
                              </p>
                            </div>
                          </div>

                          {/* Staff Only Section */}
                          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingBlockStart: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            <div style={{ fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', fontSize: '0.65rem', marginBlockEnd: '2px' }}>
                              🛡️ {isRTL ? 'تفاصيل مخفية عن العميل (تظهر للموظفين فقط):' : 'Gated Details (Staff-Only Visibility):'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 700 }}>{isRTL ? 'اسم التاجر / المتجر:' : 'Merchant Name:'}</span>{' '}
                              <span style={{ color: 'white', fontWeight: 600 }}>{snap.hidden_merchant_name || 'N/A'}</span>
                            </div>
                            {snap.hidden_reference_url && (
                              <div>
                                <span style={{ fontWeight: 700 }}>{isRTL ? 'الرابط الأصل أو المصدر:' : 'Source URL:'}</span>{' '}
                                <a href={snap.hidden_reference_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                                  {snap.hidden_reference_url}
                                </a>
                              </div>
                            )}
                            {snap.hidden_contact_notes && (
                              <div>
                                <span style={{ fontWeight: 700 }}>{isRTL ? 'ملاحظات الاتصال والعنوان:' : 'Contact Notes:'}</span>{' '}
                                <span style={{ color: 'white' }}>{snap.hidden_contact_notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">✨</div>
                  <div className="empty-state-text">
                    {isRTL 
                      ? 'لم يتم تجميع مقترح العميل النهائي بعد. اضغط على "تجميع مقترح العميل النهائي" لتشغيل محرك التوليف بالذكاء الاصطناعي.' 
                      : 'No final proposal compiled yet. Click "Compile Final Client Proposal" to run the synthesis AI engine.'}
                  </div>
                </div>
              )}
            </section>
          </div>


          <aside className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* AI Concierge & Source Inputs Card */}
            {(request.source_type && request.source_type !== 'manual') && (
              <section className="section-card glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(247, 212, 107, 0.2)' }}>
                <h2 className="card-title-text" style={{ fontSize: '1rem', marginBlockEnd: '1rem', color: '#f7d46b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧠</span>
                  {isRTL ? 'تحليل الذكاء الاصطناعي والمصدر' : 'AI Analysis & Original Source'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Source Type */}
                  <div className="field-box">
                    <div className="field-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>
                      {isRTL ? 'قناة الإدخال الأصلية' : 'Original Input Channel'}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {request.source_type === 'ai_voice' && (isRTL ? '🎙️ رسالة صوتية (ذكية)' : '🎙️ Voice Message')}
                      {request.source_type === 'ai_image' && (isRTL ? '📸 فحص صورة (ذكية)' : '📸 Image Attachment')}
                      {request.source_type === 'product_link' && (isRTL ? '🔗 رابط منتج خارجي' : '🔗 Product Link')}
                      {request.source_type === 'ai_text' && (isRTL ? '✍️ وصف نصي ذكي' : '✍️ Smart Text Description')}
                    </div>
                  </div>

                  {/* AI Confidence */}
                  {request.ai_confidence !== null && request.ai_confidence !== undefined && (
                    <div className="field-box">
                      <div className="field-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>
                        {isRTL ? 'درجة ثقة تحليل الذكاء الاصطناعي' : 'AI Analysis Confidence'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(0, request.ai_confidence * 100))}%`,
                            height: '100%',
                            background: request.ai_confidence > 0.8 ? '#22c55e' : request.ai_confidence > 0.5 ? '#eab308' : '#ef4444',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
                          {Math.round(request.ai_confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* original link if product_link */}
                  {(request.metadata && request.metadata.sourceUrl) && (
                    <div className="field-box">
                      <div className="field-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>
                        {isRTL ? 'رابط المنتج الأصلي (المصدر)' : 'Original Product URL (Source)'}
                      </div>
                      <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                        <a 
                          href={request.metadata.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: '#6366f1', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          {request.metadata.sourceUrl} ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {/* extracted image url if any */}
                  {(request.metadata && request.metadata.productImageUrl) && (
                    <div className="field-box">
                      <div className="field-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5 }}>
                        {isRTL ? 'صورة المنتج المستخرجة من الرابط' : 'Product Image Extracted from URL'}
                      </div>
                      <div style={{ marginTop: '6px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', padding: '4px' }}>
                        <img 
                          src={request.metadata.productImageUrl} 
                          alt="Extracted URL product" 
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Image Card */}
            <section className="section-card glass-card" style={{ padding: '1.5rem' }}>
              <h2 className="card-title-text" style={{ fontSize: '1rem', marginBlockEnd: '1rem' }}>
                {dict.staff_workspace.reference_image}
              </h2>
              <div className="image-frame">
                {referenceImageUrl ? (
                  <img src={referenceImageUrl} alt="Reference" />
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.2 }}>
                    <div style={{ fontSize: '2rem', marginBlockEnd: '0.5rem' }}>🖼️</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{dict.staff_workspace.no_image}</div>
                  </div>
                )}
              </div>
            </section>

            {/* Shortlist Card */}
            {(isAdmin || permissions.canReport) && (
              <section className="section-card glass-card" data-testid="staff-shortlist-section">
                <h2 className="card-title-text" style={{ marginBlockEnd: '1.5rem' }}>
                  {dict.staff_workspace.shortlist_title}
                </h2>
                {shortlist.length > 0 ? (
                  <div>
                    {shortlist.map((item: any) => (
                      <div 
                        key={item.id} 
                        className={`shortlist-item ${item.is_recommended ? 'recommended' : ''}`}
                        data-testid="shortlist-item"
                        data-shortlist-id={item.id}
                        data-candidate-channel={item.candidate_channel || ''}
                        data-research-item-id={item.research_item_id || ''}
                        data-merchant-quote-id={item.merchant_quote_id || ''}
                      >
                        <div style={{ fontWeight: 900, color: 'white', marginBlockEnd: '0.25rem' }}>{item.option_label}</div>
                        <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.9rem' }}>{item.customer_summary}</div>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBlockStart: '0.5rem', fontWeight: 500, lineHeight: 1.4 }}>
                          {item.reason_summary}
                        </p>
                      </div>
                    ))}
                    
                    <div style={{ marginBlockStart: '2rem' }}>
                      {actionPermissions.canPrepareBundle && (
                        <form action={handlePrepareClientBundle}>
                          <input type="hidden" name="requestId" value={requestId} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="btn-secondary" style={{ marginBlockEnd: '0.75rem' }} data-testid="shortlist-prepare-bundle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
                            {dict.staff_workspace.prepare_bundle}
                          </button>
                        </form>
                      )}
                      
                      {workspaceData.request.snapshot_count > 0 && !hasReleased && (
                        <div className="alert alert-success" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', marginBlockEnd: '1rem' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {dict.staff_workspace.bundle_prepared}
                        </div>
                      )}

                      {actionPermissions.canReleaseToCustomer && (
                        <form action={handleReleaseToCustomer}>
                          <input type="hidden" name="requestId" value={requestId} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="btn-accent" style={{ background: 'var(--gold)', color: '#020617', fontWeight: 900, width: '100%', margin: 0 }} data-testid="shortlist-release-now" data-transition-name="RELEASE_FINAL">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            {dict.staff_workspace.release_now}
                          </button>
                        </form>
                      )}

                      {hasReleased && (
                        <div className="alert alert-success" style={{ marginBlockEnd: 0 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          {dict.staff_workspace.released_to_customer}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ paddingBlock: '2rem' }}>
                    <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📋</div>
                    <div className="empty-state-text" style={{ fontSize: '0.9rem' }}>{dict.staff_workspace.shortlist_empty}</div>
                  </div>
                )}
              </section>
            )}
            
            {/* Report Preview Builder */}
            {(isAdmin || permissions.canReport) && (
              <section className="section-card glass-card" id="report-builder" data-testid="staff-report-builder-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBlockEnd: '1.5rem' }}>
                  <div style={{ background: 'var(--accent)', color: 'black', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <h2 className="card-title-text" style={{ margin: 0 }}>
                    {dict.staff_workspace.report_builder_title}
                  </h2>
                </div>

                <ReportBuilderPanel 
                  requestId={requestId}
                  report={workspaceData.report}
                  snapshots={workspaceData.report_snapshots}
                  dict={dict}
                  locale={locale}
                />
              </section>
            )}

            {/* Path Engine */}
            <section className="section-card glass-card" data-testid="staff-path-engine-section">
              <h2 className="card-title-text" style={{ marginBlockEnd: '1.5rem' }}>{dict.staff_workspace.path_engine}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="field-box" style={{ padding: '1rem' }}>
                  <div className="field-label">{dict.staff_workspace.current_stage}</div>
                  <div className="badge badge-gold" style={{ fontSize: '0.8rem', padding: '0.35rem 1rem' }}>
                    {request.current_status}
                  </div>
                </div>
                
                <div className="field-box" style={{ padding: '1rem' }}>
                  <div className="field-label">{dict.staff_workspace.stage_transition}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    {actionPermissions.canResolveIssue && (
                      <form action={handleTransition}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="transition" value="RESOLVE_ISSUE" />
                        <input type="hidden" name="note" value="" />
                        <button type="submit" className="btn-secondary" style={{ margin: 0, width: '100%' }} data-testid="path-engine-resolve-issue" data-transition-name="RESOLVE_ISSUE">
                          {dict.staff_workspace.btn_resolve_issue}
                        </button>
                      </form>
                    )}
                    {actionPermissions.canStartResearch && (
                      <form action={handleTransition}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="transition" value="START_RESEARCH" />
                        <input type="hidden" name="note" value="" />
                        <button type="submit" className="btn-secondary" style={{ margin: 0, width: '100%' }} data-testid="path-engine-start-research" data-transition-name="START_RESEARCH">
                          {dict.staff_workspace.btn_start_research}
                        </button>
                      </form>
                    )}
                    {actionPermissions.canMoveToReporting && (
                      <form action={handleTransition}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="transition" value="MOVE_TO_REPORTING" />
                        <input type="hidden" name="note" value="" />
                        <button type="submit" className="btn-secondary" style={{ margin: 0, width: '100%' }} data-testid="path-engine-move-to-reporting" data-transition-name="MOVE_TO_REPORTING">
                          {dict.staff_workspace.action_history.events.MOVE_TO_REPORTING}
                        </button>
                      </form>
                    )}
                    {actionPermissions.canRevertToOps && (
                      <form action={handleTransition}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="transition" value="REVERT_TO_OPS" />
                        <input type="hidden" name="note" value="" />
                        <button type="submit" className="btn-secondary" style={{ margin: 0, width: '100%' }} data-testid="path-engine-revert-to-ops" data-transition-name="REVERT_TO_OPS">
                          {dict.staff_workspace.action_history.events.REVERT_TO_OPS}
                        </button>
                      </form>
                    )}
                    
                    {/* Archive Actions */}
                    {actionPermissions.canMoveToArchive && (
                      <form action={handleArchiveRequest}>
                        <input type="hidden" name="requestId" value={requestId} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="reason" value="Manual archive from workspace" />
                        <button type="submit" className="btn-secondary" style={{ margin: 0, width: '100%', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }} data-testid="path-engine-archive">
                          {dict.staff_queue.btn_archive}
                        </button>
                      </form>
                    )}

                    {/* Restore handled ONLY in Archive & Cleanup tool per requirement */}
                  </div>
                </div>
              </div>
            </section>

            {/* Customer Chat / التواصل مع العميل */}
            <section className="section-card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className="card-title-text" style={{ fontSize: '1rem', margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💬</span>
                {isRTL ? 'التواصل مع العميل' : 'Customer Communication'}
              </h2>
              
              <div style={{ 
                maxHeight: '260px', 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '12px', 
                padding: '0.75rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.5, fontSize: '0.8rem' }}>
                    {isRTL ? 'لا توجد رسائل متبادلة بعد.' : 'No messages exchanged yet.'}
                  </div>
                ) : (
                  chatMessages.map((msg: any) => {
                    const isCust = msg.sender_type === 'customer'
                    const isSys = msg.sender_type === 'system'
                    const isClientEdit = msg.message?.startsWith('[CLIENT EDIT REQUEST]')
                    const cleanMsg = msg.message?.replace(/^\[(SYSTEM|CLIENT EDIT REQUEST)\]\s*/g, '').trim()

                    if (isSys) {
                      return (
                        <div key={msg.id} style={{ 
                          alignSelf: 'center', 
                          background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '12px', 
                          padding: '4px 10px', 
                          fontSize: '0.7rem', 
                          opacity: 0.6, 
                          textAlign: 'center',
                          maxWidth: '90%'
                        }}>
                          {cleanMsg}
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignSelf: isCust ? 'flex-start' : 'flex-end', 
                        maxWidth: '85%',
                        alignItems: isCust ? 'flex-start' : 'flex-end'
                      }}>
                        <span style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '2px' }}>
                          {isCust ? (isRTL ? 'العميل' : 'Customer') : (isRTL ? 'الموظف' : 'Staff')} · {new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div style={{ 
                          padding: '8px 12px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem', 
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                          background: isCust ? 'rgba(255,255,255,0.08)' : 'var(--accent)',
                          color: isCust ? '#fff' : '#000',
                          fontWeight: isCust ? 'normal' : 600,
                          border: isCust ? '1px solid rgba(255,255,255,0.08)' : 'none'
                        }}>
                          {isClientEdit && (
                            <strong style={{ display: 'block', color: '#fbbf24', fontSize: '0.7rem', marginBottom: '2px' }}>
                              ⚠️ {isRTL ? 'طلب تعديل:' : 'Edit Request:'}
                            </strong>
                          )}
                          {cleanMsg}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form action={handleSendClarificationMessage} className="stack" style={{ gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                <input type="hidden" name="requestId" value={requestId} />
                <input type="hidden" name="locale" value={locale} />
                <textarea 
                  name="messageText" 
                  placeholder={isRTL ? 'اكتب استفساراً للعميل (سيصله تنبيه فوري بالبريد)...' : 'Ask the customer a question (they will receive an email alert)...'}
                  required
                  rows={3}
                  style={{ 
                    width: '100%', 
                    background: 'rgba(0,0,0,0.3)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    padding: '0.5rem 0.75rem', 
                    color: '#fff', 
                    fontSize: '0.85rem', 
                    outline: 'none', 
                    resize: 'none' 
                  }}
                />
                <button type="submit" className="btn-accent" style={{ background: 'var(--accent)', color: '#000', fontWeight: 900, fontSize: '0.8rem', width: '100%', margin: 0 }}>
                  {isRTL ? 'إرسال الاستفسار وتنبيه العميل ✉️' : 'Send Clarification & Notify Customer ✉️'}
                </button>
              </form>
            </section>

            {/* Action History */}
            <ActionHistoryPanel 
              requestId={requestId} 
              dictionary={dict} 
              locale={locale} 
            />
          </aside>
        </div>
      </div>
    </main>
  )
}

function ReportBuilderPanel({ requestId, report, snapshots, dict, locale }: any) {
  return (
    <>
      {snapshots.length > 0 ? (
        <div className="stack" style={{ gap: '1rem', marginBlockEnd: '2rem' }}>
          {snapshots.map((snap: any) => (
            <div key={snap.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBlockEnd: '0.5rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{snap.display_title}</div>
                <form action={handleDeleteSnapshot}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <input type="hidden" name="snapshotId" value={snap.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800 }}>
                    {dict.common.delete}
                  </button>
                </form>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 800, marginBlockEnd: '0.5rem' }}>
                {snap.display_price_amount?.toLocaleString()} {dict.common.currency_egp}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                {snap.highlight_summary}
              </p>
              
              <div style={{ marginBlockStart: '0.75rem', paddingBlockStart: '0.75rem', borderBlockStart: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                 <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>
                   <span style={{ fontWeight: 800 }}>HIDDEN MERCHANT:</span> {snap.hidden_merchant_name || 'N/A'}
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginBlockEnd: '2rem' }}>
          <div className="empty-state-text" style={{ fontSize: '0.85rem' }}>No snapshots added yet.</div>
        </div>
      )}

      {/* Add/Edit Form */}
      <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBlockEnd: '1rem', opacity: 0.7 }}>Add Report Snapshot</h3>
        <form action={handleUpsertSnapshot} className="stack" style={{ gap: '1rem' }} data-testid="report-snapshot-form">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="reportId" value={report?.id || ''} />
          <input type="hidden" name="locale" value={locale} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.75rem' }}>
            <input name="displayTitle" placeholder="Display Title (e.g. Option A)" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.6rem', color: 'white', fontSize: '0.85rem' }} />
            <input name="displayRank" type="number" placeholder="Rank" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.6rem', color: 'white', fontSize: '0.85rem' }} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <input name="price" type="number" placeholder="Display Price" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.6rem', color: 'white', fontSize: '0.85rem' }} />
            <textarea name="highlightSummary" placeholder="Public Highlight Summary (visible to customer before payment)" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.6rem', color: 'white', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical' }} />
          </div>

          <div style={{ marginBlockStart: '0.5rem', padding: '1rem', background: 'rgba(212,166,60,0.05)', borderRadius: '12px', border: '1px solid rgba(212,166,60,0.1)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', marginBlockEnd: '0.75rem' }}>Locked Source Details (Payment Gated)</div>
            <div className="stack" style={{ gap: '0.75rem' }}>
              <input name="hiddenMerchantName" placeholder="Merchant Name" required style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', color: 'white', fontSize: '0.8rem' }} />
              <input name="hiddenSourceUrl" placeholder="Source/Product URL" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', color: 'white', fontSize: '0.8rem' }} />
              <textarea name="hiddenContactNotes" placeholder="Contact/Order Instructions (masked)" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', color: 'white', fontSize: '0.8rem', minHeight: '50px', resize: 'vertical' }} />
            </div>
          </div>

          <button type="submit" className="btn-secondary" style={{ width: '100%', margin: 0, fontSize: '0.8rem' }} data-testid="report-snapshot-save">
            Save Snapshot
          </button>
        </form>
      </div>

      {snapshots.length > 0 && (
        <form action={handleMarkReportReady} style={{ marginBlockStart: '1.5rem' }}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-accent" style={{ width: '100%', margin: 0, background: 'var(--accent)', color: 'black', fontWeight: 900 }} data-testid="report-mark-ready">
            Release Report to Customer
          </button>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBlockStart: '0.75rem', fontWeight: 600 }}>
            This will lock the report and notify the customer.
          </p>
        </form>
      )}
    </>
  )
}
