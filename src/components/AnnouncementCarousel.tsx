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

export default function AnnouncementCarousel({ 
  announcements, 
  locale,
  dict 
}: { 
  announcements: Announcement[], 
  locale: string,
  dict: any
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const isRTL = locale === 'ar'
  const current = announcements[currentIndex]

  if (!current) return null

  const next = () => setCurrentIndex((prev) => (prev + 1) % announcements.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)

  return (
    <div className="announcement-wrapper glass-card" data-testid="homepage-announcement-card">
      <div className="announcement-content">
        <div className="flex justify-between items-center mb-2">
          <span className="badge badge-brand text-[10px] uppercase tracking-widest">
            {current.announcement_type}
          </span>
          {announcements.length > 1 && (
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-muted">
                 {currentIndex + 1} / {announcements.length}
               </span>
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-bold mb-1" data-testid="homepage-announcement-title">
          {isRTL ? current.title_ar : current.title_en}
        </h3>
        
        <p className="text-sm text-muted mb-4 line-clamp-2" data-testid="homepage-announcement-body">
          {isRTL ? current.body_ar : current.body_en}
        </p>

        {current.link_url && (
          <Link 
            href={current.link_url} 
            className="text-brand-gold text-xs font-bold hover:underline inline-flex items-center gap-1"
            data-testid="homepage-announcement-link"
          >
            {isRTL ? 'معرفة المزيد' : 'Learn More'}
            <span className={isRTL ? 'rotate-180' : ''}>→</span>
          </Link>
        )}
      </div>

      {announcements.length > 1 && (
        <div className="announcement-nav">
          <button onClick={isRTL ? next : prev} className="nav-btn" data-testid="homepage-announcement-prev">
            {dict.staff_dashboard.news_prev}
          </button>
          <button onClick={isRTL ? prev : next} className="nav-btn" data-testid="homepage-announcement-next">
            {dict.staff_dashboard.news_next}
          </button>
        </div>
      )}

      <style jsx>{`
        .announcement-wrapper {
          position: relative;
          padding: 1.5rem;
          border-radius: 20px;
          margin-bottom: 2rem;
          background: linear-gradient(145deg, rgba(20, 20, 30, 0.9), rgba(10, 10, 15, 0.9));
          border: 1px solid rgba(212, 166, 60, 0.2);
          overflow: hidden;
          animation: slideIn 0.5s ease-out;
        }
        .announcement-content {
          position: relative;
          z-index: 2;
        }
        .announcement-nav {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          justify-content: flex-end;
        }
        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 10px;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--brand-gold);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
