import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { 
  getIntakeQueueRequests,
  getOperationsQueueRequests,
  getReadyQueueRequests,
  getCompletedQueueRequests,
  getIssuesQueueRequests,
  getRejectedQueueRequests,
  getArchivedRequestsAdmin,
  archiveRequestAdmin,
  restoreRequestAdmin
} from '@/lib/dal/requests'
import { getStaffMemberByAuthUserId, getStaffUiPermissions, getAssignableReviewers, getAdminGlobalStats } from '@/lib/dal/staff'
import { handleAssignReviewer, handleAutoAssignReviewer, handleUnassignReviewer, handleArchiveRequest, handleRestoreRequest } from './actions'
import AssignmentControls from './AssignmentControls'
import { createClient } from '@/lib/supabase/server'
import { getActiveSlaMonitoring, getQueuePerformanceMetrics } from '@/lib/dal/performance'
import { SlaStatusBadge } from '@/components/staff/SlaStatusBadge'
import { QueuePerformanceMetrics } from '@/components/staff/QueuePerformanceMetrics'

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    view?: string
    urgency?: string
    stage?: string
    decision?: string
    status?: string
    scope?: string
    governorate?: string
    area?: string
    assignment?: string
    sla_status?: string
    sort_by?: string
    sort_dir?: string
  }>
}

type QueueRow = {
  request_id: string
  request_code: string
  title: string | null
  raw_description: string | null
  has_reference_image: boolean
  request_kind: string | null
  urgency_level: string | null
  intake_stage: string
  customer_name: string | null
  reviewer_decision: string | null
  reviewer_notes: string | null
  current_status: string | null
  request_created_at: string
  search_scope?: string | null
  preferred_governorate?: string | null
  preferred_area?: string | null
  assigned_reviewer_staff_id?: string | null
  reviewer_assignment_status?: string
  assigned_reviewer_name?: string | null
  is_archived?: boolean
  archived_at?: string | null
  archive_reason?: string | null
}

function formatDecision(decision: string | null, locale: string) {
  if (!decision) return '-'

  if (locale === 'ar') {
    if (decision === 'approve') return 'مقبول'
    if (decision === 'reject') return 'مرفوض'
    if (decision === 'needs_clarification') return 'يحتاج توضيح'
    return decision
  }

  if (decision === 'approve') return 'Approved'
  if (decision === 'reject') return 'Rejected'
  if (decision === 'needs_clarification') return 'Clarify'
  return decision
}

function stageRank(stage: string) {
  switch (stage) {
    case 'pending_staff_review':
      return 0
    case 'pending_ai_review':
      return 1
    case 'staff_reviewed':
      return 2
    default:
      return 9
  }
}

function urgencyRank(urgency: string | null) {
  switch (urgency) {
    case 'urgent':
      return 0
    case 'high':
      return 1
    case 'normal':
      return 2
    default:
      return 9
  }
}

function formatStage(stage: string, locale: string) {
  if (locale === 'ar') {
    if (stage === 'pending_ai_review') return 'في انتظار مراجعة الذكاء'
    if (stage === 'pending_staff_review') return 'في انتظار مراجعة الموظف'
    if (stage === 'staff_reviewed') return 'تمت مراجعة الموظف'
    return stage
  }

  if (stage === 'pending_ai_review') return 'Pending AI Review'
  if (stage === 'pending_staff_review') return 'Pending Staff Review'
  if (stage === 'staff_reviewed') return 'Staff Reviewed'
  return stage
}

function formatUrgency(urgency: string | null, locale: string) {
  if (locale === 'ar') {
    if (urgency === 'urgent') return 'عاجل'
    if (urgency === 'high') return 'عالي'
    return 'عادي'
  }

  if (urgency === 'urgent') return 'Urgent'
  if (urgency === 'high') return 'High'
  return 'Normal'
}

function formatKind(kind: string | null, locale: string) {
  if (locale === 'ar') {
    if (kind === 'everyday_purchase') return 'شراء عادي'
    if (kind === 'high_value_asset') return 'أصل عالي القيمة'
    if (kind === 'project_supply') return 'توريد مشروع'
    if (kind === 'general') return 'عام / خدمة'
    return '-'
  }

  if (kind === 'everyday_purchase') return 'Everyday Purchase'
  if (kind === 'high_value_asset') return 'High Value Asset'
  if (kind === 'project_supply') return 'Project Supply'
  if (kind === 'general') return 'General / Service'
  return '-'
}

function formatDate(dateStr: string, _locale?: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function formatScope(scope: string | null | undefined, locale: string) {
  if (locale === 'ar') {
    if (scope === 'online_only') return 'أونلاين'
    if (scope === 'offline_only') return 'أوفلاين'
    return 'شامل'
  }

  if (scope === 'online_only') return 'Online'
  if (scope === 'offline_only') return 'Offline'
  return 'Both'
}

function getActionInstruction(row: QueueRow, view: string, permissions: any, locale: string) {
  if (view === 'intake') {
    if (!row.reviewer_decision) {
      return locale === 'ar' 
        ? 'بانتظار المراجعة: يرجى قبول أو رفض الطلب وتحديد نوعه.' 
        : 'Waiting for review: Please approve or reject the request and set kind.'
    }
    return locale === 'ar' ? 'تمت المراجعة: بانتظار بدء العمليات.' : 'Review completed: Waiting for operations.'
  }

  if (view === 'operations') {
    if (row.current_status === 'in_progress' || row.current_status === 'research') {
       const hasResearch = permissions.canResearch
       const hasField = permissions.canSourceOffline
       
       if (hasResearch && hasField) {
         return locale === 'ar'
           ? 'بانتظار البحث: تأكد من نتائج الأونلاين وجمع عروض الموردين.'
           : 'Waiting for sourcing: Verify online results and collect merchant quotes.'
       }
       if (hasResearch) {
         return locale === 'ar'
           ? 'بانتظار البحث أونلاين: تأكد من صلاحية الروابط وتوفر المنتجات.'
           : 'Waiting for online research: Verify links and product availability.'
       }
       if (hasField) {
         return locale === 'ar'
           ? 'بانتظار البحث الميداني: تواصل مع الموردين واحصل على عروض أسعار.'
           : 'Waiting for field sourcing: Contact suppliers and get quotes.'
       }
    }
    return locale === 'ar' ? 'جاري تجهيز النتائج للمراجعة النهائية.' : 'Preparing results for final review.'
  }

  if (view === 'ready') {
    return locale === 'ar'
      ? 'بانتظار النشر: راجع القائمة النهائية ثم حررها للعميل.'
      : 'Waiting for release: Review final shortlist then release to customer.'
  }

  if (view === 'processed') {
    if (row.current_status === 'closed') {
      return locale === 'ar' ? 'مكتمل: تم تحرير النتائج للعميل بنجاح.' : 'Completed: Results successfully released to customer.'
    }
    return locale === 'ar' ? 'تمت المعالجة: الطلب مرفوض أو يحتاج توضيح من العميل.' : 'Processed: Request rejected or needs customer clarification.'
  }

  return locale === 'ar' ? 'افتح الطلب لمتابعة التفاصيل.' : 'Open request to follow up details.'
}

export default async function StaffQueuePage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const {
    view,
    urgency,
    stage,
    decision,
    status,
    scope,
    governorate,
    area,
    assignment,
    sla_status,
    sort_by,
    sort_dir,
  } = await searchParams

  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const sortBy = sort_by || 'sla'
  const sortDir = sort_dir || 'desc'

  const getSortLink = (field: string) => {
    const isCurrent = sortBy === field
    const nextDir = isCurrent && sortDir === 'asc' ? 'desc' : 'asc'
    const queryParts = []
    
    if (view) queryParts.push(`view=${view}`)
    if (urgency) queryParts.push(`urgency=${urgency}`)
    if (stage) queryParts.push(`stage=${stage}`)
    if (decision) queryParts.push(`decision=${decision}`)
    if (status) queryParts.push(`status=${status}`)
    if (scope) queryParts.push(`scope=${scope}`)
    if (governorate) queryParts.push(`governorate=${encodeURIComponent(governorate)}`)
    if (area) queryParts.push(`area=${encodeURIComponent(area)}`)
    if (assignment) queryParts.push(`assignment=${assignment}`)
    if (sla_status) queryParts.push(`sla_status=${sla_status}`)
    
    queryParts.push(`sort_by=${field}`)
    queryParts.push(`sort_dir=${nextDir}`)
    
    return `/${locale}/staff/queue?${queryParts.join('&')}`
  }

  const renderSortableHeader = (field: string, label: string) => {
    const isCurrent = sortBy === field
    const arrow = isCurrent ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'
    return (
      <th style={{ padding: 0 }}>
        <Link 
          href={getSortLink(field)} 
          className="sort-header-link"
          style={{ 
            display: 'block', 
            padding: '1.25rem 0.75rem', 
            color: isCurrent ? '#f7d46b' : 'rgba(255,255,255,0.4)', 
            textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
          <span style={{ fontSize: '0.65rem', opacity: isCurrent ? 1 : 0.25, marginInlineStart: '4px' }}>
            {arrow}
          </span>
        </Link>
      </th>
    )
  }

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

  const isReviewer = permissions.canReviewIntake
  const isResearcher = permissions.canResearch
  const isFieldAgent = permissions.canSourceOffline
  const isReporter = permissions.canReport

  const canViewOperations = permissions.isAdmin || isResearcher || isFieldAgent || isReporter

  const canAccessQueue = isReviewer || canViewOperations
  if (!canAccessQueue) {
    redirect(`/${locale}/staff/dashboard`)
  }

  let activeView: 'intake' | 'operations' | 'ready' | 'completed' | 'issues' | 'rejected' | 'archived' | undefined =
    view === 'intake' ? 'intake' : 
    view === 'operations' ? 'operations' : 
    view === 'ready' ? 'ready' :
    view === 'completed' ? 'completed' :
    view === 'issues' ? 'issues' :
    view === 'rejected' ? 'rejected' :
    view === 'archived' ? 'archived' : undefined

  if (!activeView) {
    if (isReviewer) activeView = 'intake'
    else if (canViewOperations) activeView = 'operations'
    else activeView = 'intake'
  }

  if (activeView === 'intake' && !isReviewer) {
    if (canViewOperations) activeView = 'operations'
  } else if (activeView === 'operations' && !canViewOperations) {
    if (isReviewer) activeView = 'intake'
  }

  // --- DEFAULT FILTERS ---
  // For reviewers in intake, default to 'no_decision_yet' if no decision filter is specified
  const effectiveDecision = decision || ((!permissions.isAdmin && activeView === 'intake') ? 'no_decision_yet' : undefined)

  // Fetch all necessary data in parallel
  const [allRowsRaw, globalStats, personalStats, assignableReviewers, slaMonitoring, queueMetrics] = await Promise.all([
    activeView === 'intake'
      ? (getIntakeQueueRequests(permissions.isAdmin ? undefined : staffMember.id) as unknown as Promise<QueueRow[]>)
      : activeView === 'ready'
        ? (getReadyQueueRequests() as unknown as Promise<QueueRow[]>)
        : activeView === 'completed'
          ? (getCompletedQueueRequests() as unknown as Promise<QueueRow[]>)
          : activeView === 'issues'
            ? (getIssuesQueueRequests() as unknown as Promise<QueueRow[]>)
            : activeView === 'rejected'
              ? (getRejectedQueueRequests() as unknown as Promise<QueueRow[]>)
              : activeView === 'archived'
                ? (getArchivedRequestsAdmin() as unknown as Promise<QueueRow[]>)
                : (getOperationsQueueRequests() as unknown as Promise<QueueRow[]>),
    getAdminGlobalStats(undefined, user.id), // Global counts for breadcrumbs
    getAdminGlobalStats(staffMember.id, user.id), // Personal counts
    permissions.isAdmin ? getAssignableReviewers() : Promise.resolve([]),
    getActiveSlaMonitoring(),
    getQueuePerformanceMetrics()
  ])

  // --- STRICT MODE AUTHORIZATION ---
  // Reviewers see ONLY their assigned intake requests
  // Admins see everything
  let allRows = allRowsRaw
  if (!permissions.isAdmin && activeView === 'intake') {
    allRows = allRowsRaw.filter(r => r.assigned_reviewer_staff_id === staffMember.id)
  }

  // Join SLA monitoring data
  const rowsWithSla = allRows.map(row => {
    const sla = slaMonitoring.find(s => s.request_id === row.request_id);
    return {
      ...row,
      sla_monitoring: sla || null,
      is_sla_monitored: !!sla
    };
  });

  const normalizedGovernorate = governorate?.trim().toLowerCase() || ''
  const normalizedArea = area?.trim().toLowerCase() || ''

  const filteredRows = rowsWithSla.filter((row) => {
    if (activeView === 'operations' && !permissions.isAdmin) {
      const isOnlyResearcher = isResearcher && !isFieldAgent
      const isOnlyFieldAgent = isFieldAgent && !isResearcher

      if (isOnlyResearcher && row.search_scope === 'offline_only') return false
      if (isOnlyFieldAgent && row.search_scope === 'online_only') return false
    }

    if (urgency && urgency !== 'all' && row.urgency_level !== urgency) return false

    if (activeView === 'intake') {
      if (stage && stage !== 'all' && row.intake_stage !== stage) return false

      if (effectiveDecision && effectiveDecision !== 'all') {
        if (effectiveDecision === 'no_decision_yet') {
          if (row.reviewer_decision !== null) return false
        } else if (row.reviewer_decision !== effectiveDecision) {
          return false
        }
      }
      if (assignment && assignment !== 'all') {
        if (assignment === 'unassigned') {
          if (row.reviewer_assignment_status !== 'unassigned') return false
        } else if (assignment === 'assigned') {
          if (row.reviewer_assignment_status !== 'assigned') return false
        }
      }
    }

    if (activeView === 'operations') {
      if (scope && scope !== 'all' && row.search_scope !== scope) return false

      if (normalizedGovernorate) {
        const rowGov = (row.preferred_governorate || '').trim().toLowerCase()
        if (!rowGov || !rowGov.includes(normalizedGovernorate)) return false
      }

      if (normalizedArea) {
        const rowArea = (row.preferred_area || '').trim().toLowerCase()
        if (!rowArea || !rowArea.includes(normalizedArea)) return false
      }
    }

    if (status && status !== 'all' && row.current_status !== status) return false

    if (sla_status && sla_status !== 'all' && row.sla_monitoring?.sla_status !== sla_status) return false

    return true
  })

  const sortedRows = [...filteredRows].sort((a, b) => {
    let comparison = 0

    if (sortBy === 'sla') {
      // SLA Prioritized Sorting
      if (a.is_sla_monitored !== b.is_sla_monitored) {
        comparison = a.is_sla_monitored ? -1 : 1;
      } else if (a.is_sla_monitored && b.is_sla_monitored) {
        const aBreach = a.sla_monitoring?.time_to_breach_hours ?? Infinity;
        const bBreach = b.sla_monitoring?.time_to_breach_hours ?? Infinity;
        comparison = aBreach - bBreach;
      }
    } else if (sortBy === 'created_at') {
      const tA = new Date(a.request_created_at).getTime()
      const tB = new Date(b.request_created_at).getTime()
      comparison = tA - tB
    } else if (sortBy === 'code') {
      comparison = (a.request_code || '').localeCompare(b.request_code || '')
    } else if (sortBy === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '')
    } else if (sortBy === 'urgency') {
      comparison = urgencyRank(a.urgency_level) - urgencyRank(b.urgency_level)
    } else if (sortBy === 'stage') {
      comparison = stageRank(a.intake_stage) - stageRank(b.intake_stage)
    } else if (sortBy === 'status') {
      comparison = (a.current_status || '').localeCompare(b.current_status || '')
    } else if (sortBy === 'customer') {
      comparison = (a.customer_name || '').localeCompare(b.customer_name || '')
    } else if (sortBy === 'kind') {
      comparison = (a.request_kind || '').localeCompare(b.request_kind || '')
    }

    if (comparison === 0) {
      // Default fallback
      return new Date(b.request_created_at).getTime() - new Date(a.request_created_at).getTime()
    }

    return sortDir === 'asc' ? comparison : -comparison
  })

  const pendingAiCount = globalStats.pendingAI
  const pendingStaffCount = globalStats.pendingIntake
  const reviewedCount = globalStats.completedCount

  const hasActiveFilters = Boolean(
    (urgency && urgency !== 'all') ||
    (stage && stage !== 'all') ||
    (decision && decision !== 'all') ||
    (status && status !== 'all') ||
    (scope && scope !== 'all') ||
    (sla_status && sla_status !== 'all') ||
    normalizedGovernorate ||
    normalizedArea
  )

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="queue-page animate-in" data-testid="staff-queue-page">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .queue-page {
              width: 100%;
              max-width: 1400px;
              margin: 0 auto;
              padding-inline: 1rem;
            }

            .view-switcher {
              display: flex;
              gap: 0.75rem;
              margin-block-end: 2.5rem;
              overflow-x: auto;
              padding-block-end: 0.5rem;
              scrollbar-width: none;
            }
            .view-switcher::-webkit-scrollbar { display: none; }

            .stats-container {
              display: flex;
              flex-direction: column;
              gap: 2rem;
              margin-block-end: 2.5rem;
            }

            .stats-section {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }

            .stats-section-title {
              font-size: 0.75rem;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: rgba(255,255,255,0.4);
              padding-inline-start: 0.5rem;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }

            @media (min-width: 768px) {
              .stats-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }

            @media (min-width: 1200px) {
              .stats-grid.primary-grid {
                grid-template-columns: repeat(6, 1fr);
              }
              .stats-grid.sla-grid {
                grid-template-columns: repeat(3, 1fr);
                max-width: 600px;
              }
            }

            .stat-card {
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 16px;
              padding: 0.85rem 1rem;
              transition: all 0.3s ease;
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
              position: relative;
              overflow: hidden;
            }

            .stat-card:hover {
              background: rgba(255,255,255,0.05);
              border-color: rgba(255,255,255,0.12);
              transform: translateY(-2px);
            }

            .stat-label {
              font-size: 0.7rem;
              font-weight: 800;
              color: rgba(255,255,255,0.5);
              text-transform: uppercase;
              letter-spacing: 0.02em;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .stat-value {
              font-size: 1.5rem;
              font-weight: 900;
              color: white;
              line-height: 1;
            }

            .stat-help-icon {
              position: absolute;
              top: 0.75rem;
              right: 0.75rem;
              font-size: 0.7rem;
              opacity: 0.3;
              cursor: help;
            }

            .sla-on-track { color: #22c55e; }
            .sla-at-risk { color: #facc15; }
            .sla-breached { color: #ef4444; }

            .crumb-link {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              padding: 0 1.5rem;
              border-radius: 16px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(255,255,255,0.6);
              text-decoration: none;
              font-weight: 700;
              font-size: 0.9rem;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              white-space: nowrap;
            }

            .crumb-link:hover {
              background: rgba(255,255,255,0.06);
              color: #fff;
              border-color: rgba(255,255,255,0.2);
            }

            .crumb-link.active-view {
              background: rgba(212,166,60,0.1);
              border-color: var(--accent);
              color: var(--accent);
              box-shadow: 0 0 20px rgba(212,166,60,0.05);
            }

            .queue-hero {
              text-align: start;
              margin-block-end: 3rem;
            }

            .queue-title {
              font-size: clamp(2rem, 5vw, 3.5rem);
              font-weight: 900;
              margin: 0 0 1rem;
              letter-spacing: -0.03em;
              line-height: 1.1;
              color: white;
            }

            .queue-desc {
              font-size: 1.1rem;
              color: rgba(255,255,255,0.5);
              line-height: 1.6;
              max-width: 800px;
              margin: 0;
            }

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
              gap: 1.25rem;
              margin-block-end: 3rem;
            }

            .stat-card {
              background: rgba(255,255,255,0.02);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 24px;
              padding: 1.75rem;
              backdrop-filter: blur(10px);
              transition: transform 0.3s ease, border-color 0.3s ease;
            }
            
            .stat-card:hover {
              border-color: rgba(212,166,60,0.2);
              background: rgba(255,255,255,0.03);
            }

            .stat-label {
              font-size: 0.75rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: rgba(255,255,255,0.4);
              margin-block-end: 0.75rem;
              font-weight: 800;
            }

            .stat-value {
              font-size: 2.5rem;
              font-weight: 900;
              line-height: 1;
              color: white;
            }

            .filter-bar {
              background: rgba(255,255,255,0.02);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 24px;
              padding: 2rem;
              margin-block-end: 2.5rem;
            }

            .filter-form {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 1.5rem;
              align-items: flex-end;
            }

            .filter-group {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }

            .filter-label {
              font-size: 0.7rem;
              font-weight: 800;
              color: rgba(255,255,255,0.3);
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }

            .filter-select,
            .filter-input {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 14px;
              color: #fff;
              padding: 0.85rem 1rem;
              font-size: 0.95rem;
              font-weight: 600;
              outline: none;
              transition: all 0.2s ease;
            }

            .filter-select option {
              background: #0f172a;
              color: #ffffff;
            }

            .filter-select:focus,
            .filter-input:focus {
              border-color: var(--accent);
              background: rgba(255,255,255,0.06);
            }

            .filter-actions {
              display: flex;
              gap: 1rem;
              justify-content: flex-end;
              grid-column: 1 / -1;
              margin-block-start: 0.5rem;
            }

            .btn-apply {
              background: var(--accent);
              color: #000;
              padding: 0.85rem 2.5rem;
              border-radius: 14px;
              font-weight: 900;
              cursor: pointer;
              transition: all 0.3s ease;
              border: none;
            }
            .btn-apply:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(212,166,60,0.2); }

            .btn-reset {
              background: rgba(255,255,255,0.05);
              color: rgba(255,255,255,0.6);
              padding: 0.85rem 2rem;
              border-radius: 14px;
              font-weight: 800;
              text-decoration: none;
              border: 1px solid rgba(255,255,255,0.1);
              transition: all 0.2s ease;
            }
            .btn-reset:hover { background: rgba(255,255,255,0.1); color: #fff; }

            .queue-shell {
              background: rgba(255,255,255,0.015);
              border: 1px solid rgba(255,255,255,0.05);
              border-radius: 32px;
              padding: 0;
              overflow: hidden;
              margin-block-end: 4rem;
            }

            .queue-head {
              padding: 2rem;
              border-block-end: 1px solid rgba(255,255,255,0.05);
              background: rgba(255,255,255,0.01);
            }

            .queue-head-title {
              font-size: 1.5rem;
              font-weight: 900;
              color: white;
            }

            .queue-head-sub {
              color: rgba(255,255,255,0.4);
              font-size: 0.95rem;
              margin-block-start: 0.5rem;
            }

            .table-wrap {
              overflow-x: auto;
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.1) transparent;
            }

            .queue-table {
              width: 100%;
              border-collapse: collapse;
              min-width: 1000px;
            }

            .queue-table th {
              text-align: start;
              font-size: 0.65rem;
              text-transform: uppercase;
              letter-spacing: 0.1rem;
              color: rgba(255,255,255,0.3);
              padding: 0.85rem 0.6rem;
              background: rgba(255,255,255,0.02);
              font-weight: 900;
            }

            .queue-table td {
              padding: 0.85rem 0.6rem;
              border-block-end: 1px solid rgba(255,255,255,0.03);
              vertical-align: middle;
              font-size: 0.78rem;
            }

            .queue-table tr:hover td {
              background: rgba(255,255,255,0.01);
            }

            .sort-header-link {
              transition: all 0.2s ease;
            }
            .sort-header-link:hover {
              background: rgba(255,255,255,0.04);
              color: #f7d46b !important;
            }

            .subtext {
              color: rgba(255,255,255,0.4);
              font-size: 0.85rem;
              line-height: 1.5;
            }

            .empty-box {
              padding: 5rem 2rem;
              text-align: center;
              color: rgba(255,255,255,0.3);
              font-size: 1.1rem;
              font-style: italic;
            }

            @media (max-width: 768px) {
              .queue-page { padding-inline: 0.5rem; }
              .queue-hero { text-align: center; }
              .queue-desc { margin: 0 auto; }
              .filter-bar { padding: 1.25rem; }
              .stat-card { padding: 1.25rem; }
              .stat-value { font-size: 2rem; }
              
              .desktop-view { display: none; }
              .mobile-view { display: block; }
            }

            .archive-redirection-banner {
              margin-block-end: 2.5rem;
              background: rgba(212, 166, 60, 0.05);
              border: 1px solid rgba(212, 166, 60, 0.2);
              border-radius: 24px;
              padding: 1.5rem 2rem;
              backdrop-filter: blur(10px);
              animation: slideDown 0.4s ease-out;
            }
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .banner-content {
              display: flex;
              align-items: center;
              gap: 1.5rem;
              flex-wrap: wrap;
            }
            .banner-icon { font-size: 2rem; }
            .banner-text { flex: 1; min-width: 280px; }
            .banner-text h3 { margin: 0 0 0.5rem; font-size: 1.2rem; font-weight: 900; color: var(--accent); }
            .banner-text p { margin: 0; font-size: 0.95rem; color: rgba(255,255,255,0.7); line-height: 1.5; }
            .banner-action-btn {
              background: var(--accent);
              color: #000;
              padding: 0.75rem 1.5rem;
              border-radius: 12px;
              font-weight: 900;
              text-decoration: none;
              font-size: 0.9rem;
              transition: all 0.3s ease;
              white-space: nowrap;
            }
            .banner-action-btn:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(212,166,60,0.3); }

            @media (min-width: 769px) {
              .desktop-view { display: block; }
              .mobile-view { display: none; }
            }

            .mobile-cards {
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
              padding: 1rem 0;
            }

            .mobile-card {
              background: rgba(255,255,255,0.02);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 24px;
              padding: 1.5rem;
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
              backdrop-filter: blur(10px);
            }

            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 1rem;
            }

            .card-code {
              font-size: 1rem;
              font-weight: 900;
              color: var(--accent);
              text-decoration: none;
            }

            .card-body {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }

            .card-title {
              font-size: 1.1rem;
              font-weight: 800;
              color: white;
              line-height: 1.3;
            }

            .card-customer {
              font-size: 0.85rem;
              font-weight: 600;
              color: rgba(255,255,255,0.5);
            }

            .card-badges {
              display: flex;
              flex-wrap: wrap;
              gap: 0.5rem;
              margin-top: 0.25rem;
            }

            .card-footer {
              display: flex;
              flex-direction: column;
              gap: 1rem;
              padding-top: 1.25rem;
              border-top: 1px solid rgba(255,255,255,0.05);
            }

            .card-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 0.75rem;
              color: rgba(255,255,255,0.4);
              font-weight: 600;
            }

            .card-actions {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }
          `,
        }}
      />

      <div className="view-switcher">
        <Link
          href={`/${locale}/staff/queue?view=intake`}
          className={`crumb-link ${activeView === 'intake' ? 'active-view' : ''}`}
          data-testid="queue-view-intake"
        >
          {dict.staff_queue.view_intake} ({permissions.isAdmin ? globalStats.pendingIntake : personalStats.pendingIntake})
        </Link>

        {canViewOperations && (
          <Link
            href={`/${locale}/staff/queue?view=operations`}
            className={`crumb-link ${activeView === 'operations' ? 'active-view' : ''}`}
          >
            {dict.staff_queue.view_operations} ({globalStats.inOperations})
          </Link>
        )}

        {canViewOperations && (
          <Link
            href={`/${locale}/staff/queue?view=ready`}
            className={`crumb-link ${activeView === 'ready' ? 'active-view' : ''}`}
            data-testid="queue-view-ready"
          >
            {dict.staff_queue.view_ready} ({globalStats.readyToRelease})
          </Link>
        )}

        <Link 
          href={`/${locale}/staff/queue?view=completed`}
          className={`crumb-link ${activeView === 'completed' ? 'active-view' : ''}`}
          data-testid="queue-view-completed"
        >
          {dict.staff_queue.view_completed} ({globalStats.completedCount})
        </Link>

        <Link 
          href={`/${locale}/staff/queue?view=issues`}
          className={`crumb-link ${activeView === 'issues' ? 'active-view' : ''}`}
          data-testid="queue-view-issues"
        >
          {dict.staff_queue.view_issues} ({globalStats.issuesCount})
        </Link>

        <Link 
          href={`/${locale}/staff/queue?view=rejected`}
          className={`crumb-link ${activeView === 'rejected' ? 'active-view' : ''}`}
          data-testid="queue-view-rejected"
        >
          {isRTL ? 'المرفوضة' : 'Rejected'} ({globalStats.rejectedCount})
        </Link>

        {permissions.isAdmin && (
          <Link
            href={`/${locale}/staff/queue?view=archived`}
            className={`crumb-link ${activeView === 'archived' ? 'active-view' : ''}`}
            data-testid="queue-view-archived"
          >
            {dict.staff_queue.view_archive} ({globalStats.archivedCount})
          </Link>
        )}
      </div>

      <section className="queue-hero">
        <h1 className="queue-title">
          {activeView === 'intake'
            ? dict.staff_queue.title
            : permissions.isAdmin || isReporter
              ? (locale === 'ar' ? 'قائمة العمليات' : 'Operational Queue')
              : isResearcher
                ? (locale === 'ar' ? 'نتائج البحث أونلاين' : 'Online Research Queue')
                : (locale === 'ar' ? 'عروض أسعار الأسواق المحلية' : 'Local Sourcing Queue')}
        </h1>

        <p className="queue-desc">
          {activeView === 'intake'
            ? (locale === 'ar' ? 'هذه شاشة التشغيل الأساسية للمراجع. افتح أي طلب للدخول إلى صفحة المراجعة واتخاذ القرار.' : 'This is the reviewer operating screen. Open any request to enter the review workspace and make a decision.')
            : activeView === 'archived'
              ? (locale === 'ar' ? 'قائمة الطلبات المؤرشفة. يمكنك استعادة أي طلب للعودة إلى مسار العمل النشط.' : 'List of archived requests. You can restore any request to bring it back to the active workflow.')
              : (locale === 'ar' ? 'شاشة العمليات الميدانية والبحث. قم بإضافة النتائج والعروض الفنية لكل طلب معتمد.' : 'Operational workspace for research and sourcing. Add findings and technical quotes for approved requests.')}
        </p>

        <div className="mt-8">
          <QueuePerformanceMetrics metrics={queueMetrics} dict={dict} locale={locale} />
        </div>
      </section>

      {activeView === 'archived' && permissions.isAdmin && (
        <div className="archive-redirection-banner">
           <div className="banner-content">
              <span className="banner-icon">🛠️</span>
              <div className="banner-text">
                <h3>{locale === 'ar' ? 'مركز الأرشفة والتنظيف الموحد' : 'Unified Archive & Cleanup Center'}</h3>
                <p>
                  {locale === 'ar' 
                    ? 'تم نقل جميع أدوات إدارة الأرشيف والنسخ الاحتياطي والحذف الآمن إلى الصفحة المخصصة.' 
                    : 'All archive management, backup, and safe deletion tools have been moved to the dedicated dashboard.'}
                </p>
              </div>
              <Link 
                href={`/${locale}/staff/archive?status=ARCHIVED`}
                className="banner-action-btn"
              >
                {locale === 'ar' ? 'انتقل للمركز الموحد' : 'Go to Cleanup Center'}
              </Link>
           </div>
        </div>
      )}

      <div className="stats-container">
        <section className="stats-section">
          <div className="stats-section-title">
             <span>{locale === 'ar' ? 'المؤشرات التشغيلية' : 'Operational KPIs'}</span>
          </div>
          <div className="stats-grid primary-grid">
            <Link href={`/${locale}/staff/queue?view=intake`} className="stat-card" title={isRTL ? "إجمالي الطلبات النشطة قيد المراجعة أو العمل" : "Total active requests currently in review or operations"}>
              <div className="stat-label">{dict.staff_queue.stat_total_requests}</div>
              <div className="stat-value">{globalStats.activeTotal}</div>
              <div className="stat-help-icon">ⓘ</div>
            </Link>

            {activeView === 'intake' ? (
              <>
                <Link href={`/${locale}/staff/queue?view=intake&stage=pending_ai_review`} className="stat-card" title={isRTL ? "طلبات بانتظار تحليل الذكاء الاصطناعي" : "Requests waiting for AI intake analysis"}>
                  <div className="stat-label">{locale === 'ar' ? 'بانتظار الـ AI' : 'Pending AI'}</div>
                  <div className="stat-value" style={{ color: '#3b82f6' }}>{globalStats.pendingAI}</div>
                  <div className="stat-help-icon">ⓘ</div>
                </Link>

                <Link href={`/${locale}/staff/queue?view=intake&stage=pending_staff_review`} className="stat-card" title={isRTL ? "طلبات بانتظار مراجعة الموظف" : "Requests waiting for staff manual review"}>
                  <div className="stat-label">{dict.staff_queue.stat_pending_staff}</div>
                  <div className="stat-value">{globalStats.pendingIntake}</div>
                  <div className="stat-help-icon">ⓘ</div>
                </Link>

                <div className="stat-card" title={isRTL ? "طلبات تمت معالجتها بواسطة الذكاء الاصطناعي" : "Requests successfully processed by AI agents"}>
                  <div className="stat-label">{locale === 'ar' ? 'AI مكتمل' : 'AI Completed'}</div>
                  <div className="stat-value" style={{ color: '#22c55e' }}>{globalStats.aiCompleted}</div>
                  <div className="stat-help-icon">ⓘ</div>
                </div>

                <div className="stat-card" title={isRTL ? "الطلبات التي أنجزها الموظفون اليوم" : "Requests handled by staff members today"}>
                  <div className="stat-label">{dict.staff_queue.staff_completed_today}</div>
                  <div className="stat-value" style={{ color: '#d4a63c' }}>{globalStats.staffCompletedToday}</div>
                  <span className="stat-help-icon">ⓘ</span>
                </div>

                <Link href={`/${locale}/staff/queue?view=ready`} className="stat-card" title={isRTL ? "طلبات جاهزة للنشر للعميل" : "Requests finalized and ready for customer release"}>
                  <div className="stat-label">{dict.staff_queue.customer_ready}</div>
                  <div className="stat-value" style={{ color: '#8b5cf6' }}>{globalStats.readyToRelease}</div>
                  <span className="stat-help-icon">ⓘ</span>
                </Link>
              </>
            ) : (
              <>
                <Link href={`/${locale}/staff/queue?view=operations&status=in_progress`} className="stat-card">
                  <div className="stat-label">{dict.staff_queue.stat_in_progress}</div>
                  <div className="stat-value">
                    {sortedRows.filter((r) => r.current_status === 'in_progress').length}
                  </div>
                </Link>

                <Link href={`/${locale}/staff/queue?view=operations&scope=online_only`} className="stat-card">
                  <div className="stat-label">{dict.staff_queue.stat_online_scope}</div>
                  <div className="stat-value">
                    {
                      sortedRows.filter(
                        (r) =>
                          r.search_scope === 'online_only' ||
                          r.search_scope === 'online_and_offline'
                      ).length
                    }
                  </div>
                </Link>

                <Link href={`/${locale}/staff/queue?view=operations&scope=offline_only`} className="stat-card">
                  <div className="stat-label">{dict.staff_queue.stat_offline_scope}</div>
                  <div className="stat-value">
                    {
                      sortedRows.filter(
                        (r) =>
                          r.search_scope === 'offline_only' ||
                          r.search_scope === 'online_and_offline'
                      ).length
                    }
                  </div>
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="stats-section">
          <div className="stats-section-title">
             <span>{dict.sla.sla_guide_title || (locale === 'ar' ? 'الالتزام بالوقت' : 'SLA Health')}</span>
          </div>
          <div className="stats-grid sla-grid">
            <Link 
              href={`/${locale}/staff/queue?view=${activeView}&sla_status=on_track`} 
              className={`stat-card ${sla_status === 'on_track' ? 'active-view' : ''}`}
              title={dict.sla.sla_on_track_desc}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              <div className="stat-label sla-on-track">{dict.sla.metrics_on_track}</div>
              <div className="stat-value">{globalStats.slaOnTrack}</div>
              <div className="stat-help-icon">ⓘ</div>
            </Link>
            <Link 
              href={`/${locale}/staff/queue?view=${activeView}&sla_status=at_risk`} 
              className={`stat-card ${sla_status === 'at_risk' ? 'active-view' : ''}`}
              title={dict.sla.sla_at_risk_desc}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              <div className="stat-label sla-at-risk">{dict.sla.metrics_at_risk}</div>
              <div className="stat-value">{globalStats.slaAtRisk}</div>
              <div className="stat-help-icon">ⓘ</div>
            </Link>
            <Link 
              href={`/${locale}/staff/queue?view=${activeView}&sla_status=breached`} 
              className={`stat-card ${sla_status === 'breached' ? 'active-view' : ''}`}
              title={dict.sla.sla_breached_desc}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              <div className="stat-label sla-breached">{dict.sla.metrics_breached}</div>
              <div className="stat-value">{globalStats.slaBreached}</div>
              <div className="stat-help-icon">ⓘ</div>
            </Link>
          </div>
        </section>
      </div>

      <div className="filter-bar">
        <form method="GET" className="filter-form">
          <input type="hidden" name="view" value={activeView} />

          <div className="filter-group">
            <label className="filter-label">{dict.staff_queue.filter_urgency}</label>
            <select name="urgency" className="filter-select" defaultValue={urgency || 'all'}>
              <option value="all">{dict.staff_queue.filter_all}</option>
              <option value="urgent">{formatUrgency('urgent', locale)}</option>
              <option value="high">{formatUrgency('high', locale)}</option>
              <option value="normal">{formatUrgency('normal', locale)}</option>
            </select>
          </div>

          {activeView === 'intake' ? (
            <>
              <div className="filter-group">
                <label className="filter-label">{dict.staff_queue.filter_stage}</label>
                <select name="stage" className="filter-select" defaultValue={stage || 'all'}>
                  <option value="all">{dict.staff_queue.filter_all}</option>
                  <option value="pending_ai_review">{formatStage('pending_ai_review', locale)}</option>
                  <option value="pending_staff_review">{formatStage('pending_staff_review', locale)}</option>
                  <option value="staff_reviewed">{formatStage('staff_reviewed', locale)}</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">{dict.staff_queue.filter_decision}</label>
                <select
                  name="decision"
                  className="filter-select"
                  defaultValue={decision || 'all'}
                >
                  <option value="all">{dict.staff_queue.filter_all}</option>
                  <option value="no_decision_yet">{dict.staff_queue.filter_no_decision}</option>
                  <option value="approve">{formatDecision('approve', locale)}</option>
                  <option value="reject">{formatDecision('reject', locale)}</option>
                  <option value="needs_clarification">{formatDecision('needs_clarification', locale)}</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="filter-group">
                <label className="filter-label">{dict.staff_queue.filter_search_scope}</label>
                <select name="scope" className="filter-select" defaultValue={scope || 'all'}>
                  <option value="all">{dict.staff_queue.filter_all}</option>
                  <option value="online_only">{dict.staff_queue.scope_online}</option>
                  <option value="offline_only">{dict.staff_queue.scope_offline}</option>
                  <option value="online_and_offline">{dict.staff_queue.scope_both}</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">{dict.staff_queue.filter_governorate}</label>
                <input
                  name="governorate"
                  className="filter-input"
                  placeholder="..."
                  defaultValue={governorate || ''}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">{dict.staff_queue.filter_area}</label>
                <input
                  name="area"
                  className="filter-input"
                  placeholder="..."
                  defaultValue={area || ''}
                />
              </div>
            </>
          )}

          <div className="filter-group">
            <label className="filter-label">{dict.staff_queue.filter_status}</label>
            <select name="status" className="filter-select" defaultValue={status || 'all'}>
              <option value="all">{dict.staff_queue.filter_all}</option>
              <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
              <option value="submitted">{locale === 'ar' ? 'تم الإرسال' : 'Submitted'}</option>
              <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
              <option value="client_ready">{locale === 'ar' ? 'جاهز للعميل' : 'Client Ready'}</option>
              <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
            </select>
          </div>

          <div className="filter-actions">
            <Link href={`/${locale}/staff/queue?view=${activeView}`} className="btn-reset" data-testid="queue-filter-reset">
              {dict.staff_queue.reset_filters}
            </Link>

            <button type="submit" className="btn-apply" data-testid="queue-filter-submit">
              {dict.staff_queue.btn_apply}
            </button>
          </div>
        </form>
      </div>

      <section className="queue-shell">
        <div className="queue-head">
          <div>
            <div className="queue-head-title">
              {activeView === 'intake'
                ? (locale === 'ar' ? 'قائمة مراجعة الطلبات الجديدة' : 'Intake Queue')
                : activeView === 'operations'
                  ? (locale === 'ar' ? 'قائمة التوريد والبحث النشط' : 'Active Operations')
                  : activeView === 'ready'
                    ? (locale === 'ar' ? 'طلبات جاهزة للنشر والتحرير' : 'Ready for Release')
                    : activeView === 'completed'
                      ? (locale === 'ar' ? 'الطلبات المكتملة' : 'Completed Requests')
                      : activeView === 'issues'
                        ? (locale === 'ar' ? 'طلبات تحتاج مراجعة (Issues)' : 'Requests with Issues')
                        : (locale === 'ar' ? 'الأرشيف الإداري' : 'Administrative Archive')}
            </div>

            <div className="queue-head-sub">
              {activeView === 'intake'
                ? (locale === 'ar' ? 'يرجى مراجعة بيانات العميل وقبول أو رفض الطلب للبدء.' : 'Review customer data and approve or reject the request to start.')
                : activeView === 'operations'
                  ? (locale === 'ar' ? 'طلبات قيد البحث الأونلاين والميداني لتوفير أفضل العروض.' : 'Requests undergoing online and field sourcing for the best deals.')
                  : activeView === 'ready'
                    ? (locale === 'ar' ? 'طلبات تم توفير عروضها وبانتظار المراجعة النهائية والنشر.' : 'Quotes collected, waiting for final review and release.')
                    : activeView === 'completed'
                      ? (locale === 'ar' ? 'سجل الطلبات التي تم الانتهاء منها وإغلاقها.' : 'History of requests that have been fully closed.')
                      : activeView === 'issues'
                        ? (locale === 'ar' ? 'الطلبات المرفوضة أو التي تحتاج توضيح من العميل.' : 'Rejected requests or those needing customer clarification.')
                        : (locale === 'ar' ? 'سجل الطلبات المؤرشفة لأسباب إدارية.' : 'History of requests archived for administrative reasons.')}
            </div>
          </div>
        </div>

        {sortedRows.length === 0 ? (
          <div className="empty-box">
            {hasActiveFilters
              ? (locale === 'ar' ? 'لا توجد طلبات تطابق الفلاتر المختارة.' : 'No requests match the selected filters.')
              : dict.staff_queue.empty}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="mobile-view">
              <div className="mobile-cards">
                {sortedRows.map((row) => {
                  const urgencyClass =
                    row.urgency_level === 'urgent' ? 'badge-red' : 
                    row.urgency_level === 'high' ? 'badge-gold' : 'badge-muted'

                  const decisionClass =
                    row.reviewer_decision === 'approve' ? 'badge-green' : 
                    row.reviewer_decision === 'reject' ? 'badge-red' : 
                    row.reviewer_decision === 'needs_clarification' ? 'badge-gold' : 'badge-muted'

                  return (
                    <div key={row.request_id} className="mobile-card">
                      <div className="card-header">
                        <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="card-code">
                          {row.request_code}
                        </Link>
                        <div className="card-badges">
                           <span className={`badge ${urgencyClass}`}>
                            {formatUrgency(row.urgency_level, locale)}
                          </span>
                          {row.is_sla_monitored && row.sla_monitoring && (
                            <SlaStatusBadge 
                              status={row.sla_monitoring.sla_status} 
                              label={dict.sla[`status_${row.sla_monitoring.sla_status}`]} 
                            />
                          )}
                        </div>
                      </div>

                      <div className="card-body">
                        <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="card-title no-underline">
                          {row.title || '-'}
                        </Link>
                        <div className="card-customer">{row.customer_name || '-'}</div>
                        
                        <div className="card-badges">
                          {activeView === 'intake' ? (
                            <>
                              <span className="badge badge-blue">
                                {formatStage(row.intake_stage, locale)}
                              </span>
                              <span className={`badge ${decisionClass}`}>
                                {formatDecision(row.reviewer_decision, locale)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="badge badge-muted text-10">
                                {formatScope(row.search_scope, locale)}
                              </span>
                              <span className="badge badge-muted">
                                {row.current_status || '-'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="card-footer">
                        <div className="card-meta">
                          <span>{formatDate(row.request_created_at, locale)}</span>
                          {activeView === 'intake' && (
                             <div className="font-black text-accent text-xs" style={{ fontSize: '10px' }}>
                                {row.assigned_reviewer_name || (locale === 'ar' ? 'غير مكلف' : 'Unassigned')}
                             </div>
                          )}
                        </div>

                        <div className="card-actions">
                          {activeView !== 'archived' ? (
                            <>
                              <Link href={`/${locale}/staff/workspace/${row.request_id}`}>
                                <button className="btn-accent text-xs py-2 px-4 w-full">
                                  {dict.staff_queue.btn_open_review}
                                </button>
                              </Link>
                              
                              {permissions.isAdmin && (
                                <form action={handleArchiveRequest} className="flex gap-1">
                                  <input type="hidden" name="requestId" value={row.request_id} />
                                  <input type="hidden" name="locale" value={locale} />
                                  <input 
                                    name="reason" 
                                    placeholder="..."
                                    className="select-small px-2 py-1 flex-1"
                                    style={{ fontSize: '10px' }}
                                  />
                                  <button type="submit" className="btn-action-sm badge-red px-3 py-1 font-black" style={{ fontSize: '10px' }}>
                                    {dict.staff_queue.btn_archive}
                                  </button>
                                </form>
                              )}
                            </>
                          ) : (
                            permissions.isAdmin && (
                              <form action={handleRestoreRequest}>
                                <input type="hidden" name="requestId" value={row.request_id} />
                                <input type="hidden" name="locale" value={locale} />
                                <button type="submit" className="btn-action-sm badge-green px-4 py-2 text-xs font-black w-full">
                                  {dict.staff_queue.btn_restore}
                                </button>
                              </form>
                            )
                          )}
                          
                          <div className="subtext font-bold leading-tight" style={{ fontSize: '10px' }}>
                             {activeView !== 'archived' && getActionInstruction(row, activeView, permissions, locale)}
                             {activeView === 'archived' && row.archive_reason && (
                               <div className="text-red-400 mt-1 opacity-80 italic">
                                 {locale === 'ar' ? 'السبب: ' : 'Reason: '}{row.archive_reason}
                                </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-view">
              <div className="table-wrap">
                <table className="queue-table">
                  <thead>
                    <tr>
                      {renderSortableHeader('code', dict.staff_queue.table_code)}
                      {renderSortableHeader('title', dict.staff_queue.table_request)}
                      {renderSortableHeader('customer', dict.staff_queue.table_customer)}
                      {renderSortableHeader('kind', dict.staff_queue.table_kind)}
                      {renderSortableHeader('urgency', dict.staff_queue.table_urgency)}
                      {renderSortableHeader('sla', `${dict.staff_dashboard.status} / SLA`)}
                      <th>{dict.staff_queue.table_image}</th>
                      {activeView === 'intake' ? (
                        <>
                          {renderSortableHeader('stage', dict.staff_queue.table_stage)}
                          <th>{dict.staff_queue.table_assignment}</th>
                          <th>{dict.staff_queue.table_decision}</th>
                        </>
                      ) : (
                        <>
                          <th>{dict.staff_queue.table_scope}</th>
                          {renderSortableHeader('status', dict.staff_management.table_status)}
                        </>
                      )}
                      {renderSortableHeader('created_at', dict.staff_queue.table_created)}
                      <th>{dict.staff_queue.table_action}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map((row) => {
                      const urgencyClass =
                        row.urgency_level === 'urgent' ? 'badge-red' : 
                        row.urgency_level === 'high' ? 'badge-gold' : 'badge-muted'

                      const decisionClass =
                        row.reviewer_decision === 'approve' ? 'badge-green' : 
                        row.reviewer_decision === 'reject' ? 'badge-red' : 
                        row.reviewer_decision === 'needs_clarification' ? 'badge-gold' : 'badge-muted'

                      return (
                        <tr key={row.request_id} data-request-id={row.request_id}>
                          <td>
                            <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="font-black text-accent no-underline hover-underline">
                              {row.request_code}
                            </Link>
                          </td>

                          <td>
                            <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="font-black text-white no-underline hover-text-accent block mb-1">
                              {row.title || '-'}
                            </Link>
                            <div className="subtext line-clamp-1" title={row.raw_description || ''}>
                              {row.raw_description && row.raw_description.trim() !== ''
                                ? row.raw_description
                                : (locale === 'ar' ? 'بدون وصف نصي' : 'No text description')}
                            </div>
                          </td>

                          <td className="font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{row.customer_name || '-'}</td>
                          <td className="text-sm">{formatKind(row.request_kind, locale)}</td>

                          <td>
                            <span className={`badge ${urgencyClass}`}>
                              {formatUrgency(row.urgency_level, locale)}
                            </span>
                          </td>

                          <td>
                            {row.is_sla_monitored && row.sla_monitoring && (
                              <div className="flex flex-col gap-1">
                                <SlaStatusBadge 
                                  status={row.sla_monitoring.sla_status} 
                                  label={dict.sla[`status_${row.sla_monitoring.sla_status}`]} 
                                />
                                <div className="subtext font-black tracking-wider" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                                  {dict.sla.stage_age}: {row.sla_monitoring.stage_age_hours?.toFixed(1)}h
                                </div>
                              </div>
                            )}
                          </td>

                          <td>
                            <span className={row.has_reference_image ? 'text-green-400 font-black' : ''} style={{ opacity: row.has_reference_image ? 1 : 0.2 }}>
                              {row.has_reference_image ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}
                            </span>
                          </td>

                          {activeView === 'intake' ? (
                            <>
                              <td>
                                <span className="badge badge-blue">
                                  {formatStage(row.intake_stage, locale)}
                                </span>
                              </td>

                              <td>
                                {permissions.isAdmin ? (
                                  <AssignmentControls 
                                    requestId={row.request_id}
                                    locale={locale}
                                    assignableReviewers={assignableReviewers as any}
                                    currentReviewerId={row.assigned_reviewer_staff_id || null}
                                    currentReviewerName={row.assigned_reviewer_name || null}
                                    assignmentStatus={row.reviewer_assignment_status || 'unassigned'}
                                  />
                                ) : (
                                  <div className="font-black text-accent">
                                    {row.assigned_reviewer_name || (locale === 'ar' ? 'غير مكلف' : 'Unassigned')}
                                  </div>
                                )}
                              </td>

                              <td>
                                <div className="flex flex-col gap-1">
                                  <span className={`badge ${decisionClass}`}>
                                    {formatDecision(row.reviewer_decision, locale)}
                                  </span>
                                  {row.reviewer_notes && (
                                    <div className="subtext truncate" style={{ fontSize: '10px', maxWidth: '120px' }} title={row.reviewer_notes}>
                                      {row.reviewer_notes}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>
                                <span className="badge badge-muted text-10">
                                  {formatScope(row.search_scope, locale)}
                                </span>
                              </td>

                              <td>
                                <span className="badge badge-muted">
                                  {row.current_status || '-'}
                                </span>
                              </td>
                            </>
                          )}

                          <td className="text-muted text-sm whitespace-nowrap">{formatDate(row.request_created_at, locale)}</td>

                          <td>
                            <div className="flex flex-col gap-3">
                              {activeView !== 'archived' ? (
                                <>
                                  <Link href={`/${locale}/staff/workspace/${row.request_id}`}>
                                    <button className="btn-accent text-xs py-2 px-4 w-full" data-testid="queue-open-workspace">
                                      {dict.staff_queue.btn_open_review}
                                    </button>
                                  </Link>
                                  
                                  {permissions.isAdmin && (
                                    <form action={handleArchiveRequest} className="flex gap-1">
                                      <input type="hidden" name="requestId" value={row.request_id} />
                                      <input type="hidden" name="locale" value={locale} />
                                      <input 
                                        name="reason" 
                                        placeholder="..."
                                        className="select-small px-2 py-1 text-white w-16"
                                        style={{ fontSize: '10px' }}
                                      />
                                      <button type="submit" className="btn-action-sm badge-red px-2 py-1 font-black" style={{ fontSize: '10px' }} data-testid="queue-archive-request">
                                        {dict.staff_queue.btn_archive}
                                      </button>
                                    </form>
                                  )}
                                </>
                              ) : (
                                permissions.isAdmin && (
                                  <form action={handleRestoreRequest}>
                                    <input type="hidden" name="requestId" value={row.request_id} />
                                    <input type="hidden" name="locale" value={locale} />
                                    <button type="submit" className="btn-action-sm badge-green px-4 py-2 text-xs font-black w-full" data-testid="queue-restore-request">
                                      {dict.staff_queue.btn_restore}
                                    </button>
                                  </form>
                                )
                              )}
                              <div className="subtext text-10 font-bold leading-tight max-w-180">
                                 {activeView !== 'archived' && getActionInstruction(row, activeView, permissions, locale)}
                                 {activeView === 'archived' && row.archive_reason && (
                                   <div className="text-red-400 mt-1 opacity-80 italic">
                                     {locale === 'ar' ? 'السبب: ' : 'Reason: '}{row.archive_reason}
                                    </div>
                                 )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}