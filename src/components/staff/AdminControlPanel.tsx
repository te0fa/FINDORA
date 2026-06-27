// src/components/staff/AdminControlPanel.tsx
'use client'

import React, { useState, useRef } from 'react'
import {
  handleTransition,
  handleAdminCancelRequest,
  handleAdminArchiveRequest,
  handleAdminDeleteRequest,
} from '@/app/[locale]/staff/workspace/[request_id]/actions'

interface AdminControlPanelProps {
  request: any
  state: string
  isAdmin: boolean
  dict: any
  locale: string
  isRTL: boolean
  lastUpdated?: string
}

export function AdminControlPanel({
  request,
  state,
  isAdmin,
  dict,
  locale,
  isRTL,
  lastUpdated
}: AdminControlPanelProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteCode, setDeleteCode] = useState('')
  const [deleteFormRef] = useState(() => React.createRef<HTMLFormElement>())

  const formatValue = (val: any) => val || (isRTL ? 'غير محدد' : 'Not set')
  
  const displayServiceFee = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || amount <= 0) {
      return isRTL ? 'لم يتم التسعير بعد' : 'Not priced yet'
    }
    return `${amount.toLocaleString('en-US')} ${dict.common.currency_egp}`
  }

  const formatLogDate = (value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }

  const requestCode = request.request_code || ''
  const isCancelled = request.current_status === 'cancelled'
  const isArchived = request.is_archived || state === 'ARCHIVED'

  const styles = `
    .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .admin-box { background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .admin-label { font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.3); text-transform: uppercase; margin-block-end: 0.5rem; letter-spacing: 0.05em; }
    .admin-value { font-size: 0.9rem; font-weight: 700; color: white; }
    .admin-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-block-start: 2rem; padding-block-start: 1.5rem; border-block-start: 1px solid rgba(255,255,255,0.05); }
    .override-btn { font-size: 0.75rem; font-weight: 800; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; }
    .override-btn:hover { background: rgba(255,255,255,0.1); border-color: var(--accent); }
    .danger-zone { margin-block-start: 1.5rem; padding: 1.25rem 1.5rem; border-radius: 16px; background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15); }
    .danger-zone-title { font-size: 0.65rem; font-weight: 900; color: rgba(239,68,68,0.6); text-transform: uppercase; letter-spacing: 0.1em; margin-block-end: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .danger-zone-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn-danger { font-size: 0.75rem; font-weight: 800; padding: 0.5rem 1.1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); color: #fca5a5; }
    .btn-danger:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #fff; }
    .btn-warn { font-size: 0.75rem; font-weight: 800; padding: 0.5rem 1.1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); color: #fcd34d; }
    .btn-warn:hover { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #fff; }
    .btn-archive { font-size: 0.75rem; font-weight: 800; padding: 0.5rem 1.1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(139,92,246,0.3); background: rgba(139,92,246,0.08); color: #c4b5fd; }
    .btn-archive:hover { background: rgba(139,92,246,0.15); border-color: #8b5cf6; color: #fff; }
    .delete-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .delete-modal { background: #0f0f0f; border: 1px solid rgba(239,68,68,0.3); border-radius: 24px; padding: 2rem; max-width: 440px; width: 100%; box-shadow: 0 25px 60px rgba(239,68,68,0.15); }
    .delete-modal-title { font-size: 1.1rem; font-weight: 900; color: #fca5a5; margin-block-end: 0.5rem; }
    .delete-modal-sub { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-block-end: 1.5rem; line-height: 1.5; }
    .delete-code-input { width: 100%; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.3); color: white; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.95rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; outline: none; margin-block-end: 1rem; box-sizing: border-box; }
    .delete-code-input:focus { border-color: #ef4444; }
    .delete-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-cancel-modal { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.85rem; }
    .btn-delete-confirm { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 800; font-size: 0.85rem; }
    .btn-delete-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-delete-confirm:not(:disabled):hover { background: rgba(239,68,68,0.35); color: white; }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <section className="section-card admin-control-panel animate-in" style={{ 
        background: 'rgba(255,255,255,0.05)', 
        border: '1px solid rgba(255,255,255,0.1)',
        marginBlockEnd: '2.5rem',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: '1.5rem' }}>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--accent)' }}>
              {isRTL ? 'ملخص التحكم في الطلب' : 'Request Control Summary'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
              {isRTL ? 'آخر تحديث:' : 'Last updated:'} {formatLogDate(lastUpdated)}
            </p>
          </div>
          <div className="badge badge-gold" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 900 }}>{state}</div>
        </div>

        <div className="admin-grid">
          <div className="admin-box">
            <div className="admin-label">{dict.staff_workspace.status}</div>
            <div className="admin-value" style={{ color: 'var(--accent)' }}>{request.current_status?.toUpperCase()}</div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'اختيار العميل' : 'Customer Selection'}</div>
            <div className="admin-value" style={{ opacity: 0.7 }}>{formatValue(request.source_channel)}</div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'تصنيف المراجع' : 'Confirmed Classification'}</div>
            <div className="admin-value">{formatValue(request.request_kind?.replace('_', ' ').toUpperCase())}</div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'نموذج التسعير' : 'Pricing Model'}</div>
            <div className="admin-value">{formatValue(request.pricing_model?.replace('_', ' ').toUpperCase())}</div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'سياسة الدفع' : 'Payment Policy'}</div>
            <div className="admin-value">{formatValue(request.payment_policy?.replace('_', ' ').toUpperCase())}</div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'رسوم الخدمة' : 'Service Fee'}</div>
            <div className="admin-value" style={{ color: (request.service_fee_amount ?? 0) <= 0 ? '#fca5a5' : '#22c55e' }}>
              {displayServiceFee(request.service_fee_amount)}
            </div>
          </div>
          <div className="admin-box">
            <div className="admin-label">{isRTL ? 'قرار المراجع' : 'Latest Decision'}</div>
            <div className="admin-value">{formatValue(request.reviewer_decision?.toUpperCase())}</div>
          </div>
        </div>

        {(request.reviewer_decision === 'reject' || request.reviewer_decision === 'needs_clarification') && (
          <div style={{ 
            marginBlockStart: '1.5rem', 
            padding: '1.25rem', 
            background: request.reviewer_decision === 'reject' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)', 
            border: `1px solid ${request.reviewer_decision === 'reject' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, 
            borderRadius: '16px' 
          }}>
            <div className="admin-label" style={{ color: request.reviewer_decision === 'reject' ? '#fca5a5' : '#fcd34d' }}>
              {request.reviewer_decision === 'reject' ? (isRTL ? 'سبب الرفض' : 'Rejection Reason') : (isRTL ? 'ملاحظة التوضيح' : 'Clarification Note')}
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5 }}>{request.reviewer_notes || (isRTL ? 'لا يوجد سبب محدد' : 'No reason provided')}</p>
          </div>
        )}

        {isAdmin && (
          <>
            {/* ── Override Actions ─────────────────────────────── */}
            <div className="admin-actions">
              <div style={{ width: '100%', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBlockEnd: '0.5rem' }}>
                {isRTL ? 'إجراءات الأدمن' : 'Admin Overrides'}
              </div>
              
              <form action={handleTransition}>
                <input type="hidden" name="requestId" value={request.request_id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="transition" value="REVERT_TO_OPS" />
                <input type="hidden" name="note" value="Admin Override: Reopening request" />
                <button type="submit" className="override-btn">
                  {isRTL ? '🔄 إعادة فتح الطلب' : '🔄 Reopen Request'}
                </button>
              </form>

              <form action={handleTransition}>
                <input type="hidden" name="requestId" value={request.request_id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="transition" value="RESOLVE_ISSUE" />
                <input type="hidden" name="note" value="Admin Override: Resolving issue manually" />
                <button type="submit" className="override-btn">
                  {isRTL ? '✅ حل المشكلة يدويًا' : '✅ Resolve Issue'}
                </button>
              </form>

              <form action={handleTransition}>
                <input type="hidden" name="requestId" value={request.request_id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="transition" value="MOVE_TO_REPORTING" />
                <input type="hidden" name="note" value="Admin Override: Force move to reporting" />
                <button type="submit" className="override-btn">
                  {isRTL ? '📊 نقل إلى التقارير' : '📊 Force to Reporting'}
                </button>
              </form>
            </div>

            {/* ── Danger Zone ───────────────────────────────────── */}
            <div className="danger-zone">
              <div className="danger-zone-title">
                <span>⚠️</span>
                {isRTL ? 'منطقة الخطر — إجراءات لا يمكن التراجع عنها' : 'Danger Zone — Irreversible Actions'}
              </div>
              <div className="danger-zone-actions">

                {/* Stop / Cancel */}
                {!isCancelled && !isArchived && (
                  <form action={handleAdminCancelRequest} onSubmit={(e) => {
                    if (!confirm(isRTL ? `هل أنت متأكد أنك تريد إيقاف الطلب ${requestCode}؟ لن يتمكن العميل من رؤيته.` : `Are you sure you want to CANCEL request ${requestCode}? This stops all work immediately.`)) {
                      e.preventDefault()
                    }
                  }}>
                    <input type="hidden" name="requestId" value={request.request_id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="btn-warn">
                      {isRTL ? '⏹ إيقاف الطلب' : '⏹ Stop Request'}
                    </button>
                  </form>
                )}

                {/* Archive */}
                {!isArchived && (
                  <form action={handleAdminArchiveRequest} onSubmit={(e) => {
                    if (!confirm(isRTL ? `هل تريد أرشفة الطلب ${requestCode}؟ سيُنقل إلى الأرشيف ويمكن استعادته لاحقاً.` : `Archive request ${requestCode}? It will be moved to archive and can be restored later.`)) {
                      e.preventDefault()
                    }
                  }}>
                    <input type="hidden" name="requestId" value={request.request_id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="btn-archive">
                      {isRTL ? '📁 أرشفة الطلب' : '📁 Archive Request'}
                    </button>
                  </form>
                )}

                {/* Hard Delete */}
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  {isRTL ? '🗑 حذف نهائي' : '🗑 Hard Delete'}
                </button>
              </div>

              {isCancelled && (
                <p style={{ fontSize: '0.75rem', color: '#fcd34d', marginBlockStart: '0.75rem', fontWeight: 700 }}>
                  ⚠️ {isRTL ? 'هذا الطلب موقوف حالياً.' : 'This request is currently cancelled.'}
                </p>
              )}
              {isArchived && (
                <p style={{ fontSize: '0.75rem', color: '#c4b5fd', marginBlockStart: '0.75rem', fontWeight: 700 }}>
                  📁 {isRTL ? 'هذا الطلب مؤرشف. انتقل إلى الأرشيف لاستعادته.' : 'This request is archived. Go to Archive to restore it.'}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {showDeleteModal && (
        <div className="delete-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="delete-modal">
            <div className="delete-modal-title">
              {isRTL ? '🗑 تأكيد الحذف النهائي' : '🗑 Confirm Hard Delete'}
            </div>
            <div className="delete-modal-sub">
              {isRTL
                ? `هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الطلب وجميع بياناته نهائياً بعد عمل نسخة احتياطية. اكتب كود الطلب للتأكيد:`
                : `This action CANNOT be undone. The request and all its data will be permanently deleted (a backup is created first). Type the request code to confirm:`}
            </div>
            <div style={{ 
              background: 'rgba(239,68,68,0.08)', 
              border: '1px solid rgba(239,68,68,0.2)', 
              borderRadius: '10px', 
              padding: '0.75rem 1rem', 
              marginBlockEnd: '1rem',
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 900,
              color: '#fca5a5',
              letterSpacing: '0.1em',
              textAlign: 'center'
            }}>
              {requestCode}
            </div>
            <input
              type="text"
              className="delete-code-input"
              placeholder={isRTL ? 'اكتب كود الطلب هنا...' : 'Type request code here...'}
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value.toUpperCase())}
              autoFocus
            />
            <div className="delete-modal-actions">
              <button type="button" className="btn-cancel-modal" onClick={() => { setShowDeleteModal(false); setDeleteCode('') }}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <form action={handleAdminDeleteRequest} onSubmit={() => { setShowDeleteModal(false); setDeleteCode('') }}>
                <input type="hidden" name="requestId" value={request.request_id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="requestCode" value={requestCode} />
                <input type="hidden" name="confirmCode" value={deleteCode} />
                <button
                  type="submit"
                  className="btn-delete-confirm"
                  disabled={deleteCode.trim().toUpperCase() !== requestCode}
                >
                  {isRTL ? 'تأكيد الحذف النهائي' : 'Confirm Hard Delete'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
