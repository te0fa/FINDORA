'use client'
/**
 * src/app/[locale]/admin/link-domains/LinkDomainsClient.tsx
 *
 * Domain allowlist management UI.
 * Optimistic updates pattern — same as FeatureFlagsClient.tsx.
 */

import React, { useState, useTransition } from 'react'
import { addDomainAction, toggleDomainAction, deleteDomainAction } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DomainRow {
  id: string
  domain: string
  label: string
  enabled: boolean
  created_at: string
}

interface Props {
  initialDomains: DomainRow[]
  locale: string
  prefill?: string // pre-filled domain from ?prefill= query param (analytics quick-add)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LinkDomainsClient({ initialDomains, locale, prefill = '' }: Props) {
  const isAr = locale === 'ar'
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains)
  const [newDomain, setNewDomain] = useState(prefill)
  const [newLabel, setNewLabel]   = useState('')
  const [addError, setAddError]   = useState<string | null>(null)
  const [addLoading, startAdd]    = useTransition()
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting]   = useState<Set<string>>(new Set())
  const [toggling, setToggling]   = useState<Set<string>>(new Set())

  // ── Add Domain ──────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    startAdd(async () => {
      const result = await addDomainAction(newDomain.trim(), newLabel.trim())
      if (!result.success) {
        setAddError(result.error ?? 'خطأ غير معروف')
        return
      }
      // Optimistic insert
      setDomains(prev => [
        {
          id: `temp-${Date.now()}`,
          domain: newDomain.trim().toLowerCase(),
          label: newLabel.trim(),
          enabled: true,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setNewDomain('')
      setNewLabel('')
    })
  }

  // ── Toggle ──────────────────────────────────────────────────────────────────
  async function handleToggle(id: string, enabled: boolean) {
    setToggling(prev => new Set(prev).add(id))
    // Optimistic
    setDomains(prev => prev.map(d => d.id === id ? { ...d, enabled: !enabled } : d))
    const result = await toggleDomainAction(id, !enabled)
    if (!result.success) {
      // Revert
      setDomains(prev => prev.map(d => d.id === id ? { ...d, enabled } : d))
      setActionErrors(prev => ({ ...prev, [id]: result.error ?? 'خطأ' }))
    }
    setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الدومين نهائياً؟' : 'Permanently delete this domain?')) return
    setDeleting(prev => new Set(prev).add(id))
    const result = await deleteDomainAction(id)
    if (result.success) {
      setDomains(prev => prev.filter(d => d.id !== id))
    } else {
      setActionErrors(prev => ({ ...prev, [id]: result.error ?? 'خطأ في الحذف' }))
    }
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <style>{`
        .ld-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ld-title { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.25rem; }
        .ld-sub { color: #94a3b8; font-size: 0.875rem; margin: 0 0 1.5rem; }
        .ld-form { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
        .ld-input { background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; padding: 0.6rem 0.9rem; font-size: 0.875rem; flex: 1; min-width: 160px; outline: none; }
        .ld-input:focus { border-color: #6366f1; }
        .ld-input::placeholder { color: #475569; }
        .ld-btn { padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s; white-space: nowrap; }
        .ld-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ld-btn-primary { background: #6366f1; color: #fff; }
        .ld-btn-primary:hover:not(:disabled) { background: #4f46e5; }
        .ld-btn-danger { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.4rem 0.8rem; font-size: 0.8rem; }
        .ld-btn-danger:hover:not(:disabled) { background: #ef444420; }
        .ld-error { color: #f87171; font-size: 0.8rem; margin-top: 0.5rem; }
        .ld-table { width: 100%; border-collapse: collapse; }
        .ld-table th { text-align: start; color: #64748b; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; }
        .ld-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #0f172a; font-size: 0.875rem; color: #cbd5e1; vertical-align: middle; }
        .ld-table tr:last-child td { border-bottom: none; }
        .ld-table tr:hover td { background: #0d1526; }
        .ld-domain { font-family: monospace; color: #a5b4fc; font-weight: 600; }
        .ld-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
        .ld-badge-on  { background: #14532d40; color: #4ade80; border: 1px solid #16a34a40; }
        .ld-badge-off { background: #7f1d1d40; color: #f87171; border: 1px solid #dc262640; }
        .ld-toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
        .ld-toggle input { opacity: 0; width: 0; height: 0; }
        .ld-slider { position: absolute; inset: 0; background: #334155; border-radius: 22px; transition: 0.2s; }
        .ld-slider:before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
        input:checked + .ld-slider { background: #6366f1; }
        input:checked + .ld-slider:before { transform: translateX(18px); }
        .ld-row-actions { display: flex; gap: 0.5rem; align-items: center; }
        .ld-empty { text-align: center; color: #475569; padding: 3rem; }
      `}</style>

      <h1 className="ld-title">
        {isAr ? '🔗 دومينات الروابط المسموح بها' : '🔗 Allowed Link Domains'}
      </h1>
      <p className="ld-sub">
        {isAr
          ? 'أضف أو عدّل الدومينات التي يسمح للعملاء بلصق روابط منها. التغييرات فورية (30 ثانية cache).'
          : 'Add or manage domains customers can paste product links from. Changes propagate within 30s cache TTL.'}
      </p>

      {/* Add Domain Form */}
      <div className="ld-card">
        <form onSubmit={handleAdd}>
          <div className="ld-form">
            <input
              className="ld-input"
              placeholder={isAr ? 'الدومين (مثال: jumia.com.eg)' : 'Domain (e.g. jumia.com.eg)'}
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <input
              className="ld-input"
              placeholder={isAr ? 'الاسم (مثال: جوميا مصر)' : 'Label (e.g. Jumia Egypt)'}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              required
            />
            <button type="submit" className="ld-btn ld-btn-primary" disabled={addLoading}>
              {addLoading
                ? (isAr ? 'جاري الإضافة...' : 'Adding...')
                : (isAr ? '+ إضافة دومين' : '+ Add Domain')}
            </button>
          </div>
          {addError && <p className="ld-error">⚠️ {addError}</p>}
        </form>
      </div>

      {/* Domains Table */}
      <div className="ld-card" style={{ padding: 0, overflow: 'hidden' }}>
        {domains.length === 0 ? (
          <p className="ld-empty">{isAr ? 'لا توجد دومينات بعد' : 'No domains yet'}</p>
        ) : (
          <table className="ld-table">
            <thead>
              <tr>
                <th>{isAr ? 'الدومين' : 'Domain'}</th>
                <th>{isAr ? 'الاسم' : 'Label'}</th>
                <th>{isAr ? 'الحالة' : 'Status'}</th>
                <th>{isAr ? 'تاريخ الإضافة' : 'Added'}</th>
                <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <tr key={d.id}>
                  <td><span className="ld-domain">{d.domain}</span></td>
                  <td>{d.label}</td>
                  <td>
                    <span className={`ld-badge ${d.enabled ? 'ld-badge-on' : 'ld-badge-off'}`}>
                      {d.enabled ? (isAr ? '✓ مفعّل' : '✓ Active') : (isAr ? '○ معطّل' : '○ Disabled')}
                    </span>
                  </td>
                  <td>{fmt(d.created_at, locale)}</td>
                  <td>
                    <div className="ld-row-actions">
                      {/* Toggle switch */}
                      <label className="ld-toggle" title={d.enabled ? (isAr ? 'تعطيل' : 'Disable') : (isAr ? 'تفعيل' : 'Enable')}>
                        <input
                          type="checkbox"
                          checked={d.enabled}
                          disabled={toggling.has(d.id)}
                          onChange={() => handleToggle(d.id, d.enabled)}
                        />
                        <span className="ld-slider" />
                      </label>
                      {/* Delete button */}
                      <button
                        className="ld-btn ld-btn-danger"
                        disabled={deleting.has(d.id)}
                        onClick={() => handleDelete(d.id)}
                      >
                        {deleting.has(d.id) ? '...' : (isAr ? 'حذف' : 'Delete')}
                      </button>
                    </div>
                    {actionErrors[d.id] && (
                      <p className="ld-error">{actionErrors[d.id]}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
