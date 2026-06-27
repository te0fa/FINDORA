'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Announcement {
  id: string
  title_en: string
  title_ar: string
  body_en?: string
  body_ar?: string
  link_url?: string
  announcement_type: string
}

export default function FloatingOffersWidget({ 
  announcements, 
  locale,
  dict 
}: { 
  announcements: Announcement[], 
  locale: string,
  dict: any
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const isRTL = locale === 'ar'
  const current = announcements[currentIndex]

  if (!current || !isVisible) return null

  const next = () => setCurrentIndex((prev) => (prev + 1) % announcements.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)

  const getSafeOfferHref = (url: string | undefined, locale: string) => {
    if (!url) return null
    
    // Normalize url
    const lowerUrl = url.toLowerCase().trim()
    
    // External links
    if (lowerUrl.startsWith('http')) return url
    
    // Mapping for Pricing
    if (
      lowerUrl === 'pricing' || 
      lowerUrl === '/pricing' || 
      lowerUrl === '#pricing' ||
      lowerUrl.includes('everyday_purchase') // Handle the seeded DB link
    ) {
      return `/${locale}#pricing`
    }
    
    // Mapping for Deals
    if (
      lowerUrl === 'deals' || 
      lowerUrl === '/deals' || 
      lowerUrl === '#deals'
    ) {
      return `/${locale}/deals`
    }
    
    // Internal paths
    if (url.startsWith('/')) {
      if (url.startsWith(`/${locale}/`) || url === `/${locale}`) return url
      return `/${locale}${url}`
    }
    
    // If we reach here and it's not a known path, be conservative
    // For now, allow it but prefix with locale
    return `/${locale}/${url.startsWith('/') ? url.slice(1) : url}`
  }

  const safeHref = getSafeOfferHref(current.link_url, locale)

  if (isMinimized) {
     return (
       <button 
         onClick={() => setIsMinimized(false)}
         className="floating-minimized-btn glass-card"
         data-testid="floating-offer-minimized"
         aria-label="Expand Offer"
       >
         <span className="animate-pulse text-2xl">🎁</span>
         <style jsx>{`
            .floating-minimized-btn {
              position: fixed;
              bottom: 32px;
              ${isRTL ? 'left: 32px;' : 'right: 32px;'}
              width: 64px;
              height: 64px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1001;
              cursor: pointer;
              background: rgba(15, 23, 42, 0.9);
              border: 1px solid rgba(212, 166, 60, 0.5);
              box-shadow: 0 12px 40px rgba(0,0,0,0.6);
              transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .floating-minimized-btn:hover {
              transform: scale(1.1) rotate(5deg);
              border-color: #d4a63c;
              background: rgba(15, 23, 42, 1);
            }
         `}</style>
       </button>
     )
  }

  return (
    <div 
      className="floating-widget glass-card" 
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="floating-offers-widget"
    >
      <div className="widget-header">
        <span className="offer-badge" data-testid="floating-offer-badge">
          {dict.special_offer || 'Special Offer'}
        </span>
        <div className="header-actions">
           <button 
             onClick={() => setIsMinimized(true)} 
             className="action-btn" 
             title={dict.minimize || 'Minimize'} 
             data-testid="floating-offer-minimize"
           >
             −
           </button>
           <button 
             onClick={() => setIsVisible(false)} 
             className="action-btn close-btn" 
             title={dict.close_offer || 'Close'} 
             data-testid="floating-offer-close"
           >
             ×
           </button>
        </div>
      </div>

      <div className="widget-body" data-testid="floating-offer-card">
        <h3 className="offer-title" data-testid="floating-offer-title">
          {isRTL ? current.title_ar : current.title_en}
        </h3>
        <p className="offer-desc" data-testid="floating-offer-description">
          {isRTL ? current.body_ar : current.body_en}
        </p>

        {safeHref && (
          <Link 
            href={safeHref}
            className="offer-link-btn"
            data-testid="floating-offer-link"
            rel={current.link_url?.startsWith('http') ? 'noopener noreferrer' : undefined}
            target={current.link_url?.startsWith('http') ? '_blank' : undefined}
          >
            {dict.learn_more || 'Learn More'}
            <span className="arrow">{isRTL ? '←' : '→'}</span>
          </Link>
        )}
      </div>

      {announcements.length > 1 && (
        <div className="widget-nav">
          <button onClick={prev} className="nav-btn" data-testid="floating-offer-prev" title={dict.previous_offer}>
             {isRTL ? '→' : '←'}
          </button>
          <span className="nav-count">{currentIndex + 1} / {announcements.length}</span>
          <button onClick={next} className="nav-btn" data-testid="floating-offer-next" title={dict.next_offer}>
             {isRTL ? '←' : '→'}
          </button>
        </div>
      )}

      <style jsx>{`
        .floating-widget {
          position: fixed;
          bottom: 32px;
          ${isRTL ? 'left: 32px;' : 'right: 32px;'}
          width: 400px;
          max-width: calc(100vw - 64px);
          z-index: 1001;
          padding: 1.75rem;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(212, 166, 60, 0.3);
          border-radius: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .offer-badge {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #d4a63c;
          background: rgba(212, 166, 60, 0.15);
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(212, 166, 60, 0.2);
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 20px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .offer-title {
          font-size: 1.25rem; /* 20px */
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: #fff;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }

        .offer-desc {
          font-size: 0.9375rem; /* 15px */
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 1.5rem;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .offer-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #10172a;
          background: #d4a63c;
          padding: 10px 20px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(212, 166, 60, 0.3);
        }

        .offer-link-btn:hover {
          background: #e5bb5d;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 166, 60, 0.4);
        }

        .arrow {
          font-size: 16px;
          transition: transform 0.3s;
        }

        .offer-link-btn:hover .arrow {
          transform: translateX(${isRTL ? '-4px' : '4px'});
        }

        .widget-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: #d4a63c;
        }

        .nav-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        @media (max-width: 640px) {
          .floating-widget {
            bottom: 20px;
            left: 20px;
            right: 20px;
            width: auto;
            padding: 1.5rem;
            border-radius: 24px;
          }
          .offer-title { font-size: 1.125rem; }
          .offer-desc { font-size: 0.875rem; }
        }
      `}</style>
    </div>
  )
}
