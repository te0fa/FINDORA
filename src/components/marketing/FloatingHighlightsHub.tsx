'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Announcement {
  id: string
  title_en: string
  title_ar: string
  body_en?: string
  body_ar?: string
  link_url?: string
  announcement_type: string
}

interface Deal {
  id: string
  title_en: string
  title_ar: string
  description_en?: string
  description_ar?: string
  original_price?: number
  deal_price: number
  currency_code: string
  image_path?: string
  category?: string
}

export default function FloatingHighlightsHub({ 
  offers, 
  deals, 
  locale,
  dict 
}: { 
  offers: Announcement[], 
  deals: Deal[], 
  locale: string,
  dict: any
}) {
  const [activeTab, setActiveTab] = useState<'service' | 'product'>('service')
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pulse, setPulse] = useState(false)
  const isRTL = locale.startsWith('ar')

  // Total count for the red notification badge
  const totalCount = (offers?.length || 0) + (deals?.length || 0)

  // Pulse animation on mount to draw attention
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const hasOffers = offers && offers.length > 0
  const hasDeals = deals && deals.length > 0

  useEffect(() => {
    if (!hasOffers && hasDeals) setActiveTab('product')
  }, [hasOffers, hasDeals])

  if ((!hasOffers && !hasDeals) || !isVisible) return null

  const items = activeTab === 'service' ? offers : deals
  const current = items[currentIndex]

  const next = () => setCurrentIndex((prev) => (prev + 1) % items.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)

  const getSafeLink = (url: string | undefined) => {
    if (!url) return null
    const lowerUrl = url.toLowerCase().trim()
    if (lowerUrl.startsWith('http')) return url
    if (lowerUrl === 'pricing' || lowerUrl === '/pricing' || lowerUrl === '#pricing' || lowerUrl.includes('everyday_purchase')) {
      return `/${locale}#pricing`
    }
    if (lowerUrl === 'deals' || lowerUrl === '/deals' || lowerUrl === '#deals') return `/${locale}/deals`
    if (url.startsWith('/')) {
      if (url.startsWith(`/${locale}/`) || url === `/${locale}`) return url
      return `/${locale}${url}`
    }
    return `/${locale}/${url.startsWith('/') ? url.slice(1) : url}`
  }

  const safeHref = activeTab === 'service' 
    ? getSafeLink((current as Announcement).link_url)
    : `/${locale}/deals`

  // ─── MINIMIZED PILL ─────────────────────────────────────────────────────────
  if (isMinimized) {
    const pillLabel = isRTL ? '🎁 عروض فايندورا' : '🎁 Findora Highlights'

    return (
      <button
        onClick={() => { setIsMinimized(false); setPulse(false) }}
        data-testid="floating-hub-trigger"
        aria-label={pillLabel}
        style={{
          position: 'fixed',
          bottom: '28px',
          [isRTL ? 'left' : 'right']: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(12, 18, 35, 0.96)',
          border: `2px solid ${pulse ? '#d4a63c' : 'rgba(212,166,60,0.5)'}`,
          boxShadow: pulse
            ? '0 0 0 4px rgba(212,166,60,0.12), 0 12px 32px rgba(0,0,0,0.6)'
            : '0 8px 28px rgba(0,0,0,0.6)',
          zIndex: 1000,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
          animation: pulse ? 'pillPulse 2s ease-in-out infinite' : 'none',
          fontFamily: 'inherit'
        }}
      >
        <span style={{ fontSize: '24px' }}>🎁</span>

        {/* Red notification badge positioned at the top edge */}
        {totalCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 900,
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            animation: 'badgeBounce 2s ease-in-out infinite'
          }}>
            {totalCount}
          </span>
        )}

        <style>{`
          @keyframes pillPulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(212,166,60,0.15), 0 16px 48px rgba(0,0,0,0.6); }
            50% { box-shadow: 0 0 0 8px rgba(212,166,60,0.08), 0 16px 48px rgba(212,166,60,0.2); }
          }
          @keyframes liveDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
          @keyframes badgeBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          @media (max-width: 640px) {
            [data-testid="floating-hub-trigger"] {
              bottom: 20px !important;
              ${isRTL ? 'left: 16px !important;' : 'right: 16px !important;'}
            }
          }
        `}</style>
      </button>
    )
  }

  // ─── EXPANDED HUB ───────────────────────────────────────────────────────────
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="floating-highlights-hub"
      style={{
        position: 'fixed',
        bottom: '32px',
        [isRTL ? 'left' : 'right']: '32px',
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 1001,
        background: 'rgba(10, 14, 28, 0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(212,166,60,0.3)',
        borderRadius: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'hubSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
        fontFamily: 'inherit'
      }}
    >
      {/* Gold top shimmer line */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #d4a63c 40%, #f59e0b 60%, transparent)', opacity: 0.8 }} />

      <div style={{ padding: '1.125rem' }}>
        {/* ── Header: tabs + close ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '6px', flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px' }}>
            {hasOffers && (
              <button
                onClick={() => { setActiveTab('service'); setCurrentIndex(0) }}
                data-testid="hub-tab-service"
                className={activeTab === 'service' ? 'active' : ''}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '9px 6px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 800, transition: 'all 0.25s', position: 'relative',
                  ...(activeTab === 'service'
                    ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))', color: '#fca5a5', boxShadow: '0 2px 12px rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' })
                }}
              >
                <span style={{ fontSize: '15px' }}>🎁</span>
                <span>{isRTL ? 'الخصومات' : 'Offers'}</span>
                {/* Tab badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '18px', height: '18px', borderRadius: '999px',
                  background: activeTab === 'service' ? '#ef4444' : 'rgba(239,68,68,0.3)',
                  color: '#fff', fontSize: '10px', fontWeight: 900, padding: '0 4px',
                  boxShadow: activeTab === 'service' ? '0 0 10px rgba(239,68,68,0.5)' : 'none'
                }}>
                  {offers.length}
                </span>
              </button>
            )}
            {hasDeals && (
              <button
                onClick={() => { setActiveTab('product'); setCurrentIndex(0) }}
                data-testid="hub-tab-product"
                className={activeTab === 'product' ? 'active' : ''}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '9px 6px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 800, transition: 'all 0.25s', position: 'relative',
                  ...(activeTab === 'product'
                    ? { background: 'linear-gradient(135deg, rgba(212,166,60,0.2), rgba(212,166,60,0.05))', color: '#d4a63c', boxShadow: '0 2px 12px rgba(212,166,60,0.2)', border: '1px solid rgba(212,166,60,0.4)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' })
                }}
              >
                <span style={{ fontSize: '15px' }}>🛍️</span>
                <span>{isRTL ? 'المتجر' : 'Store'}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '18px', height: '18px', borderRadius: '999px',
                  background: activeTab === 'product' ? '#d4a63c' : 'rgba(212,166,60,0.3)',
                  color: '#000', fontSize: '10px', fontWeight: 900, padding: '0 4px',
                  boxShadow: activeTab === 'product' ? '0 0 10px rgba(212,166,60,0.5)' : 'none'
                }}>
                  {deals.length}
                </span>
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsMinimized(true)}
            data-testid="hub-minimize"
            style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
            }}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div key={activeTab + currentIndex} style={{ animation: 'fadeSlide 0.3s ease' }}>

          {/* Product image */}
          {activeTab === 'product' && (
            <div style={{ width: '100%', height: '150px', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
              {(current as Deal).image_path ? (
                <Image
                  src={(current as Deal).image_path!}
                  alt={isRTL ? (current as Deal).title_ar : (current as Deal).title_en}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,rgba(212,166,60,0.08),rgba(0,0,0,0.2))' }}>
                  <span style={{ fontSize: '48px', opacity: 0.5 }}>🛍️</span>
                </div>
              )}
            </div>
          )}

          {/* ── Service Offer Card (Prominent) ── */}
          {activeTab === 'service' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,166,60,0.08) 0%, rgba(245,158,11,0.04) 100%)',
              border: '1px solid rgba(212,166,60,0.25)',
              borderRadius: '16px',
              padding: '1rem',
              marginBottom: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* "LIVE OFFER" badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '999px', padding: '3px 10px', marginBottom: '8px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'liveDot 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isRTL ? 'عرض نشط الآن' : 'Live Offer'}
                </span>
              </div>

              <h3 data-testid="hub-item-title" style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>
                {isRTL ? current.title_ar : current.title_en}
              </h3>

              <p data-testid="hub-item-desc" style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {isRTL ? (current as Announcement).body_ar : (current as Announcement).body_en}
              </p>

              {safeHref && (
                <Link
                  href={safeHref}
                  data-testid="hub-item-link"
                  target={(current as Announcement).link_url?.startsWith('http') ? '_blank' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #d4a63c, #f59e0b)',
                    color: '#000', padding: '10px 16px', borderRadius: '12px',
                    fontSize: '13px', fontWeight: 800, textDecoration: 'none',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(212,166,60,0.3)'
                  }}
                >
                  {isRTL ? 'تفاصيل العرض' : dict.staff_dashboard.learn_more}
                  <span>{isRTL ? '←' : '→'}</span>
                </Link>
              )}
            </div>
          )}

          {/* ── Product Deal Card ── */}
          {activeTab === 'product' && (
            <div style={{ marginBottom: '12px' }}>
              <h3 data-testid="hub-item-title" style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>
                {isRTL ? current.title_ar : current.title_en}
              </h3>
              <div data-testid="hub-item-price" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                {(current as Deal).original_price && (
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                    {(current as Deal).original_price} {(current as Deal).currency_code}
                  </span>
                )}
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d4a63c' }}>
                  {(current as Deal).deal_price} {(current as Deal).currency_code}
                </span>
                {(current as Deal).original_price && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '999px', padding: '2px 7px' }}>
                    -{Math.round(((Number((current as Deal).original_price) - (current as Deal).deal_price) / Number((current as Deal).original_price)) * 100)}%
                  </span>
                )}
              </div>
              {safeHref && (
                <Link
                  href={safeHref}
                  data-testid="hub-item-link"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #d4a63c, #f59e0b)',
                    color: '#000', padding: '10px 16px', borderRadius: '12px',
                    fontSize: '13px', fontWeight: 800, textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(212,166,60,0.25)'
                  }}
                >
                  {isRTL ? 'عرض التفاصيل' : dict.staff_dashboard.view_deal}
                  <span>{isRTL ? '←' : '→'}</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination footer ── */}
        {items.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={prev} data-testid="hub-prev" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.2s' }}>
              {isRTL ? '→' : '←'}
            </button>
            <div style={{ display: 'flex', gap: '5px' }}>
              {items.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)} style={{ width: i === currentIndex ? '18px' : '6px', height: '6px', borderRadius: '999px', background: i === currentIndex ? '#d4a63c' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
              ))}
            </div>
            <button onClick={next} data-testid="hub-next" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.2s' }}>
              {isRTL ? '←' : '→'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes hubSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes badgeBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @media (max-width: 640px) {
          [data-testid="floating-highlights-hub"] {
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 24px 24px 0 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
