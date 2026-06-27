'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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

export default function FloatingDealsWidget({ 
  deals, 
  locale,
  dict 
}: { 
  deals: Deal[], 
  locale: string,
  dict: any
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(true) // Minimized by default as per recommendation
  const isRTL = locale.startsWith('ar')
  const current = deals[currentIndex]

  if (!current || !isVisible) return null

  const next = () => setCurrentIndex((prev) => (prev + 1) % deals.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + deals.length) % deals.length)

  if (isMinimized) {
     return (
       <button 
         onClick={() => setIsMinimized(false)}
         className="floating-deals-minimized-btn glass-card"
         style={{ 
           position: 'fixed', 
           bottom: '32px', 
           ...(isRTL ? { right: '32px' } : { left: '32px' })
         }}
         data-testid="floating-deals-minimized"
         aria-label={dict.deals_widget_label || "Findora Deals"}
       >
         <span className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
               {dict.deals_widget_label || "Findora Deals"}
            </span>
         </span>
         <style jsx>{`
            .floating-deals-minimized-btn {
              width: max-content;
              padding: 12px 20px;
              border-radius: 999px;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              cursor: pointer;
              background: rgba(15, 23, 42, 0.9);
              border: 1px solid rgba(212, 166, 60, 0.4);
              box-shadow: 0 12px 40px rgba(0,0,0,0.6);
              transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .floating-deals-minimized-btn:hover {
              transform: scale(1.05) translateY(-4px);
              border-color: #d4a63c;
              background: rgba(15, 23, 42, 1);
            }
         `}</style>
       </button>
     )
  }

  return (
    <div 
      className="floating-deals-widget glass-card" 
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ 
        position: 'fixed', 
        bottom: '32px', 
        ...(isRTL ? { right: '32px' } : { left: '32px' })
      }}
      data-testid="floating-deals-widget"
    >
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <span className="deals-badge" data-testid="floating-deals-badge">
            {dict.deals_widget_title || "Today's Deal"}
          </span>
        </div>
        <div className="header-actions">
           <button 
             onClick={() => setIsMinimized(true)} 
             className="action-btn" 
             title={dict.minimize || 'Minimize'} 
             data-testid="floating-deals-minimize"
           >
             −
           </button>
           <button 
             onClick={() => setIsVisible(false)} 
             className="action-btn close-btn" 
             title={dict.close || 'Close'} 
             data-testid="floating-deals-close"
           >
             ×
           </button>
        </div>
      </div>

      <div className="widget-body" data-testid="floating-deals-card">
        {current.image_path && (
          <div className="deal-image-container mb-4">
             <Image 
               src={current.image_path} 
               alt={isRTL ? current.title_ar : current.title_en}
               fill
               className="object-cover rounded-xl"
             />
          </div>
        )}
        
        <h3 className="deal-title" data-testid="floating-deals-title">
          {isRTL ? current.title_ar : current.title_en}
        </h3>
        
        <div className="deal-price-row mb-4" data-testid="floating-deals-price">
           {current.original_price && (
             <span className="original-price line-through opacity-50 text-xs mr-2">
               {current.original_price} {current.currency_code}
             </span>
           )}
           <span className="current-price text-xl font-bold text-white">
             {current.deal_price} <span className="text-[10px] text-brand-gold uppercase">{current.currency_code}</span>
           </span>
        </div>

        <div className="flex flex-col gap-2">
          <Link 
            href={`/${locale}/deals`}
            className="view-deal-btn"
            data-testid="floating-deals-view-deal"
          >
            {dict.view_deal || 'View Deal'}
          </Link>
          <Link 
            href={`/${locale}/deals`}
            className="view-all-btn"
            data-testid="floating-deals-view-all"
          >
            {dict.view_all_deals || 'View All Deals'}
          </Link>
        </div>
      </div>

      {deals.length > 1 && (
        <div className="widget-nav">
          <button onClick={prev} className="nav-btn" data-testid="floating-deals-prev" title={dict.previous_deal}>
             {isRTL ? '→' : '←'}
          </button>
          <span className="nav-count">{currentIndex + 1} / {deals.length}</span>
          <button onClick={next} className="nav-btn" data-testid="floating-deals-next" title={dict.next_deal}>
             {isRTL ? '←' : '→'}
          </button>
        </div>
      )}

      <style jsx>{`
        .floating-deals-widget {
          width: 340px;
          max-width: calc(100vw - 64px);
          z-index: 1000;
          padding: 1.5rem;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(212, 166, 60, 0.3);
          border-radius: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          animation: slideIn ${isRTL ? 'right' : 'left'} 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        
        .floating-deals-widget {
           animation-name: ${isRTL ? 'slideInRight' : 'slideInLeft'};
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .deals-badge {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #d4a63c;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 18px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .deal-image-container {
           position: relative;
           width: 100%;
           height: 140px;
           overflow: hidden;
        }

        .deal-title {
          font-size: 1.125rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: #fff;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .view-deal-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #10172a;
          background: #d4a63c;
          padding: 10px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
        }

        .view-deal-btn:hover {
          background: #e5bb5d;
          transform: translateY(-2px);
        }

        .view-all-btn {
           text-align: center;
           font-size: 11px;
           font-weight: 600;
           color: rgba(255, 255, 255, 0.5);
           text-decoration: none;
           padding: 4px;
        }
        .view-all-btn:hover {
           color: #fff;
           text-decoration: underline;
        }

        .widget-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          width: 32px;
          height: 32px;
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
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .floating-deals-widget, .floating-deals-minimized-btn {
            bottom: 20px;
            ${isRTL ? 'right: 20px;' : 'left: 20px;'}
            ${isRTL ? 'left: auto;' : 'right: auto;'}
          }
          .floating-deals-widget {
            width: calc(100vw - 40px);
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}
