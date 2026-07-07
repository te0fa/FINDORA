'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { handleBulkDeletePricingVersions, handleBulkHardDeletePricingVersions } from '../actions'

interface PromoData {
  id: string
  serviceKey: string
  serviceTitleEn: string
  serviceTitleAr: string
  promoLabelEn: string | null
  promoLabelAr: string | null
  versionNo: number
  price: number | string
  originalPrice: number | string | null
  currency: string
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  durationDays: number
  customersCount: number
  revenue: number
  rating: number
}

interface AnalyticsClientProps {
  promos: PromoData[]
  locale: string
  isRTL: boolean
}

export default function AnalyticsClient({ promos: initialPromos, locale, isRTL }: AnalyticsClientProps) {
  const [promos, setPromos] = useState<PromoData[]>(initialPromos)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState('all')
  const [selectedPerformance, setSelectedPerformance] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 1. Filter logic
  const filteredPromos = promos.filter(p => {
    const label = (isRTL ? p.promoLabelAr : p.promoLabelEn) || ''
    const serviceName = (isRTL ? p.serviceTitleAr : p.serviceTitleEn) || ''
    const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.serviceKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          serviceName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesService = selectedService === 'all' || p.serviceKey === selectedService

    let matchesPerformance = true
    if (selectedPerformance === 'high') {
      matchesPerformance = p.rating >= 4
    } else if (selectedPerformance === 'medium') {
      matchesPerformance = p.rating === 3
    } else if (selectedPerformance === 'low') {
      matchesPerformance = p.rating <= 2
    }

    return matchesSearch && matchesService && matchesPerformance
  })

  // 2. Multi-selection logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPromos.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  // 3. Actions: Bulk Archive (Soft Delete)
  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return
    if (!confirm(isRTL ? `هل أنت متأكد من أرشفة ${selectedIds.length} من العروض المحددة؟` : `Are you sure you want to archive ${selectedIds.length} selected promos?`)) return

    startTransition(async () => {
      const res = await handleBulkDeletePricingVersions(selectedIds, locale)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: isRTL ? 'تم نقل العروض للأرشيف بنجاح.' : 'Promos archived successfully.' })
        setPromos(prev => prev.filter(p => !selectedIds.includes(p.id)))
        setSelectedIds([])
      }
    })
  }

  // 4. Actions: Bulk Hard Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (!confirm(isRTL ? `تحذير: هل أنت متأكد من حذف ${selectedIds.length} من العروض المحددة نهائياً؟` : `Warning: Are you sure you want to permanently delete ${selectedIds.length} selected promos?`)) return

    startTransition(async () => {
      const res = await handleBulkHardDeletePricingVersions(selectedIds, locale)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: isRTL ? 'تم حذف العروض المحددة نهائياً.' : 'Selected promos permanently deleted.' })
        setPromos(prev => prev.filter(p => !selectedIds.includes(p.id)))
        setSelectedIds([])
      }
    })
  }

  // Calculate high level metrics
  const totalRevenue = filteredPromos.reduce((sum, p) => sum + p.revenue, 0)
  const totalOrders = filteredPromos.reduce((sum, p) => sum + p.customersCount, 0)
  const bestPromo = [...filteredPromos].sort((a, b) => b.revenue - a.revenue)[0]

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* ── Feedback Message ── */}
      {message && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: message.type === 'success' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
          borderRadius: '14px',
          color: message.type === 'success' ? '#34d399' : '#fca5a5',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.type === 'success' ? '✅' : '⚠️'} {message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* ── Key Metrics Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📊 {isRTL ? 'إجمالي أرباح العروض' : 'Total Promo Revenue'}
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 950, color: '#34d399' }}>{totalRevenue.toLocaleString()} EGP</span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{isRTL ? 'إجمالي الدفعات المؤكدة خلال فترات العروض' : 'Sum of confirmed payments during promos'}</span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            👥 {isRTL ? 'الطلبات الملباة' : 'Requests Served'}
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 950, color: '#60a5fa' }}>{totalOrders} {isRTL ? 'طلب' : 'Requests'}</span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{isRTL ? 'إجمالي العملاء المتفاعلين مع العروض' : 'Customers who converted during campaign'}</span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔥 {isRTL ? 'العرض الأكثر ربحية' : 'Top Performing Campaign'}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d4a63c', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {bestPromo ? (isRTL ? bestPromo.promoLabelAr : bestPromo.promoLabelEn) || bestPromo.serviceKey : '—'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            {bestPromo ? `${bestPromo.revenue.toLocaleString()} EGP` : '—'}
          </span>
        </div>
      </div>

      {/* ── Filters & Action Bar ── */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Left: Input Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder={isRTL ? 'ابحث باسم العرض أو نوع الخدمة...' : 'Search by label or service key...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.8rem',
              outline: 'none',
              minWidth: '240px',
              flex: 1
            }}
          />

          <select
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isRTL ? 'كل الخدمات' : 'All Services'}</option>
            <option value="everyday_purchase">{isRTL ? 'مشتريات يومية' : 'Everyday Purchase'}</option>
            <option value="high_value_deals">{isRTL ? 'أصول عالية القيمة' : 'High Value Deals'}</option>
            <option value="projects_supplies">{isRTL ? 'توريدات مشاريع' : 'Projects & Supplies'}</option>
          </select>

          <select
            value={selectedPerformance}
            onChange={e => setSelectedPerformance(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isRTL ? 'كل التقييمات' : 'All Performance'}</option>
            <option value="high">{isRTL ? 'أداء مرتفع (⭐⭐⭐⭐+)' : 'High Performance'}</option>
            <option value="medium">{isRTL ? 'أداء متوسط (⭐⭐⭐)' : 'Medium Performance'}</option>
            <option value="low">{isRTL ? 'أداء منخفض (⭐⭐-)' : 'Low Performance'}</option>
          </select>
        </div>

        {/* Right: Bulk action controls */}
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              {isRTL ? `محدد: ${selectedIds.length}` : `Selected: ${selectedIds.length}`}
            </span>
            <button
              onClick={handleBulkArchive}
              disabled={isPending}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#f59e0b',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📥 {isRTL ? 'أرشفة' : 'Archive'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🗑️ {isRTL ? 'حذف نهائي' : 'Hard Delete'}
            </button>
          </div>
        )}
      </div>

      {/* ── Table Log Container ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '1rem 1.25rem', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredPromos.length > 0 && selectedIds.length === filteredPromos.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  {isRTL ? 'اسم العرض الترويجي' : 'Promotion Label'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  {isRTL ? 'الخدمة' : 'Service'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
                  {isRTL ? 'نسبة الخصم' : 'Discount Rate'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
                  {isRTL ? 'المدة (أيام)' : 'Duration'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
                  {isRTL ? 'التحويلات' : 'Conversions'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'right' }}>
                  {isRTL ? 'إجمالي الإيرادات' : 'Revenue Generated'}
                </th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
                  {isRTL ? 'تقييم الأداء' : 'Rating'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem 1.25rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {isRTL ? '📭 لا يوجد أي سجلات مطابقة للعروض.' : '📭 No matching promo logs found.'}
                  </td>
                </tr>
              ) : (
                filteredPromos.map(p => {
                  const label = (isRTL ? p.promoLabelAr : p.promoLabelEn) || (isRTL ? 'عرض مخصص' : 'Custom Offer')
                  const serviceName = (isRTL ? p.serviceTitleAr : p.serviceTitleEn) || p.serviceKey
                  
                  // Calculate discount percentage
                  let discountPercent = 0
                  const original = Number(p.originalPrice || 0)
                  const current = Number(p.price || 0)
                  if (original > 0 && original > current) {
                    discountPercent = Math.round(((original - current) / original) * 100)
                  }

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: selectedIds.includes(p.id) ? 'rgba(212,166,60,0.03)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={e => handleSelectOne(p.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'white' }}>{label}</div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                          ID: {p.id.slice(0, 8)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#cbd5e1' }}>{serviceName}</div>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                          v{p.versionNo}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        {discountPercent > 0 ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171'
                          }}>
                            -{discountPercent}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                        {p.durationDays} {isRTL ? 'يوم' : 'd'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white' }}>{p.customersCount}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '0.82rem', fontWeight: 900, color: '#34d399' }}>
                        {p.revenue.toLocaleString()} EGP
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              style={{
                                color: i < p.rating ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                                fontSize: '0.75rem'
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
