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
    <div className="user-mgmt-container space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .user-mgmt-container button {
          width: auto !important;
          background: transparent !important;
          color: inherit !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0 !important;
          transition: all 0.2s ease !important;
          transform: none !important;
          box-shadow: none !important;
        }
        .user-mgmt-container button:hover {
          transform: translateY(-1px) !important;
          opacity: 0.95 !important;
        }
        
        /* Premium Tabs */
        .user-mgmt-container button.mgmt-tab-btn {
          padding: 10px 24px !important;
          border-radius: 12px !important;
          font-size: 0.85rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .user-mgmt-container button.mgmt-tab-btn:hover {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #fff !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        .user-mgmt-container button.mgmt-tab-btn.active {
          background: linear-gradient(135deg, #d4a63c 0%, #b28526 100%) !important;
          color: #000 !important;
          border-color: #d4a63c !important;
          box-shadow: 0 4px 20px rgba(212, 166, 60, 0.25) !important;
        }

        /* Sorting control buttons */
        .user-mgmt-container button.sort-btn {
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .user-mgmt-container button.sort-btn:hover {
          color: #fff !important;
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .user-mgmt-container button.sort-btn.active {
          color: #d4a63c !important;
          border-color: rgba(212, 166, 60, 0.3) !important;
          background: rgba(212, 166, 60, 0.05) !important;
          font-weight: 800 !important;
        }

        /* Bulk Actions Panel Styling */
        .bulk-actions-panel {
          background: rgba(212, 166, 60, 0.04) !important;
          border: 1px solid rgba(212, 166, 60, 0.18) !important;
          padding: 16px 24px !important;
          border-radius: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
          flex-wrap: wrap !important;
          margin-bottom: 24px !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        }
        .bulk-selected-label {
          font-size: 0.85rem !important;
          font-weight: 800 !important;
          color: #fff !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .selected-count-badge {
          background: #d4a63c !important;
          color: #000 !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 900 !important;
          font-size: 0.75rem !important;
        }
        .bulk-buttons-group {
          display: flex !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        /* Bulk action buttons */
        .user-mgmt-container button.bulk-btn {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 0.75rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          color: #fff !important;
        }
        .user-mgmt-container button.bulk-btn-block {
          background: #d4a63c !important;
          color: #000 !important;
        }
        .user-mgmt-container button.bulk-btn-block:hover {
          background: #e5b74c !important;
        }
        .user-mgmt-container button.bulk-btn-secondary {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #fff !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .user-mgmt-container button.bulk-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .user-mgmt-container button.bulk-btn-danger {
          background: #ef4444 !important;
          color: #fff !important;
        }
        .user-mgmt-container button.bulk-btn-danger:hover {
          background: #f87171 !important;
        }

        /* Table Checkbox */
        .mgmt-checkbox {
          width: 18px !important;
          height: 18px !important;
          accent-color: #d4a63c !important;
          cursor: pointer !important;
        }

        /* Chic Table Action Buttons */
        .table-action-btn {
          display: inline-flex !important;
          align-items: center !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          text-decoration: none !important;
          border: 1px solid rgba(212, 166, 60, 0.25) !important;
          background: rgba(212, 166, 60, 0.04) !important;
          color: #d4a63c !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          white-space: nowrap !important;
        }
        .table-action-btn:hover {
          background: #d4a63c !important;
          color: #000 !important;
          border-color: #d4a63c !important;
          box-shadow: 0 4px 12px rgba(212, 166, 60, 0.15) !important;
        }
      `}} />
      
      {/* Search and Tabs Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => { setActiveTab('staff'); setSelectedIds([]) }}
            className={`mgmt-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          >
            👥 {isRTL ? 'فريق العمل' : 'Staff Members'}
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('customers'); setSelectedIds([]) }}
            className={`mgmt-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          >
            🛍️ {isRTL ? 'دليل العملاء' : 'Customer List'}
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('blocked_list'); setSelectedIds([]) }}
            className={`mgmt-tab-btn ${activeTab === 'blocked_list' ? 'active' : ''}`}
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
            <button 
              type="button"
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-white"
              style={{ width: 'auto !important', background: 'transparent !important' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-panel">
          <span className="bulk-selected-label">
            <span className="selected-count-badge">{selectedIds.length}</span>
            {isRTL ? 'مستخدمين محددين' : 'selected users'}
          </span>
          <div className="bulk-buttons-group">
            <button 
              type="button"
              onClick={() => handleBulkBlock(activeTab !== 'blocked_list')}
              className="bulk-btn bulk-btn-block"
            >
              🚫 {activeTab === 'blocked_list' ? (isRTL ? 'إلغاء حظر جماعي' : 'Bulk Unblock') : (isRTL ? 'حظر جماعي' : 'Bulk Block')}
            </button>
            <button 
              type="button"
              onClick={() => handleBulkArchive(true)}
              className="bulk-btn bulk-btn-secondary"
            >
              🗄️ {isRTL ? 'أرشفة جماعية' : 'Bulk Archive'}
            </button>
            <button 
              type="button"
              onClick={() => handleBulkArchive(false)}
              className="bulk-btn bulk-btn-secondary"
            >
              ↩ {isRTL ? 'استعادة جماعية' : 'Bulk Restore'}
            </button>
            <button 
              type="button"
              onClick={handleBulkDelete}
              className="bulk-btn bulk-btn-danger"
            >
              🗑️ {isRTL ? 'حذف نهائي' : 'Bulk Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Sorting Control Header Grid */}
      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
        <span>{isRTL ? 'ترتيب حسب:' : 'Sort By:'}</span>
        <button 
          type="button"
          onClick={() => toggleSort('name')} 
          className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
        >
          {isRTL ? 'الاسم' : 'Name'} {getSortArrow('name')}
        </button>
        <button 
          type="button"
          onClick={() => toggleSort('date')} 
          className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
        >
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
                    <Link href={`/${locale}/staff/users?tab=staff&editStaff=${s.id}`} className="table-action-btn">
                      ⚙️ {isRTL ? 'تعديل الصلاحيات' : 'Edit Roles'}
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
                    className="mgmt-checkbox"
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
                        className="mgmt-checkbox"
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
                      <Link href={`/${locale}/staff/users?tab=customers&editCustomer=${c.id}`} className="table-action-btn">
                        👤 {isRTL ? 'إدارة الحساب' : 'Manage Profile'}
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
                className="bulk-btn bulk-btn-secondary"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                type="button" 
                onClick={submitBulkBlock}
                disabled={!blockReason.trim()}
                className="bulk-btn bulk-btn-danger"
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
