'use client'

import React, { useState, useTransition } from 'react'
import type { SpecializationTree } from '@/lib/dal/specializations-client'
import { flattenTreeForSelect } from '@/lib/dal/specializations-client'
import { useRouter } from 'next/navigation'

const t = (locale: string, en: string, ar: string) => locale === 'ar' ? ar : en

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9, boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f8fafc', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 5 }
const btn = (color: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 8, border: `1px solid ${color}44`,
  background: `${color}12`, color, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
})

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
interface ModalProps {
  locale: string
  mode: 'add' | 'edit'
  initial?: { id?: string; name_en: string; name_ar: string; parent_id: string | null; display_order: number }
  parents: Array<{ id: string; name_en: string; name_ar: string }>
  onClose: () => void
  onSave: (data: { name_en: string; name_ar: string; parent_id: string | null; display_order: number }) => Promise<void>
}

function SpecModal({ locale, mode, initial, parents, onClose, onSave }: ModalProps) {
  const [nameEn,       setNameEn]       = useState(initial?.name_en || '')
  const [nameAr,       setNameAr]       = useState(initial?.name_ar || '')
  const [parentId,     setParentId]     = useState<string | null>(initial?.parent_id || null)
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0)
  const [isPending, startT]             = useTransition()
  const [error, setError]               = useState<string | null>(null)

  const handleSave = () => {
    if (!nameEn.trim() || !nameAr.trim()) { setError(t(locale, 'Both EN and AR names required', 'الاسمان بالإنجليزية والعربية مطلوبان')); return }
    setError(null)
    startT(async () => { await onSave({ name_en: nameEn.trim(), name_ar: nameAr.trim(), parent_id: parentId, display_order: Number(displayOrder) }) })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
            {mode === 'add' ? t(locale, '+ Add Specialization', '+ إضافة تخصص') : t(locale, 'Edit Specialization', 'تعديل التخصص')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>{t(locale, 'Name (English) *', 'الاسم (إنجليزي) *')}</label>
            <input value={nameEn} onChange={e => setNameEn(e.target.value)} style={inp} placeholder="e.g. Screens & Displays" dir="ltr" />
          </div>
          <div>
            <label style={lbl}>{t(locale, 'Name (Arabic) *', 'الاسم (عربي) *')}</label>
            <input value={nameAr} onChange={e => setNameAr(e.target.value)} style={inp} placeholder="مثال: شاشات وعروض" dir="rtl" />
          </div>
          <div>
            <label style={lbl}>{t(locale, 'Parent Category (leave empty for root)', 'التصنيف الرئيسي (اتركه فارغاً للرئيسي)')}</label>
            <select value={parentId || ''} onChange={e => setParentId(e.target.value || null)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">{t(locale, '— Root category (no parent) —', '— تصنيف رئيسي (بدون أب) —')}</option>
              {parents.map(p => <option key={p.id} value={p.id}>{locale === 'ar' ? p.name_ar : p.name_en}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{t(locale, 'Display Order', 'ترتيب العرض')}</label>
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} style={{ ...inp, width: 120 }} min={0} />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}>
            {t(locale, 'Cancel', 'إلغاء')}
          </button>
          <button onClick={handleSave} disabled={isPending} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 700, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? '...' : t(locale, 'Save', 'حفظ')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SpecializationsManagerClient({
  locale, isAdmin, initialTree
}: {
  locale: string
  isAdmin: boolean
  initialTree: SpecializationTree[]
}) {
  const router = useRouter()
  const [tree, setTree]         = useState<SpecializationTree[]>(initialTree)
  const [modal, setModal]       = useState<{ mode: 'add' | 'edit'; parentId?: string | null; item?: any } | null>(null)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [, startT]              = useTransition()

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const refresh = () => startT(() => { router.refresh() })

  // Flatten for parent selection (only root items)
  const rootItems = tree.filter(n => !n.parent_id)

  const handleSave = async (data: { name_en: string; name_ar: string; parent_id: string | null; display_order: number }) => {
    const isEdit = modal?.mode === 'edit' && modal.item?.id
    const url = isEdit ? `/api/specializations/${modal.item.id}` : '/api/specializations'
    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit ? data : { ...data, slug: data.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) { showToast(json.error || t(locale, 'Error', 'خطأ'), false); return }
    showToast(isEdit ? t(locale, 'Updated ✓', 'تم التحديث ✓') : t(locale, 'Added ✓', 'تمت الإضافة ✓'))
    setModal(null)
    refresh()
  }

  const handleArchive = async (id: string) => {
    if (!confirm(t(locale, 'Archive this specialization?', 'هل تريد أرشفة هذا التخصص؟'))) return
    const res = await fetch(`/api/specializations/${id}/archive`, { method: 'POST' })
    if (!res.ok) { showToast(t(locale, 'Error archiving', 'خطأ في الأرشفة'), false); return }
    showToast(t(locale, 'Archived ✓', 'تمت الأرشفة ✓'))
    refresh()
  }

  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/specializations/${id}/restore`, { method: 'POST' })
    if (!res.ok) { showToast(t(locale, 'Error restoring', 'خطأ في الاستعادة'), false); return }
    showToast(t(locale, 'Restored ✓', 'تمت الاستعادة ✓'))
    refresh()
  }

  const handleHardDelete = async (id: string, name: string) => {
    if (!confirm(t(locale, `PERMANENTLY delete "${name}"? This cannot be undone.`, `حذف "${name}" نهائياً؟ لا يمكن التراجع.`))) return
    const res = await fetch(`/api/specializations/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast(t(locale, 'Error deleting', 'خطأ في الحذف'), false); return }
    showToast(t(locale, 'Deleted permanently ✓', 'تم الحذف النهائي ✓'))
    refresh()
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const renderNode = (node: SpecializationTree, depth = 0) => (
    <React.Fragment key={node.id}>
      <tr style={{ opacity: node.is_active ? 1 : 0.45 }}>
        <td style={{ paddingLeft: depth > 0 ? 32 : 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, fontSize: '0.83rem', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {depth > 0 && <span style={{ color: '#334155', marginRight: 6 }}>↳</span>}
          <span style={{ fontWeight: depth === 0 ? 700 : 500 }}>{node.name_en}</span>
          {!node.is_active && <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, fontSize: '0.62rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700 }}>Archived</span>}
          {node.children.length > 0 && <span style={{ marginLeft: 6, color: '#334155', fontSize: '0.68rem' }}>({node.children.length} sub)</span>}
        </td>
        <td style={{ padding: '12px 16px', fontSize: '0.83rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)', direction: 'rtl', textAlign: 'right' }}>{node.name_ar}</td>
        <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'monospace' }}>{node.slug}</td>
        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.72rem', color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{node.display_order}</td>
        <td style={{ padding: '12px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {depth === 0 && (
              <button onClick={() => setModal({ mode: 'add', parentId: node.id })} style={btn('#818cf8')}>
                + {t(locale, 'Sub', 'فرعي')}
              </button>
            )}
            <button onClick={() => setModal({ mode: 'edit', item: node, parentId: node.parent_id })} style={btn('#60a5fa')}>
              {t(locale, 'Edit', 'تعديل')}
            </button>
            {node.is_active ? (
              <button onClick={() => handleArchive(node.id)} style={btn('#f59e0b')}>
                {t(locale, 'Archive', 'أرشفة')}
              </button>
            ) : (
              <button onClick={() => handleRestore(node.id)} style={btn('#22c55e')}>
                {t(locale, 'Restore', 'استعادة')}
              </button>
            )}
            {isAdmin && !node.is_active && (
              <button onClick={() => handleHardDelete(node.id, node.name_en)} style={btn('#ef4444')}>
                {t(locale, 'Delete', 'حذف')}
              </button>
            )}
          </div>
        </td>
      </tr>
      {node.children.map(child => renderNode(child, depth + 1))}
    </React.Fragment>
  )

  return (
    <div style={{ direction: dir }}>
      <style>{`.spec-table th { padding: 10px 16px; text-align: left; font-size: 0.68rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.07); }`}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 99999, padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: '0.83rem', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.ok ? '#22c55e' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {modal && (
        <SpecModal
          locale={locale}
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.item : (modal.parentId ? { name_en: '', name_ar: '', parent_id: modal.parentId, display_order: 0 } : undefined)}
          parents={rootItems}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
            🏷️ {t(locale, 'Specializations', 'التخصصات')}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.82rem' }}>
            {t(locale,
              'Unified categories used across vendors, deals, and offers. Changes apply platform-wide.',
              'تصنيفات موحدة تُستخدم في الموردين والعروض والمنتجات. التغييرات تنعكس على المنصة كاملة.'
            )}
          </p>
        </div>
        <button onClick={() => setModal({ mode: 'add', parentId: null })} style={{
          padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
          fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
        }}>
          + {t(locale, 'Add Main Category', 'إضافة تصنيف رئيسي')}
        </button>
      </div>

      {!isAdmin && (
        <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.78rem', marginBottom: 20 }}>
          ⚠️ {t(locale, 'Staff can archive categories. Only admins can permanently delete.', 'يمكن للموظفين أرشفة التصنيفات. الحذف النهائي للأدمن فقط.')}
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
        <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>{t(locale, 'Name (EN)', 'الاسم (إنجليزي)')}</th>
              <th style={{ textAlign: 'right' }}>{t(locale, 'Name (AR)', 'الاسم (عربي)')}</th>
              <th>{t(locale, 'Slug', 'المعرف')}</th>
              <th style={{ textAlign: 'center' }}>{t(locale, 'Order', 'الترتيب')}</th>
              <th style={{ textAlign: 'right' }}>{t(locale, 'Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {tree.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 24px', color: '#334155', fontSize: '0.88rem' }}>
                {t(locale, 'No specializations yet — add your first one above.', 'لا توجد تخصصات بعد — أضف أول تخصص من الأعلى.')}
              </td></tr>
            ) : tree.map(node => renderNode(node))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
