'use client'

import { useState } from 'react'
import Link from 'next/link'

export function DashboardQuickActions({ locale, isRTL, permissions }: { locale: string; isRTL: boolean; permissions: any }) {
  const [isOpen, setIsOpen] = useState(false)

  const allActions = [
    { href: `/${locale}/staff/queue`, label: isRTL ? 'إدارة الطلبات' : 'Review Intake Queue', color: '#f59e0b', visible: permissions?.isAdmin || permissions?.canReviewIntake },
    { href: `/${locale}/staff/operations`, label: isRTL ? 'العمليات والبحث' : 'Operations & Research', color: '#3b82f6', visible: permissions?.isAdmin || permissions?.canResearch },
    { href: `/${locale}/staff/workspace`, label: isRTL ? 'مساحة التسليم' : 'Release Workspace', color: '#10b981', visible: permissions?.isAdmin || permissions?.canReport },
    { href: `/${locale}/staff/users`, label: isRTL ? 'إدارة الموظفين' : 'Staff Management Center', color: '#8b5cf6', visible: permissions?.isAdmin },
    { href: `/${locale}/staff/archive`, label: isRTL ? 'الأرشيف' : 'Archive & Cleanup', color: '#ef4444', visible: permissions?.isAdmin || permissions?.canManageArchive },
    { href: `/${locale}/staff/marketing/pricing`, label: isRTL ? 'إدارة الأسعار' : 'Pricing Management', color: '#6366f1', visible: permissions?.isAdmin || permissions?.canManagePricing },
    { href: `/${locale}/staff/marketing/news`, label: isRTL ? 'الأخبار والإعلانات' : 'News / Announcements', color: '#14b8a6', visible: permissions?.isAdmin || permissions?.canManageNews },
    { href: `/${locale}/staff/marketing/deals`, label: isRTL ? 'عروض المنتجات' : 'Findora Deals', color: '#f43f5e', visible: permissions?.isAdmin || permissions?.canManageDeals },
  ]

  const actions = allActions.filter(action => action.visible)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .quick-actions-fab {
          position: fixed;
          bottom: 40px;
          ${isRTL ? 'left: 40px;' : 'right: 40px;'}
          background: #f7d46b;
          color: #000;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(247, 212, 107, 0.4);
          z-index: 1000;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .quick-actions-fab:hover {
          transform: scale(1.1);
        }
        .fab-icon {
          transition: transform 0.3s;
        }
        .quick-actions-fab.open .fab-icon {
          transform: rotate(45deg);
        }
        
        .quick-actions-panel {
          position: fixed;
          bottom: 120px;
          ${isRTL ? 'left: 40px;' : 'right: 40px;'}
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          width: 320px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          z-index: 999;
          opacity: 0;
          pointer-events: none;
          transform: translateY(20px);
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .quick-actions-panel.open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

        .qa-title {
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0 0 16px;
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }

        .qa-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .qa-list::-webkit-scrollbar { width: 4px; }
        .qa-list::-webkit-scrollbar-track { background: transparent; }
        .qa-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

        .qa-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 12px 16px;
          border-radius: 12px;
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: 0.2s;
        }
        .qa-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(${isRTL ? '-4px' : '4px'});
        }
        .qa-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `}} />

      <div className={`quick-actions-fab ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <svg className="fab-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>

      <div className={`quick-actions-panel ${isOpen ? 'open' : ''}`}>
        <h3 className="qa-title">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
        <div className="qa-list">
          {actions.map(action => (
            <Link key={action.href} href={action.href} className="qa-btn" onClick={() => setIsOpen(false)}>
              <span className="qa-dot" style={{ backgroundColor: action.color }}></span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
