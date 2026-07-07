'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  handleBulkDeleteCustomers, 
  handleBulkToggleArchiveCustomers, 
  handleBulkBlockCustomers 
} from './actions'
import { ConfirmButton } from '@/components/ConfirmButton'

interface Staff {
  id: string
  auth_id: string
  name: string | null
  role: string | null
  extra_roles: string[]
  team: string | null
  is_active: boolean | null
  is_archived: boolean | null
  email: string
  phone: string
  workload: number
  reviewed_count: number
  approved_count: number
  rejected_count: number
  clarification_count: number
  approval_rate: number
  last_activity: string | null
  created_at?: string
}

interface Customer {
  id: string
  auth_user_id: string | null
  full_name: string | null
  email: string | null
  phone_number_raw: string | null
  phone_number_normalized: string | null
  customer_code: string
  is_archived: boolean
  archived_at: string | null
  status: string // 'active' | 'suspended' | 'blocked'
  block_reason: string | null
  free_trial_used_at: string | null
  phone_verified_at: string | null
  orderCount: number
  created_at: string
}

interface Props {
  initialStaff: Staff[]
  initialCustomers: Customer[]
  locale: string
  dict: any
  permissions: any
  searchQ: string
}

export default function UserManagementClient({
  initialStaff,
  initialCustomers,
  locale,
  dict,
  permissions,
  searchQ: serverSearchQ
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isRTL = locale === 'ar'

  // Tabs: 'staff' | 'customers' | 'blocked_list'
  const [activeTab, setActiveTab] = useState<'staff' | 'customers' | 'blocked_list'>('staff')
  const [searchQuery, setSearchQuery] = useState(serverSearchQ)
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Modal for block reason
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  // 1. Filtering
  const cleanSearch = searchQuery.toLowerCase().trim()
  
  const filteredStaff = initialStaff.filter(s => {
    const matchesSearch = !cleanSearch || 
      (s.name || '').toLowerCase().includes(cleanSearch) || 
      (s.email || '').toLowerCase().includes(cleanSearch) ||
      (s.role || '').toLowerCase().includes(cleanSearch)
    return matchesSearch
  })

  const filteredCustomers = initialCustomers.filter(c => {
    // Tab filter
    if (activeTab === 'blocked_list' && c.status !== 'blocked') return false
    if (activeTab === 'customers' && c.status === 'blocked') return false

    const matchesSearch = !cleanSearch || 
      (c.full_name || '').toLowerCase().includes(cleanSearch) || 
      (c.email || '').toLowerCase().includes(cleanSearch) || 
      (c.phone_number_raw || '').includes(cleanSearch) ||
      (c.customer_code || '').toLowerCase().includes(cleanSearch)

    return matchesSearch
  })

  // 2. Sorting
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.name || ''
      const nameB = b.name || ''
      return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    } else {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA
    }
  })

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.full_name || ''
      const nameB = b.full_name || ''
      return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    } else {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA
    }
  })

  // 3. Selection actions
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCustomers.map(c => c.id))
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

  // 4. Bulk Operations Handlers
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (!confirm(isRTL ? `هل أنت متأكد من حذف ${selectedIds.length} من العملاء المحددين نهائياً؟` : `Are you sure you want to permanently delete ${selectedIds.length} selected customers?`)) return
    
    startTransition(async () => {
      await handleBulkDeleteCustomers(selectedIds, locale)
      setSelectedIds([])
      router.refresh()
    })
  }

  const handleBulkArchive = (archive: boolean) => {
    if (selectedIds.length === 0) return
    startTransition(async () => {
      await handleBulkToggleArchiveCustomers(selectedIds, archive, locale)
      setSelectedIds([])
      router.refresh()
    })
  }

  const handleBulkBlock = (block: boolean) => {
    if (selectedIds.length === 0) return
    if (block) {
      setShowBlockModal(true)
    } else {
      startTransition(async () => {
        await handleBulkBlockCustomers(selectedIds, false, '', locale)
        setSelectedIds([])
        router.refresh()
      })
    }
  }

  const submitBulkBlock = () => {
    setShowBlockModal(false)
    startTransition(async () => {
      await handleBulkBlockCustomers(selectedIds, true, blockReason, locale)
      setBlockReason('')
      setSelectedIds([])
      router.refresh()
    })
  }

  const toggleSort = (field: 'name' | 'date') => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const getSortArrow = (field: 'name' | 'date') => {
    if (sortBy !== field) return ' ⇅'
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div className="space-y-6">
      
      {/* Search and Tabs Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => { setActiveTab('staff'); setSelectedIds([]) }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'staff' ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            👥 {isRTL ? 'فريق العمل' : 'Staff Members'}
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setSelectedIds([]) }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'customers' ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            🛍️ {isRTL ? 'دليل العملاء' : 'Customer List'}
          </button>
          <button 
            onClick={() => { setActiveTab('blocked_list'); setSelectedIds([]) }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'blocked_list' ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            🚫 {isRTL ? 'المحظورين' : 'Blocked Users'}
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم أو الهاتف أو البريد...' : 'Search name, phone, email...'}
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
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.length}</span>
            {isRTL ? 'مستخدمين محددين' : 'selected users'}
          </span>
          <div className="flex gap-2.5 border-l border-white/10 pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
            <button 
              onClick={() => handleBulkBlock(activeTab !== 'blocked_list')}
              className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-xs font-black"
            >
              🚫 {activeTab === 'blocked_list' ? (isRTL ? 'إلغاء حظر جماعي' : 'Bulk Unblock') : (isRTL ? 'حظر جماعي' : 'Bulk Block')}
            </button>
            <button 
              onClick={() => handleBulkArchive(true)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-4 py-2 text-xs font-black"
            >
              🗄️ {isRTL ? 'أرشفة جماعية' : 'Bulk Archive'}
            </button>
            <button 
              onClick={() => handleBulkArchive(false)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-4 py-2 text-xs font-black"
            >
              ↩ {isRTL ? 'استعادة جماعية' : 'Bulk Restore'}
            </button>
            <button 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-xs font-black"
            >
              🗑️ {isRTL ? 'حذف نهائي' : 'Bulk Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Sorting Control Header Grid */}
      <div className="flex gap-4 text-xs font-bold text-slate-500">
        <span>{isRTL ? 'ترتيب حسب:' : 'Sort By:'}</span>
        <button onClick={() => toggleSort('name')} className={`hover:text-white ${sortBy === 'name' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'الاسم' : 'Name'} {getSortArrow('name')}
        </button>
        <button onClick={() => toggleSort('date')} className={`hover:text-white ${sortBy === 'date' ? 'text-amber-500 font-black' : ''}`}>
          {isRTL ? 'تاريخ التسجيل' : 'Registration Date'} {getSortArrow('date')}
        </button>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl shadow-xl">
        {activeTab === 'staff' ? (
          <table className="w-full text-left border-collapse rtl:text-right">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10 text-slate-400 font-bold text-xs uppercase">
                <th className="p-4">{isRTL ? 'الموظف والدور' : 'Staff & Role'}</th>
                <th className="p-4">{isRTL ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="p-4">{isRTL ? 'الفريق' : 'Team'}</th>
                <th className="p-4">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="p-4">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors text-sm">
                  <td className="p-4">
                    <div className="font-bold text-white text-base">{s.name || '—'}</div>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-400 uppercase font-mono mt-1 inline-block">{s.role}</span>
                  </td>
                  <td className="p-4 text-slate-400">{s.email || '—'}</td>
                  <td className="p-4">
                    <span className="font-bold text-white text-xs bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">{s.team || 'General'}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                      {s.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link href={`/${locale}/staff/users?tab=staff&editStaff=${s.id}`} className="text-amber-500 hover:text-amber-400 font-bold underline text-xs">
                      {isRTL ? 'تعديل الصلاحيات' : 'Edit Roles'}
                    </Link>
                  </td>
                </tr>
              ))}
              {sortedStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    {isRTL ? 'لا يوجد موظفين يطابقون البحث.' : 'No staff members match search filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse rtl:text-right">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10 text-slate-400 font-bold text-xs uppercase">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={sortedCustomers.length > 0 && sortedCustomers.every(c => selectedIds.includes(c.id))}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">{isRTL ? 'العميل والكود' : 'Customer & Code'}</th>
                <th className="p-4">{isRTL ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="p-4">{isRTL ? 'الهاتف والطلبات' : 'Phone & Orders'}</th>
                <th className="p-4">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="p-4">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map(c => {
                const isSelected = selectedIds.includes(c.id)
                return (
                  <tr key={c.id} className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors text-sm ${isSelected ? 'bg-amber-500/[0.02]' : ''}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={e => toggleSelect(c.id, e.target.checked)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white text-base">{c.full_name || '—'}</div>
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono mt-1 inline-block">{c.customer_code}</span>
                      {c.is_archived && <span className="badge badge-muted mt-1 ms-1 text-[9px] uppercase font-black text-amber-500">{isRTL ? '🗄️ مؤرشف' : '🗄️ Archived'}</span>}
                    </td>
                    <td className="p-4 text-slate-400">{c.email || '—'}</td>
                    <td className="p-4">
                      <div className="font-bold text-white text-xs">{c.phone_number_raw || '—'}</div>
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black border border-amber-500/20 px-2 py-0.5 rounded-lg mt-1 inline-block">
                        📦 {isRTL ? `الطلبات (${c.orderCount})` : `Orders (${c.orderCount})`}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.status === 'blocked' ? 'bg-red-500/20 text-red-400 border-red-500/30' : c.status === 'suspended' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                        {c.status === 'blocked' ? (isRTL ? '🚫 محظور' : '🚫 Blocked') : c.status === 'suspended' ? (isRTL ? '🛑 معطل' : '🛑 Suspended') : (isRTL ? '✔️ نشط' : '✔️ Active')}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/${locale}/staff/users?tab=customers&editCustomer=${c.id}`} className="text-amber-500 hover:text-amber-400 font-bold underline text-xs">
                        {isRTL ? 'إدارة الحساب' : 'Manage Profile'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {sortedCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    {isRTL ? 'لا يوجد مستخدمين يطابقون البحث.' : 'No customers match search filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Block Reason Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[hsl(220,20%,10%)] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🚫</span>
              {isRTL ? 'حظر الحسابات المحددة جماعياً' : 'Bulk Block Selected Customers'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-bold">{isRTL ? 'سبب الحظر أو التعطيل للمجموعة *' : 'Specify reason for blocking *'}</label>
              <textarea 
                value={blockReason} 
                onChange={e => setBlockReason(e.target.value)}
                rows={3} 
                required
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
                placeholder={isRTL ? 'الرجاء توضيح سبب حظر المستخدمين...' : 'Please enter the reason...'}
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button 
                type="button" 
                onClick={() => { setShowBlockModal(false); setBlockReason('') }}
                className="bg-white/5 hover:bg-white/10 text-white rounded-lg px-4 py-2 text-xs font-bold"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                type="button" 
                onClick={submitBulkBlock}
                disabled={!blockReason.trim()}
                className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-xs font-black"
              >
                {isRTL ? 'تطبيق الحظر الجماعي' : 'Confirm Bulk Block'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
