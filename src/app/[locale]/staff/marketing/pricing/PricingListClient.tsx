'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PricingRowActions from './PricingRowActions'
import { handleBulkDeletePricingVersions, handleBulkHardDeletePricingVersions } from './actions'

interface PricingVersion {
  id: string
  service_key: string
  version_no: number
  original_price: string | number | null
  current_price: string | number
  promo_label_en: string | null
  promo_label_ar: string | null
  starts_at: string | null
  ends_at: string | null
  expires_at: string | null
  is_active: boolean
  serviceTitle: string
  is_promo: boolean
  is_promo_version: boolean
}

interface PricingListClientProps {
  initialPricingList: PricingVersion[]
  tab: string
  locale: string
  isRTL: boolean
}

export default function PricingListClient({ initialPricingList, tab, locale, isRTL }: PricingListClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedIds([])
    setError(null)
  }, [tab])

  const getServiceIcon = (key: string) => {
    switch (key) {
      case 'everyday_purchase': return { icon: '🛒', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' }
      case 'high_value_asset':
      case 'high_value_deals': return { icon: '💎', color: '#d4a63c', bg: 'rgba(212,166,60,0.1)', border: 'rgba(212,166,60,0.2)' }
      case 'project_supply':
      case 'projects_supplies': return { icon: '💼', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)' }
      default: return { icon: '⚙️', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' }
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === initialPricingList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(initialPricingList.map(v => v.id))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBulkAction = (actionType: 'delete' | 'hard_delete') => {
    if (selectedIds.length === 0) return

    const confirmMsg = actionType === 'hard_delete'
      ? (isRTL ? `سيتم مسح ${selectedIds.length} من العروض نهائياً من قاعدة البيانات، هل أنت متأكد؟` : `Permanently delete ${selectedIds.length} versions? This cannot be undone.`)
      : (isRTL ? `أرشفة ${selectedIds.length} من العروض المحددة؟` : `Archive ${selectedIds.length} selected versions?`)

    if (!confirm(confirmMsg)) return

    setError(null)
    startTransition(async () => {
      let res
      if (actionType === 'hard_delete') {
        res = await handleBulkHardDeletePricingVersions(selectedIds, locale)
      } else {
        res = await handleBulkDeletePricingVersions(selectedIds, locale)
      }

      if (res?.success) {
        setSelectedIds([])
        router.refresh()
      } else if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ── Selection Control Bar ── */}
      {initialPricingList.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '0.75rem 1.25rem',
          borderRadius: '14px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              <input
                type="checkbox"
                checked={initialPricingList.length > 0 && selectedIds.length === initialPricingList.length}
                onChange={handleToggleSelectAll}
                style={{ width: '16px', height: '16px', accentColor: '#d4a63c', cursor: 'pointer' }}
              />
              {isRTL ? 'تحديد الكل' : 'Select All'}
            </label>
            {selectedIds.length > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4a63c', background: 'rgba(212,166,60,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                {isRTL ? `تم تحديد ${selectedIds.length}` : `${selectedIds.length} Selected`}
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {error && <span style={{ fontSize: '0.7rem', color: '#f43f5e', marginRight: '0.5rem' }}>⚠️ {error}</span>}
              
              {tab === 'deleted' ? (
                <button
                  onClick={() => handleBulkAction('hard_delete')}
                  disabled={isPending}
                  style={{
                    padding: '0.45rem 1rem',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRTL ? 'حذف نهائي ⚠️' : 'Hard Delete ⚠️'}
                </button>
              ) : (
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={isPending}
                  style={{
                    padding: '0.45rem 1rem',
                    background: 'rgba(220,38,38,0.2)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRTL ? 'أرشفة المحدد' : 'Archive Selected'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid List */}
      {initialPricingList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '18px', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 600, width: '100%' }}>
          {tab === 'scheduled' ? (isRTL ? '📅 لا يوجد تسعير مجدول' : '📅 No scheduled pricing') :
           tab === 'expired' ? (isRTL ? '⏰ لا يوجد تسعير منتهى الصلاحية' : '⏰ No expired pricing') :
           tab === 'deleted' ? (isRTL ? '🗑️ لا يوجد أرشيف محذوف' : '🗑️ No deleted records') :
           (isRTL ? '✨ لا يوجد تسعير نشط' : '✨ No active pricing')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', width: '100%' }}>
          {initialPricingList.map((v) => {
            const ui = getServiceIcon(v.service_key)
            const showPromo = v.is_promo && v.is_active
            const isBaseVersion = !v.is_promo_version
            const isSelected = selectedIds.includes(v.id)

            return (
              <div
                key={v.id}
                data-testid="pricing-service-row"
                id={`pricing-version-${v.id}`}
                style={{
                  background: showPromo
                    ? 'linear-gradient(135deg, rgba(212,166,60,0.06) 0%, rgba(245,158,11,0.03) 100%)'
                    : isBaseVersion
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(255,255,255,0.015)',
                  border: isSelected
                    ? '1.5px solid #d4a63c'
                    : showPromo
                    ? '1px solid rgba(212,166,60,0.25)'
                    : isBaseVersion
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Checkbox Select Toggle */}
                <div style={{ position: 'absolute', top: '10px', [isRTL ? 'left' : 'right']: '10px', zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectOne(v.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#d4a63c',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(0,0,0,0.3)'
                    }}
                  />
                </div>

                {/* Card shimmer effect */}
                {showPromo && (
                  <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #d4a63c, transparent)' }} />
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', paddingRight: isRTL ? 0 : '1.5rem', paddingLeft: isRTL ? '1.5rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: ui.bg, border: `1px solid ${ui.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                      {ui.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'white', marginBottom: '0.15rem' }}>{v.serviceTitle}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{v.service_key} · v{v.version_no}</div>
                    </div>
                  </div>
                  {/* Type badge */}
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px', letterSpacing: '0.05em',
                    ...(showPromo
                      ? { background: 'rgba(212,166,60,0.15)', color: '#d4a63c', border: '1px solid rgba(212,166,60,0.25)' }
                      : isBaseVersion
                      ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' })
                  }}>
                    {showPromo ? '🎁 PROMO' : isBaseVersion ? '📌 BASE' : '📄'}
                  </span>
                </div>

                {/* Price row */}
                <div>
                  {showPromo ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d4a63c', lineHeight: 1 }}>
                        {v.current_price}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>EGP</span>
                      {v.original_price && Number(v.original_price) !== Number(v.current_price) && (
                        <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.25)' }}>
                          {v.original_price} EGP
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                        {v.current_price}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>EGP</span>
                    </div>
                  )}
                  {showPromo && (v.promo_label_en || v.promo_label_ar) && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24' }}>
                      🏷️ {isRTL ? v.promo_label_ar : v.promo_label_en}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📅 {isRTL ? 'البدء' : 'Start'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                      {v.starts_at ? new Date(v.starts_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : (isRTL ? 'فوري' : 'Immediately')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>⏰ {isRTL ? 'الانتهاء' : 'Expires'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                      {v.ends_at || v.expires_at
                        ? new Date((v.ends_at || v.expires_at)!).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')
                        : (isRTL ? 'مستمر' : 'Never')}
                    </span>
                  </div>
                </div>

                <PricingRowActions 
                  id={v.id} 
                  isActive={v.is_active} 
                  isDeleted={tab === 'deleted'}
                  locale={locale} 
                  isRTL={isRTL} 
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
