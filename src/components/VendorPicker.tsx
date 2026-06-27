'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VendorOption {
  id:                     string
  display_name:           string
  trust_score:            number
  account_tier:           string
  system_status:          string
  total_successful_deals: number
  specializations:        Array<{ id: string; slug: string; name_en: string; name_ar: string }>
  categories:             string[]
}

export interface VendorPickerValue {
  id:           string
  display_name: string
}

interface VendorPickerProps {
  locale:             string
  value?:             VendorPickerValue | null
  onChange:           (vendor: VendorPickerValue | null) => void
  specializationId?:  string
  allowCreate?:       boolean
  placeholder?:       string
  disabled?:          boolean
}

// ─── Text helpers ──────────────────────────────────────────────────────────────

const t = (locale: string, en: string, ar: string) => locale === 'ar' ? ar : en

// ─── Trust Badge (inline) ─────────────────────────────────────────────────────

function MiniTrustBadge({ score, locale }: { score: number; locale: string }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'
  const label = score >= 90 ? t(locale, 'Excellent', 'ممتاز') : score >= 70 ? t(locale, 'Good', 'جيد') : t(locale, 'Low', 'ضعيف')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700,
      color, background: `${color}18`, border: `1px solid ${color}33`,
    }}>
      {score}% · {label}
    </span>
  )
}

// ─── Quick Add Modal ──────────────────────────────────────────────────────────

interface QuickAddProps {
  locale:         string
  initialName:    string
  onClose:        () => void
  onCreated:      (v: VendorPickerValue) => void
}

function QuickAddModal({ locale, initialName, onClose, onCreated }: QuickAddProps) {
  const [name, setName]           = useState(initialName)
  const [whatsapp, setWhatsapp]   = useState('')
  const [governorate, setGov]     = useState('')
  const [isPending, startT]       = useTransition()
  const [error, setError]         = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim()) { setError(t(locale, 'Name is required', 'الاسم مطلوب')); return }
    setError(null)
    startT(async () => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:    name.trim(),
          whatsapp_number: whatsapp || undefined,
          governorate:     governorate || undefined,
          specialization_ids: [],
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || t(locale, 'Error creating vendor', 'خطأ في الإضافة')); return }
      onCreated({ id: json.id, display_name: json.display_name })
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 28, maxWidth: 440, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
            {t(locale, '+ Quick Add Vendor', '+ إضافة مورد سريع')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>

        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.78rem' }}>
          {t(locale,
            'Vendor will be saved as "Pending Verification" — you can complete details from the Vendors page.',
            'سيتم حفظ المورد بحالة "قيد المراجعة" — يمكن إكمال بياناته لاحقاً من صفحة الموردين.'
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelS}>{t(locale, 'Vendor Name *', 'اسم المورد *')}</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputS}
              placeholder={t(locale, 'e.g. Al Nour Electronics', 'مثال: شركة النور للإلكترونيات')} />
          </div>
          <div>
            <label style={labelS}>{t(locale, 'WhatsApp Number', 'رقم واتساب')}</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inputS}
              placeholder="+201012345678" />
          </div>
          <div>
            <label style={labelS}>{t(locale, 'Governorate', 'المحافظة')}</label>
            <input value={governorate} onChange={e => setGov(e.target.value)} style={inputS}
              placeholder={t(locale, 'e.g. Cairo', 'مثال: القاهرة')} />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnS}>{t(locale, 'Cancel', 'إلغاء')}</button>
          <button onClick={handleCreate} disabled={isPending} style={createBtnS}>
            {isPending ? '...' : t(locale, 'Add Vendor', 'إضافة المورد')}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelS: React.CSSProperties = { display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 5 }
const inputS: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f8fafc', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none'
}
const cancelBtnS: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600
}
const createBtnS: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 700,
  boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
}

// ─── Duplicate Warning ────────────────────────────────────────────────────────

interface DuplicateWarningProps {
  locale:    string
  similar:   Array<{ id: string; display_name: string; system_status: string }>
  typedName: string
  onSelect:  (v: VendorPickerValue) => void
  onProceed: () => void
}

function DuplicateWarning({ locale, similar, typedName, onSelect, onProceed }: DuplicateWarningProps) {
  return (
    <div style={{
      marginTop: 6, padding: '12px 14px', borderRadius: 12,
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    }}>
      <p style={{ margin: '0 0 8px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700 }}>
        ⚠️ {t(locale, 'Similar vendor names found — is one of these the same?', 'تم العثور على أسماء مشابهة — هل أحدها هو نفسه؟')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {similar.map(v => (
          <button key={v.id} onClick={() => onSelect({ id: v.id, display_name: v.display_name })}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.08)', color: '#fbbf24', cursor: 'pointer',
              textAlign: 'left', fontSize: '0.8rem', fontWeight: 600
            }}>
            ✓ {v.display_name} <span style={{ color: '#64748b', fontWeight: 400 }}>({v.system_status})</span>
          </button>
        ))}
        <button onClick={onProceed} style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)',
          background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer',
          textAlign: 'left', fontSize: '0.8rem', fontWeight: 600
        }}>
          {t(locale, `+ No, "${typedName}" is a new vendor`, `+ لا، "${typedName}" مورد جديد`)}
        </button>
      </div>
    </div>
  )
}

// ─── Main VendorPicker ────────────────────────────────────────────────────────

export default function VendorPicker({
  locale,
  value,
  onChange,
  specializationId,
  allowCreate = true,
  placeholder,
  disabled,
}: VendorPickerProps) {
  const [query, setQuery]               = useState(value?.display_name || '')
  const [results, setResults]           = useState<VendorOption[]>([])
  const [isOpen, setIsOpen]             = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [similar, setSimilar]           = useState<Array<{ id: string; display_name: string; system_status: string }>>([])
  const [showDupWarn, setShowDupWarn]   = useState(false)
  const [pendingName, setPendingName]   = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const defaultPlaceholder = t(locale, 'Search vendors...', 'ابحث عن مورد...')

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Search with debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim() || value) {
      setResults([])
      return
    }
    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ q: query })
        if (specializationId) params.set('spec', specializationId)
        const res = await fetch(`/api/vendors/search?${params}`)
        const data = await res.json()
        setResults(data.vendors || [])
        setIsOpen(true)
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }, [query, specializationId, value])

  const handleSelect = (v: VendorOption) => {
    onChange({ id: v.id, display_name: v.display_name })
    setQuery(v.display_name)
    setIsOpen(false)
    setResults([])
    setSimilar([])
    setShowDupWarn(false)
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSimilar([])
    setShowDupWarn(false)
  }

  const handleAddNew = async (name: string) => {
    // Check for duplicates before showing quick add
    const res = await fetch(`/api/vendors/check-duplicate?name=${encodeURIComponent(name)}`)
    const data = await res.json()
    if (data.similar && data.similar.length > 0) {
      setSimilar(data.similar)
      setPendingName(name)
      setShowDupWarn(true)
    } else {
      setPendingName(name)
      setShowQuickAdd(true)
    }
    setIsOpen(false)
  }

  const handleDupSelect = (v: VendorPickerValue) => {
    onChange(v)
    setQuery(v.display_name)
    setShowDupWarn(false)
    setSimilar([])
  }

  const handleDupProceed = () => {
    setShowDupWarn(false)
    setSimilar([])
    setShowQuickAdd(true)
  }

  const handleQuickCreated = (v: VendorPickerValue) => {
    onChange(v)
    setQuery(v.display_name)
    setShowQuickAdd(false)
  }

  const tierColor: Record<string, string> = { Gold: '#f7d46b', Silver: '#94a3b8', Bronze: '#cd7f32' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder={placeholder || defaultPlaceholder}
          disabled={disabled}
          style={{
            width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10,
            background: value ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.05)',
            border: value ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc', fontSize: '0.85rem', fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box' as const,
            transition: 'all 0.2s',
          }}
        />
        {/* Status icon */}
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
          {isLoading && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>⟳</span>}
          {value && (
            <button onClick={handleClear} style={{
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
              fontSize: '1rem', lineHeight: 1, padding: 0
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Selected vendor info */}
      {value && (
        <div style={{
          marginTop: 6, padding: '8px 12px', borderRadius: 9,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ color: '#818cf8', fontSize: '0.8rem' }}>✓</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600 }}>{value.display_name}</span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && results.length > 0 && !value && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, zIndex: 9000, overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          maxHeight: 300, overflowY: 'auto'
        }}>
          {results.map(v => (
            <button key={v.id} onClick={() => handleSelect(v)} style={{
              width: '100%', padding: '10px 14px', background: 'transparent',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer', textAlign: 'left', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', gap: 12,
              transition: 'background 0.15s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>{v.display_name}</div>
                <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: 2 }}>
                  {v.total_successful_deals} {t(locale, 'deals', 'صفقة')}
                  {v.specializations.length > 0 && ' · ' + v.specializations.map(s => locale === 'ar' ? s.name_ar : s.name_en).join(', ')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <MiniTrustBadge score={v.trust_score} locale={locale} />
                <span style={{ fontSize: '0.65rem', color: tierColor[v.account_tier] || '#94a3b8', fontWeight: 700 }}>
                  {v.account_tier}
                </span>
              </div>
            </button>
          ))}
          {allowCreate && query.trim().length > 1 && (
            <button onClick={() => handleAddNew(query.trim())} style={{
              width: '100%', padding: '10px 14px', background: 'rgba(99,102,241,0.06)',
              border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer', textAlign: 'left', color: '#818cf8',
              fontSize: '0.83rem', fontWeight: 700
            }}>
              + {t(locale, `Add "${query.trim()}" as new vendor`, `إضافة "${query.trim()}" كمورد جديد`)}
            </button>
          )}
        </div>
      )}

      {/* No results + add option */}
      {isOpen && !isLoading && results.length === 0 && query.trim().length > 1 && !value && allowCreate && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, zIndex: 9000, overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}>
          <button onClick={() => handleAddNew(query.trim())} style={{
            width: '100%', padding: '12px 14px', background: 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            color: '#818cf8', fontSize: '0.83rem', fontWeight: 700
          }}>
            + {t(locale, `"${query.trim()}" not found — Add as new vendor`, `"${query.trim()}" غير موجود — إضافة كمورد جديد`)}
          </button>
        </div>
      )}

      {/* Duplicate warning */}
      {showDupWarn && (
        <DuplicateWarning
          locale={locale}
          similar={similar}
          typedName={pendingName}
          onSelect={handleDupSelect}
          onProceed={handleDupProceed}
        />
      )}

      {/* Quick add modal */}
      {showQuickAdd && (
        <QuickAddModal
          locale={locale}
          initialName={pendingName}
          onClose={() => setShowQuickAdd(false)}
          onCreated={handleQuickCreated}
        />
      )}
    </div>
  )
}
