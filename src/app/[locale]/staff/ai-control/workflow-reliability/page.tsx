import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId } from '@/lib/dal/staff'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { retryWorkflowAction } from './actions'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function WorkflowReliabilityPage({ params }: PageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRtl = locale === 'ar'

  // Authenticate & authorise active staff members
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch workflow runs coupled with parent requests to show details
  const { data: workflowRuns, error: dbError } = await supabase
    .from('workflow_runs')
    .select(`
      id,
      request_id,
      ai_summary_status,
      email_status,
      dispatch_status,
      attempts,
      last_error,
      updated_at,
      requests (
        request_code,
        title,
        customer_id,
        customers (
          full_name
        )
      )
    `)
    .order('updated_at', { ascending: false })

  // Action function to handle triggering retry via Server Action
  const triggerRetry = async (formData: FormData) => {
    'use server'
    const reqId = formData.get('requestId') as string
    const loc = formData.get('locale') as string
    await retryWorkflowAction(reqId, loc)
  }

  // Render a clean dashboard to control failed, pending, and running background workflows
  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr', color: '#f8fafc', padding: '2rem 1rem' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .reliability-header {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .reliability-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .reliability-subtitle {
          color: #94a3b8;
          font-size: 0.95rem;
        }
        .reliability-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1.5rem;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }
        .reliability-table th, .reliability-table td {
          padding: 1rem;
          text-align: right;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        html[dir="ltr"] .reliability-table th, html[dir="ltr"] .reliability-table td {
          text-align: left;
        }
        .reliability-table th {
          background: rgba(255, 255, 255, 0.03);
          color: #64748b;
          font-size: 0.8rem;
          text-transform: uppercase;
        }
        .status-pill {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .pill-pending { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
        .pill-running { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .pill-completed { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .pill-failed { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        
        .btn-retry {
          background: #ef4444;
          color: #fff;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.8rem;
          transition: background 0.2s;
        }
        .btn-retry:hover {
          background: #dc2626;
        }
        .stuck-row {
          background: rgba(239, 68, 68, 0.08) !important;
          border-left: 4px solid #ef4444;
        }
      `}} />

      <div className="reliability-header">
        <h1 className="reliability-title">
          {locale === 'ar' ? 'متابعة موثوقية العمليات والوظائف الخلفية' : 'Background Operational Flow & Reliability Dashboard'}
        </h1>
        <p className="reliability-subtitle">
          {locale === 'ar' 
            ? 'تتبع حالة تنفيذ خطوات قبول الطلبات (ملخص الذكاء الاصطناعي، إرسال الإشعارات البريدية، وبدء مهام وكلاء البحث أونلاين وأوفلاين).' 
            : 'Track background workflow execution stages (AI summary, email notification delivery, and research agent dispatches).'}
        </p>
      </div>

      <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
            {locale === 'ar' ? 'سجل العمليات الخلفية' : 'Operational Workflows Tracker'}
          </h2>
          <Link href={`/${locale}/staff/ai-control`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
            &larr; {locale === 'ar' ? 'العودة للوحة التحكم الرئيسية' : 'Back to AI Control Center'}
          </Link>
        </div>

        {dbError && (
          <div style={{ color: '#f87171', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
            {dbError.message}
          </div>
        )}

        {!workflowRuns || workflowRuns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            {locale === 'ar' ? 'لا يوجد أي عمليات مسجلة حالياً.' : 'No workflows registered yet.'}
          </div>
        ) : (
          <table className="reliability-table">
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'رقم الطلب' : 'Request Code'}</th>
                <th>{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                <th>{locale === 'ar' ? 'ملخص الذكاء' : 'AI Summary'}</th>
                <th>{locale === 'ar' ? 'الإيميل' : 'Notification Email'}</th>
                <th>{locale === 'ar' ? 'الوكلاء' : 'Agents Dispatch'}</th>
                <th>{locale === 'ar' ? 'المحاولات' : 'Attempts'}</th>
                <th>{locale === 'ar' ? 'آخر تحديث' : 'Last Updated'}</th>
                <th>{locale === 'ar' ? 'التفاصيل / الإجراء' : 'Details / Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {workflowRuns.map((run: any) => {
                const req = run.requests || {}
                const cust = req.customers || {}
                const updatedAt = new Date(run.updated_at)
                const isStuck = (Date.now() - updatedAt.getTime() > 10 * 60 * 1000) && 
                  (run.ai_summary_status === 'running' || run.email_status === 'running' || run.dispatch_status === 'running');

                const getStatusPill = (status: string) => {
                  switch (status) {
                    case 'completed': return <span className="status-pill pill-completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</span>
                    case 'running': return <span className="status-pill pill-running">{locale === 'ar' ? 'جاري' : 'Running'}</span>
                    case 'failed': return <span className="status-pill pill-failed">{locale === 'ar' ? 'فشل' : 'Failed'}</span>
                    default: return <span className="status-pill pill-pending">{locale === 'ar' ? 'معلق' : 'Pending'}</span>
                  }
                }

                return (
                  <tr key={run.id} className={isStuck ? 'stuck-row' : ''}>
                    <td style={{ fontWeight: 'bold' }}>{req.request_code || '-'}</td>
                    <td>{cust.full_name || '-'}</td>
                    <td>{getStatusPill(run.ai_summary_status)}</td>
                    <td>{getStatusPill(run.email_status)}</td>
                    <td>{getStatusPill(run.dispatch_status)}</td>
                    <td>{run.attempts}</td>
                    <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {updatedAt.toLocaleTimeString()} {isStuck && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '4px' }}>({locale === 'ar' ? 'عالق!' : 'Stuck!'})</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {run.last_error && (
                          <div style={{ fontSize: '0.75rem', color: '#f87171', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                            <strong>Error:</strong> {run.last_error}
                          </div>
                        )}
                        {(run.ai_summary_status === 'failed' || run.email_status === 'failed' || run.dispatch_status === 'failed' || isStuck) && (
                          <form action={triggerRetry}>
                            <input type="hidden" name="requestId" value={run.request_id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button type="submit" className="btn-retry">
                              {locale === 'ar' ? 'إعادة تشغيل' : 'Retry Workflow'}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
