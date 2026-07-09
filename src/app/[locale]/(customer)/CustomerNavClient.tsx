'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import HeaderLogo from '@/components/HeaderLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Locale } from '@/lib/i18n/config'

interface CustomerNavClientProps {
  locale: string
  dict: any
  signOutAction: any
}

export default function CustomerNavClient({
  locale,
  dict,
  signOutAction
}: CustomerNavClientProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const isRTL = locale === 'ar'

  const [currentSearch, setCurrentSearch] = useState('')

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
    setCurrentSearch(window.location.search)
  }, [pathname])

  const links = [
    { href: `/${locale}/dashboard`, label: dict.navigation.dashboard || (isRTL ? 'الرئيسية' : 'Dashboard') },
    { href: `/${locale}/savings`, label: isRTL ? 'سجل التوفير & VIP' : 'Savings & VIP' },
    { href: `/${locale}/savings?tab=advisor`, label: isRTL ? 'مستشار الشراء (Advisor)' : 'Buy Advisor' },
    { href: `/${locale}/savings?tab=ledger`, label: isRTL ? 'سجل النقاط (Ledger)' : 'Points Ledger' },
    { href: `/${locale}/savings?tab=waitlist`, label: isRTL ? 'الانتظار (Waitlist)' : 'Waitlist' },
    { href: `/${locale}/settings`, label: dict.navigation.settings || (isRTL ? 'الإعدادات' : 'Settings') },
    { href: `/${locale}/start-request`, label: dict.customer_dashboard.new_request || (isRTL ? 'طلب جديد' : 'New Request'), isCta: true }
  ]

  return (
    <header className="customer-header">
      <div className="nav-container">
        {/* Logo */}
        <HeaderLogo locale={locale} href={`/${locale}/dashboard`} />

        {/* Desktop Menu */}
        <nav className="desktop-nav" dir={isRTL ? 'rtl' : 'ltr'}>
          {links.map((link) => {
            const hasTab = link.href.includes('?tab=')
            const linkTab = hasTab ? link.href.split('?tab=')[1] : null
            const isActive = linkTab 
              ? (pathname.includes('/savings') && currentSearch.includes(`tab=${linkTab}`))
              : (pathname === link.href || (link.href.includes('dashboard') && pathname.endsWith('dashboard')) || (link.href.endsWith('/savings') && pathname.includes('/savings') && !currentSearch.includes('tab=')))

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? 'active' : ''} ${link.isCta ? 'cta-link' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side controls */}
        <div className="right-controls" dir="ltr">
          <LanguageSwitcher currentLocale={locale as Locale} />
          
          <form action={signOutAction} className="logout-form">
            <button type="submit" className="logout-btn">
              {dict.navigation.logout || (isRTL ? 'تسجيل الخروج' : 'Logout')}
            </button>
          </form>

          {/* Mobile Menu Toggle Button */}
          <button 
            type="button" 
            className={`mobile-toggle-btn ${isOpen ? 'open' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="mobile-menu animate-slide-down" dir={isRTL ? 'rtl' : 'ltr'}>
          {links.map((link) => {
            const hasTab = link.href.includes('?tab=')
            const linkTab = hasTab ? link.href.split('?tab=')[1] : null
            const isActive = linkTab 
              ? (pathname.includes('/savings') && currentSearch.includes(`tab=${linkTab}`))
              : (pathname === link.href || (link.href.includes('dashboard') && pathname.endsWith('dashboard')) || (link.href.endsWith('/savings') && pathname.includes('/savings') && !currentSearch.includes('tab=')))

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`mobile-nav-link ${isActive ? 'active' : ''} ${link.isCta ? 'cta-link' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
          
          <div className="mobile-divider"></div>
          
          <form action={signOutAction} className="mobile-logout-form">
            <button type="submit" className="mobile-logout-btn">
              {dict.navigation.logout || (isRTL ? 'تسجيل الخروج' : 'Logout')}
            </button>
          </form>
        </div>
      )}

      {/* Scoped Vanilla CSS for Header Navigation */}
      <style dangerouslySetInnerHTML={{ __html: `
        .customer-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 15, 30, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 72px;
          box-sizing: border-box;
          direction: ltr;
        }
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-link {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 12px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link.active {
          color: white;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.05);
        }
        .cta-link {
          background: linear-gradient(90deg, #c8973b, #f2d37b) !important;
          color: #000 !important;
          font-weight: 700;
          border: none !important;
          box-shadow: 0 4px 12px rgba(200, 151, 59, 0.15);
        }
        .cta-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(200, 151, 59, 0.25);
          opacity: 0.95;
        }
        .cta-link.active {
          border: none !important;
          background: linear-gradient(90deg, #c8973b, #f2d37b) !important;
          color: #000 !important;
        }
        .right-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logout-form {
          margin: 0;
          display: flex;
          align-items: center;
        }
        .logout-btn {
          width: auto !important;
          padding: 8px 16px !important;
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.15) !important;
          color: #fca5a5 !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }

        /* Mobile toggle btn */
        .mobile-toggle-btn {
          display: none !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          width: 32px !important;
          height: 20px !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
        }
        .hamburger-line {
          width: 100%;
          height: 2px;
          background-color: white;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .mobile-toggle-btn.open .hamburger-line:nth-child(1) {
          transform: translateY(9px) rotate(45deg);
        }
        .mobile-toggle-btn.open .hamburger-line:nth-child(2) {
          opacity: 0;
        }
        .mobile-toggle-btn.open .hamburger-line:nth-child(3) {
          transform: translateY(-9px) rotate(-45deg);
        }

        /* Mobile Menu */
        .mobile-menu {
          display: none;
          position: absolute;
          top: 72px;
          left: 0;
          right: 0;
          background: rgba(10, 15, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 24px 24px 24px;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .mobile-nav-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: 10px;
          transition: all 0.2s ease;
          display: block;
          text-align: start;
        }
        .mobile-nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        .mobile-nav-link.active {
          color: white;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .mobile-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 8px 0;
        }
        .mobile-logout-form {
          margin: 0;
          width: 100%;
        }
        .mobile-logout-btn {
          width: 100% !important;
          padding: 12px !important;
          background: rgba(239, 68, 68, 0.1) !important;
          color: #fca5a5 !important;
          border: 1px solid rgba(239, 68, 68, 0.2) !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
        }

        .animate-slide-down {
          animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* RESPONSIVENESS */
        @media (max-width: 900px) {
          .desktop-nav {
            display: none;
          }
          .mobile-toggle-btn {
            display: flex !important;
          }
          .mobile-menu {
            display: flex;
          }
          .logout-form {
            display: none;
          }
        }
      `}} />
    </header>
  )
}
