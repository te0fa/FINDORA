'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBackupAction, deleteRequestAction, handleBulkPrepareBackupsAction, archiveRequestAction, restoreRequestAction } from './actions'

type ArchiveItem = {
  id: string
  request_code: string
  title: string
  customer_name: string
  state: string
  is_terminal: boolean
  latest_backup_id: string | null
  backup_created_at: string | null
  backup_delete_confirmed: boolean
  backup_status: 'missing' | 'prepared' | 'deleted'
  is_delete_safe: boolean
  created_at: string
}

export default function ArchiveClientPage({ 
  initialItems, 
  total, 
  locale, 
  dict,
  permissions
}: { 
  initialItems: ArchiveItem[], 
  total: number, 
  locale: string, 
  dict: any,
  permissions: any
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [deleteNotes, setDeleteNotes] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const isRTL = locale === 'ar'

  // URL State helpers
  const currentStatus = searchParams.get('status') || 'ALL'
  const currentBackupStatus = searchParams.get('backupStatus') || 'ALL'
  const currentSearch = searchParams.get('q') || ''
  const currentLimit = parseInt(searchParams.get('limit') || '25')
  const currentOffset = parseInt(searchParams.get('offset') || '0')
  const currentPage = Math.floor(currentOffset / currentLimit) + 1

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'ALL' || value === '') {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })
    // Reset offset on filter change unless explicitly setting it
    if (!updates.offset && updates.offset !== 0) {
      params.delete('offset')
    }
    router.push(`/${locale}/staff/archive?${params.toString()}`)
  }

  const handleBackup = async (id: string) => {
    if (loadingId || isBulkLoading) return
    setLoadingId(id)
    const res = await createBackupAction(id)
    if (res.success) {
      // success query param for UI feedback
      const params = new URLSearchParams(searchParams.toString())
      params.set('success', 'backup_prepared')
      params.set('request_code', res.request_code || '')
      router.push(`/${locale}/staff/archive?${params.toString()}`)
      router.refresh()
    } else {
      alert(res.error || 'Backup failed')
    }
    setLoadingId(null)
  }

  const handleBulkBackup = async () => {
    // Only backup items that are missing backup or outdated
    const safeToBackup = selectedIds.filter(id => {
      const item = initialItems.find(i => i.id === id)
      return item && item.backup_status !== 'deleted'
    })

    if (safeToBackup.length === 0) {
      alert(isRTL ? 'لا توجد طلبات تحتاج لنسخ احتياطي في التحديد الحالي' : 'No eligible requests for backup in selection')
      return
    }

    if (isBulkLoading) return
    setIsBulkLoading(true)
    const res = await handleBulkPrepareBackupsAction(safeToBackup)
    if (res.success) {
      alert(isRTL 
        ? `تم الانتهاء: تم إنشاء ${res.created}، تخطي ${res.skipped}، فشل ${res.failed}` 
        : `Done: Created ${res.created}, Skipped ${res.skipped}, Failed ${res.failed}`
      )
      setSelectedIds([])
      router.refresh()
    } else {
      alert(res.error || 'Bulk backup failed')
    }
    setIsBulkLoading(false)
  }

  const handleArchive = async (id: string) => {
    if (loadingId) return
    setLoadingId(id)
    const res = await archiveRequestAction(id)
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error || 'Archive failed')
    }
    setLoadingId(null)
  }

  const handleRestore = async (id: string) => {
    if (loadingId) return
    setLoadingId(id)
    const res = await restoreRequestAction(id)
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error || 'Restore failed')
    }
    setLoadingId(null)
  }

  const handleDelete = async (item: ArchiveItem) => {
    if (!item.latest_backup_id || loadingId || isBulkLoading) return
    
    setLoadingId(item.id)
    const res = await deleteRequestAction(
      item.id, 
      item.latest_backup_id, 
      confirmationInput, 
      `DELETE ${item.request_code}`,
      deleteNotes
    )
    
    if (!res.success) {
      alert(res.error || 'Deletion failed')
      setLoadingId(null)
    } else {
      setConfirmingId(null)
      setConfirmationInput('')
      setDeleteNotes('')
      setLoadingId(null)
      router.refresh()
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === initialItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(initialItems.map(i => i.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const confirmingItem = initialItems.find((i) => i.id === confirmingId)

  return (
    <div className="archive-container">
      {/* Explanation Note */}
      <div className="archive-note">
        <p>
          {isRTL 
            ? 'تعرض هذه الصفحة الطلبات الآمنة للأرشفة أو التنظيف فقط. استخدم الفلاتر والتنقل بين الصفحات لعرض باقي النتائج.'
            : 'This page shows cleanup-safe requests only. Use filters and pagination to browse all matching records.'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="archive-filters">
        <div className="filter-group">
          <input 
            type="text" 
            placeholder={isRTL ? 'بحث برقم الطلب أو العنوان...' : 'Search code or title...'}
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateFilters({ q: (e.target as HTMLInputElement).value })
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <select 
            value={currentStatus} 
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="filter-select"
          >
            <option value="ALL">{isRTL ? 'كل الحالات' : 'All Requests'}</option>
            <option value="ALL_CLEANUP_SAFE">{isRTL ? 'كل الجاهزة للتنظيف' : 'All Cleanup Safe'}</option>
            <option value="ARCHIVED">{isRTL ? 'المؤرشفة' : 'ARCHIVED'}</option>
            <option value="COMPLETED">{isRTL ? 'المكتملة' : 'COMPLETED'}</option>
            <option value="REJECTED">{isRTL ? 'المرفوضة' : 'REJECTED'}</option>
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={currentBackupStatus} 
            onChange={(e) => updateFilters({ backupStatus: e.target.value })}
            className="filter-select"
          >
            <option value="ALL">{isRTL ? 'كل حالات النسخ' : 'All Backup States'}</option>
            <option value="missing">{isRTL ? 'بدون نسخة' : 'Missing Backup'}</option>
            <option value="prepared">{isRTL ? 'نسخة جاهزة' : 'Prepared Backup'}</option>
            <option value="deleted">{isRTL ? 'تم الحذف' : 'Deleted'}</option>
          </select>
        </div>

        <button 
          onClick={() => router.push(`/${locale}/staff/archive`)}
          className="action-btn btn-secondary"
        >
          {isRTL ? 'إعادة تعيين' : 'Reset'}
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="selected-count">
            {isRTL ? `${selectedIds.length} طلبات مختارة` : `${selectedIds.length} items selected`}
          </span>
          <button 
            className={`action-btn btn-backup ${isBulkLoading ? 'btn-disabled' : ''}`}
            onClick={handleBulkBackup}
            disabled={isBulkLoading}
          >
            {isBulkLoading ? (isRTL ? 'جاري النسخ...' : 'Backing up...') : (isRTL ? 'تجهيز نسخ احتياطية للمختار' : 'Bulk Prepare Backups')}
          </button>
          <button onClick={() => setSelectedIds([])} className="action-btn btn-secondary">
            {isRTL ? 'إلغاء التحديد' : 'Clear'}
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="archive-table-container">
        <table className="archive-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length > 0 && selectedIds.length === initialItems.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>{isRTL ? 'الطلب' : 'Request'}</th>
              <th>{isRTL ? 'العميل' : 'Customer'}</th>
              <th>{isRTL ? 'الحالة' : 'Status'}</th>
              <th>{isRTL ? 'التاريخ' : 'Date'}</th>
              <th>{isRTL ? 'النسخة' : 'Backup'}</th>
              <th>{isRTL ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {initialItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  {isRTL ? 'لا توجد نتائج مطابقة.' : 'No matching results found.'}
                </td>
              </tr>
            ) : (
              initialItems.map((item) => {
                const canHardDelete = permissions.canHardDelete && item.is_delete_safe && item.backup_status === 'prepared'
                const canArchive = item.state !== 'ARCHIVED' && item.is_terminal
                const canRestore = item.state === 'ARCHIVED'
                const canBackup = item.backup_status !== 'deleted'

                return (
                  <tr key={`${item.id}-${item.latest_backup_id ?? 'no-backup'}`} className={selectedIds.includes(item.id) ? 'row-selected' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        disabled={item.backup_status === 'deleted'}
                      />
                    </td>
                    <td>
                      <div className="cell-code">{item.request_code}</div>
                      <div className="cell-title">{item.title}</div>
                    </td>
                    <td>{item.customer_name}</td>
                    <td>
                      <span className={`state-badge state-${item.state}`}>
                        {item.state}
                      </span>
                    </td>
                    <td className="cell-date">
                      {new Date(item.created_at).toLocaleDateString(locale)}
                    </td>
                    <td>
                      <div className="backup-status-group">
                        <span className={`backup-badge status-${item.backup_status}`}>
                          {item.backup_status === 'missing' 
                            ? (isRTL ? 'مفقودة' : 'Missing')
                            : item.backup_status === 'deleted'
                              ? (isRTL ? '✓ تم الحذف' : '✓ Deleted')
                              : (isRTL ? '✓ جاهز' : '✓ Prepared')}
                        </span>
                        {item.backup_created_at && (
                          <span className="backup-date">
                            {new Date(item.backup_created_at).toLocaleDateString(locale)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-row">
                        {canArchive && (
                          <button 
                            className={`action-btn btn-archive ${loadingId === item.id ? 'btn-disabled' : ''}`}
                            onClick={() => handleArchive(item.id)}
                            disabled={!!loadingId}
                          >
                            {isRTL ? 'أرشفة' : 'Archive'}
                          </button>
                        )}
                        
                        {canRestore && (
                          <button 
                            className={`action-btn btn-restore ${loadingId === item.id ? 'btn-disabled' : ''}`}
                            onClick={() => handleRestore(item.id)}
                            disabled={!!loadingId}
                          >
                            {isRTL ? 'استعادة' : 'Restore'}
                          </button>
                        )}

                        <button 
                          className={`action-btn btn-backup ${(loadingId === item.id || !canBackup) ? 'btn-disabled' : ''}`}
                          onClick={() => handleBackup(item.id)}
                          disabled={!!loadingId || !canBackup}
                        >
                          {item.latest_backup_id ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'نسخة' : 'Backup')}
                        </button>

                        {item.latest_backup_id && (
                          <a 
                            href={`/${locale}/staff/archive/backups/${item.latest_backup_id}`}
                            className="action-btn btn-download"
                            download
                          >
                            {isRTL ? 'تحميل' : 'DL'}
                          </a>
                        )}

                        <button 
                          className={`action-btn btn-delete ${(!canHardDelete) ? 'btn-disabled' : ''}`}
                          onClick={() => setConfirmingId(item.id)}
                          disabled={!canHardDelete}
                        >
                          {isRTL ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="archive-pagination">
        <div className="pagination-info">
          {isRTL 
            ? `عرض ${currentOffset + 1}–${Math.min(currentOffset + currentLimit, total)} من ${total}`
            : `Showing ${currentOffset + 1}–${Math.min(currentOffset + currentLimit, total)} of ${total}`}
        </div>
        
        <div className="pagination-controls">
          <button 
            className={`pagination-btn ${currentOffset === 0 ? 'btn-disabled' : ''}`}
            disabled={currentOffset === 0}
            onClick={() => updateFilters({ offset: Math.max(0, currentOffset - currentLimit) })}
          >
            {isRTL ? 'السابق' : 'Previous'}
          </button>
          
          <span className="page-number">{currentPage}</span>
          
          <button 
            className={`pagination-btn ${currentOffset + currentLimit >= total ? 'btn-disabled' : ''}`}
            disabled={currentOffset + currentLimit >= total}
            onClick={() => updateFilters({ offset: currentOffset + currentLimit })}
          >
            {isRTL ? 'التالي' : 'Next'}
          </button>

          <select 
            value={currentLimit}
            onChange={(e) => updateFilters({ limit: e.target.value, offset: 0 })}
            className="limit-select"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmingId && confirmingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">
              {isRTL ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Deletion'}
            </h3>
            <p className="modal-desc">
              {isRTL 
                ? 'سيتم حذف هذا الطلب وجميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.' 
                : 'This request and all associated data will be permanently deleted. This action cannot be undone.'}
            </p>
            
            <div className="modal-form-group">
              <label className="modal-label">
                {isRTL ? 'أدخل الكود التالي للتأكيد:' : 'Type the following to confirm:'}
                <code className="modal-code">
                  DELETE {confirmingItem.request_code}
                </code>
              </label>
              <input 
                type="text" 
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="modal-input"
                placeholder={isRTL ? 'أدخل الكود هنا' : 'Type code here'}
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">
                {isRTL ? 'ملاحظات الحذف (اختياري):' : 'Deletion Notes (Optional):'}
              </label>
              <textarea 
                value={deleteNotes}
                onChange={(e) => setDeleteNotes(e.target.value)}
                className="modal-textarea"
              />
            </div>

            <div className="modal-actions">
              <button 
                className={`action-btn btn-delete ${confirmationInput !== `DELETE ${confirmingItem.request_code}` || loadingId ? 'btn-disabled' : ''}`}
                disabled={confirmationInput !== `DELETE ${confirmingItem.request_code}` || !!loadingId}
                onClick={() => handleDelete(confirmingItem)}
              >
                {loadingId ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'تأكيد الحذف' : 'Confirm Delete')}
              </button>
              <button 
                className="action-btn btn-secondary"
                onClick={() => {
                  setConfirmingId(null)
                  setConfirmationInput('')
                  setDeleteNotes('')
                }}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .archive-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .archive-note {
          background: rgba(255,255,255,0.03);
          border-left: 4px solid #gold;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
        }
        .archive-filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          background: rgba(255,255,255,0.02);
          padding: 15px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .filter-input, .filter-select {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .filter-select option, .limit-select option {
          background: #1a1a1a;
          color: white;
        }
        .bulk-actions-bar {
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.2);
          padding: 10px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 20px;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .selected-count {
          font-weight: 700;
          color: #4ade80;
        }
        .archive-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .archive-table th {
          text-align: left;
          padding: 12px;
          color: rgba(255,255,255,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .archive-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cell-code { font-weight: 800; color: #fff; }
        .cell-title { font-size: 0.75rem; opacity: 0.6; }
        .cell-date { font-size: 0.8rem; opacity: 0.5; }
        .backup-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .status-missing { color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }
        .status-prepared { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
        .status-deleted { color: #94a3b8; background: rgba(148, 163, 184, 0.1); }
        .backup-date { font-size: 0.65rem; opacity: 0.4; display: block; margin-top: 2px; }
        .action-row { display: flex; gap: 6px; }
        .archive-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .pagination-controls { display: flex; align-items: center; gap: 12px; }
        .pagination-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .limit-select {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          border-radius: 6px;
          padding: 4px;
        }
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content {
          background: #1a1a1a; padding: 30px; border-radius: 24px;
          border: 1px solid rgba(239,68,68,0.3); max-width: 450px; width: 90%;
        }
        .modal-title { color: #ef4444; margin-bottom: 15px; }
        .modal-label { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .modal-code { display: block; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin-top: 4px; color: white; font-weight: 900; }
        .modal-input, .modal-textarea {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 12px; color: white; font-size: 0.9rem;
        }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .btn-disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
