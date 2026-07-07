'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SlaStatusBadge } from '@/components/staff/SlaStatusBadge'
import AssignmentControls from './AssignmentControls'
import { 
  handleBulkArchiveRequests, 
  handleBulkRestoreRequests, 
  handleBulkDeleteRequests,
  handleBulkAssignReviewer 
} from './actions'

interface QueueRow {
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
  is_sla_monitored?: boolean
  sla_monitoring?: {
    sla_status: string
    stage_age_hours: number
  }
}

interface Props {
  initialRows: QueueRow[]
  activeView: string
  locale: string
  dict: any
  permissions: any
  assignableReviewers: { id: string; full_name: string | null }[]
}

export default function QueueListClient({
  initialRows,
  activeView,
  locale,
  dict,
  permissions,
  assignableReviewers
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isRTL = locale === 'ar'

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')

  // 1. Client-side Search filter
  const cleanSearch = searchQuery.toLowerCase().trim()
  const filteredRows = initialRows.filter(row => {
    const code = (row.request_code || '').toLowerCase()
    const title = (row.title || '').toLowerCase()
    const desc = (row.raw_description || '').toLowerCase()
    const customer = (row.customer_name || '').toLowerCase()

    return !cleanSearch || 
      code.includes(cleanSearch) || 
      title.includes(cleanSearch) || 
      desc.includes(cleanSearch) || 
      customer.includes(cleanSearch)
  })

  // 2. Client-side Sorting
  const sortedRows = [...filteredRows].sort((a, b) => {
    let valA: any = a[sortBy as keyof QueueRow]
    let valB: any = b[sortBy as keyof QueueRow]

    if (sortBy === 'created_at') {
      valA = new Date(a.request_created_at).getTime()
      valB = new Date(b.request_created_at).getTime()
    }

    if (valA === undefined || valA === null) valA = ''
    if (valB === undefined || valB === null) valB = ''

    if (typeof valA === 'string') {
      return sortDir === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA)
    } else {
      return sortDir === 'asc' 
        ? valA - valB 
        : valB - valA
    }
  })

  // 3. Selection Handlers
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRows.map(r => r.request_id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  // 4. Bulk Operations execution
  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return
    setShowArchiveModal(true)
  }

  const submitBulkArchive = () => {
    setShowArchiveModal(false)
    startTransition(async () => {
      await handleBulkArchiveRequests(selectedIds, archiveReason, locale)
      setArchiveReason('')
      setSelectedIds([])
      router.refresh()
    })
  }

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return
    startTransition(async () => {
      await handleBulkRestoreRequests(selectedIds, locale)
      setSelectedIds([])
      router.refresh()
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (!confirm(isRTL ? `هل أنت متأكد من حذف ${selectedIds.length} من طلبات التوريد المحددة؟` : `Are you sure you want to delete ${selectedIds.length} selected requests?`)) return
    startTransition(async () => {
      await handleBulkDeleteRequests(selectedIds, locale)
      setSelectedIds([])
      router.refresh()
    })
  }

  const handleBulkAssign = (reviewerId: string) => {
    if (selectedIds.length === 0) return
    startTransition(async () => {
      await handleBulkAssignReviewer(selectedIds, reviewerId || null, locale)
      setSelectedIds([])
      router.refresh()
    })
  }

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const getSortArrow = (field: string) => {
    if (sortBy !== field) return ' ⇅'
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  // Translation helpers
  function formatKind(kind: string | null) {
    if (isRTL) {
      if (kind === 'everyday_purchase') return 'شراء عادي'
      if (kind === 'high_value_asset') return 'أصل عالي القيمة'
      if (kind === 'project_supply') return 'توريد مشروع'
      return 'عام'
    }
    return kind || 'General'
  }

  function formatUrgency(urgency: string | null) {
    if (isRTL) {
      if (urgency === 'urgent') return 'عاجل'
      if (urgency === 'high') return 'عالي'
      return 'عادي'
    }
    return urgency || 'Normal'
  }

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
        <div className="text-slate-400 text-xs font-bold font-mono">
          {isRTL ? `تم العثور على ${filteredRows.length} طلب تصفية` : `Found ${filteredRows.length} filtered requests`}
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث برقم الطلب، الاسم، أو التفاصيل...' : 'Search by code, title, details...'}
            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-white">✕</button>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 border border-amber-500/30 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.15)] flex items-center gap-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
            <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.length}</span>
            {isRTL ? 'طلبات محددة' : 'requests selected'}
          </span>
          <div className="flex flex-wrap items-center gap-2.5 border-l border-white/10 pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
            
            {/* Reviewer Assignment Dropdown */}
            {permissions.isAdmin && activeView === 'intake' && (
              <select 
                onChange={e => handleBulkAssign(e.target.value)}
                defaultValue=""
                className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="" disabled>{isRTL ? 'تعيين جماعي لـ' : 'Bulk Assign To'}</option>
                {assignableReviewers.map(r => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
                <option value="unassign">{isRTL ? 'إلغاء التعيين' : 'Unassign'}</option>
              </select>
            )}

            {activeView !== 'archived' ? (
              <button 
                onClick={handleBulkArchive}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-1.5 text-xs font-black"
              >
                🗄️ {isRTL ? 'أرشفة جماعية' : 'Bulk Archive'}
              </button>
            ) : (
              <button 
                onClick={handleBulkRestore}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-1.5 text-xs font-black"
              >
                ↩ {isRTL ? 'استعادة جماعية' : 'Bulk Restore'}
              </button>
            )}

            <button 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-1.5 text-xs font-black"
            >
              🗑️ {isRTL ? 'حذف جماعي' : 'Bulk Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Sorting Control Header Grid */}
      <div className="flex gap-4 text-xs font-bold text-slate-500">
        <span>{isRTL ? 'ترتيب حسب:' : 'Sort By:'}</span>
        <button onClick={() => toggleSort('request_code')} className={`hover:text-white ${sortBy === 'request_code' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'رقم الطلب' : 'Code'} {getSortArrow('request_code')}
        </button>
        <button onClick={() => toggleSort('title')} className={`hover:text-white ${sortBy === 'title' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'الطلب' : 'Request'} {getSortArrow('title')}
        </button>
        <button onClick={() => toggleSort('customer_name')} className={`hover:text-white ${sortBy === 'customer_name' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'العميل' : 'Customer'} {getSortArrow('customer_name')}
        </button>
        <button onClick={() => toggleSort('created_at')} className={`hover:text-white ${sortBy === 'created_at' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'تاريخ الإنشاء' : 'Date Created'} {getSortArrow('created_at')}
        </button>
      </div>

      {/* Request list table */}
      <div className="overflow-x-auto bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl shadow-xl">
        <table className="w-full text-left border-collapse rtl:text-right">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10 text-slate-400 font-bold text-xs uppercase">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={sortedRows.length > 0 && sortedRows.every(r => selectedIds.includes(r.request_id))}
                  onChange={e => toggleSelectAll(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </th>
              <th className="p-4">{isRTL ? 'رقم الطلب' : 'Code'}</th>
              <th className="p-4">{isRTL ? 'عنوان وتفاصيل الطلب' : 'Request & Details'}</th>
              <th className="p-4">{isRTL ? 'العميل' : 'Customer'}</th>
              <th className="p-4">{isRTL ? 'نوع الخدمة' : 'Kind'}</th>
              <th className="p-4">{isRTL ? 'الأهمية' : 'Urgency'}</th>
              <th className="p-4">{isRTL ? 'تاريخ الميعاد / SLA' : 'SLA Status'}</th>
              {activeView === 'intake' && <th className="p-4">{isRTL ? 'المشرف المسؤول' : 'Assignment'}</th>}
              <th className="p-4">{isRTL ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => {
              const urgencyClass =
                row.urgency_level === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                row.urgency_level === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'

              const isSelected = selectedIds.includes(row.request_id)

              return (
                <tr key={row.request_id} className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors text-sm ${isSelected ? 'bg-amber-500/[0.02]' : ''}`}>
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={e => toggleSelect(row.request_id, e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">
                    <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="font-black text-amber-500 hover:underline">
                      {row.request_code}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="font-bold text-white block hover:text-amber-400 transition-colors">
                      {row.title || '—'}
                    </Link>
                    <span className="text-xs text-slate-500 line-clamp-1 mt-1">{row.raw_description || (isRTL ? 'بدون وصف نصي' : 'No description')}</span>
                  </td>
                  <td className="p-4 font-semibold text-slate-300">{row.customer_name || '—'}</td>
                  <td className="p-4 text-xs font-medium text-slate-400">{formatKind(row.request_kind)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${urgencyClass}`}>
                      {formatUrgency(row.urgency_level)}
                    </span>
                  </td>
                  <td className="p-4">
                    {row.is_sla_monitored && row.sla_monitoring && (
                      <div className="flex flex-col gap-1">
                        <SlaStatusBadge 
                          status={row.sla_monitoring.sla_status as any} 
                          label={dict.sla[`status_${row.sla_monitoring.sla_status}`]} 
                        />
                        <span className="text-[10px] text-slate-500 font-mono">Age: {row.sla_monitoring.stage_age_hours?.toFixed(1)}h</span>
                      </div>
                    )}
                  </td>
                  {activeView === 'intake' && (
                    <td className="p-4 text-xs text-slate-400">
                      {row.assigned_reviewer_name ? (
                        <span className="font-bold text-white bg-slate-800 border border-slate-700 px-2 py-1 rounded">{row.assigned_reviewer_name}</span>
                      ) : (
                        <span className="italic text-slate-600">{isRTL ? 'غير معين' : 'Unassigned'}</span>
                      )}
                    </td>
                  )}
                  <td className="p-4">
                    <Link href={`/${locale}/staff/workspace/${row.request_id}`} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 block text-center">
                      {isRTL ? 'مراجعة الطلب' : 'Review Workspace'}
                    </Link>
                  </td>
                </tr>
              )
            })}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={activeView === 'intake' ? 9 : 8} className="p-8 text-center text-slate-500 italic">
                  {isRTL ? 'لا يوجد طلبات تطابق معايير البحث.' : 'No requests match search criteria.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Reason Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[hsl(220,20%,10%)] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🗄️</span>
              {isRTL ? 'أرشفة الطلبات المحددة جماعياً' : 'Bulk Archive Selected Requests'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-bold">{isRTL ? 'سبب الأرشفة للمجموعة *' : 'Specify reason for archiving *'}</label>
              <textarea 
                value={archiveReason} 
                onChange={e => setArchiveReason(e.target.value)}
                rows={3} 
                required
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
                placeholder={isRTL ? 'أدخل سبب أرشفة هذه الطلبات...' : 'Please enter the reason...'}
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button 
                type="button" 
                onClick={() => { setShowArchiveModal(false); setArchiveReason('') }}
                className="bg-white/5 hover:bg-white/10 text-white rounded-lg px-4 py-2 text-xs font-bold"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                type="button" 
                onClick={submitBulkArchive}
                disabled={!archiveReason.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-xs font-black"
              >
                {isRTL ? 'تأكيد الأرشفة الجماعية' : 'Confirm Bulk Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
