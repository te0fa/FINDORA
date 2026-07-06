'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

interface NavCategory {
  id: string;
  label: string;
  href?: string;
  subLinks?: NavLink[];
}

interface StaffNavClientProps {
  locale: string;
  categories: NavCategory[];
}

export default function StaffNavClient({ locale, categories }: StaffNavClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const isRTL = locale === 'ar';

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
    setOpenCategory(null);
  }, [pathname]);

  // Handle clicking outside to close mobile menu
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setIsOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen]);

  const toggleCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCategory(openCategory === id ? null : id);
  };

  return (
    <div className="staff-nav-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .staff-nav-container { position: relative; width: 100%; display: flex; justify-content: center; }
        
        /* Desktop/Tablet View */
        .staff-desktop-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .nav-category {
          position: relative;
          display: flex;
        }

        .category-btn {
          text-decoration: none;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.68rem;
          font-weight: 700;
          white-space: nowrap;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          cursor: pointer;
          background: transparent;
          border: none;
        }

        .category-btn:hover, .nav-category:hover .category-btn { 
          color: #ffffff; 
          background: rgba(255, 255, 255, 0.08); 
        }

        .category-btn.active {
          color: #f7d46b;
          background: rgba(247, 212, 107, 0.1);
          box-shadow: inset 0 0 0 1px rgba(247, 212, 107, 0.2);
        }

        /* Dropdown Menu */
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          ${isRTL ? 'right: 0;' : 'left: 0;'}
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 8px;
          min-width: 220px;
          display: none;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          z-index: 1000;
        }

        .nav-category:hover .dropdown-menu {
          display: block;
          animation: dropFadeIn 0.2s forwards;
        }

        @keyframes dropFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Bridge gap to prevent losing hover */
        .dropdown-menu::before {
          content: '';
          position: absolute;
          top: -30px;
          left: -20px;
          right: -20px;
          height: 30px;
        }

        .dropdown-link {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 10px;
          transition: all 0.15s;
        }
        
        .dropdown-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: translateX(${isRTL ? '-4px' : '4px'});
        }

        .dropdown-link.active {
          color: #f7d46b;
          background: rgba(247, 212, 107, 0.1);
        }

        .chevron {
          width: 12px;
          height: 12px;
          opacity: 0.5;
          transition: transform 0.2s;
        }
        .nav-category:hover .chevron {
          transform: rotate(180deg);
          opacity: 1;
        }

        /* Mobile Hamburger */
        .staff-mobile-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          user-select: none;
        }
        .staff-mobile-toggle:hover { background: rgba(255, 255, 255, 0.08); }
        
        .hamburger-icon {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 18px;
        }
        .hamburger-icon span {
          display: block;
          height: 2px;
          background: white;
          border-radius: 2px;
          transition: 0.2s;
        }

        /* Mobile Dropdown */
        .staff-mobile-nav {
          display: none;
          position: absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          width: 280px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }
        .staff-mobile-nav.open { display: block; animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1); }

        .mobile-category {
          display: flex;
          flex-direction: column;
        }

        .mobile-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          border-radius: 10px;
          background: transparent;
          border: none;
          width: 100%;
          text-align: ${isRTL ? 'right' : 'left'};
          cursor: pointer;
          text-decoration: none;
        }
        
        .mobile-category-header.active {
          color: #f7d46b;
          background: rgba(247, 212, 107, 0.05);
        }

        .mobile-sublinks {
          display: none;
          flex-direction: column;
          padding: 4px 0 8px;
          margin: 0 16px;
          border-${isRTL ? 'right' : 'left'}: 2px solid rgba(255,255,255,0.05);
        }
        .mobile-category.open .mobile-sublinks {
          display: flex;
        }

        .mobile-link {
          text-decoration: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          margin: 2px 8px;
        }
        .mobile-link.active {
          color: #f7d46b;
          background: rgba(247, 212, 107, 0.1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        @media (max-width: 900px) {
          .staff-desktop-nav { display: none; }
          .staff-mobile-toggle { display: flex; }
        }
      `}} />

      {/* DESKTOP NAV */}
      <div className="staff-desktop-nav">
        {categories.map((cat) => {
          const isActiveGroup = cat.href ? pathname === cat.href : cat.subLinks?.some(l => pathname === l.href);
          
          return (
            <div key={cat.id} className="nav-category">
              {cat.subLinks && cat.subLinks.length > 0 ? (
                <Link href={cat.href || '#'} className={`category-btn ${isActiveGroup ? 'active' : ''}`}>
                  {cat.label}
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </Link>
              ) : (
                <Link href={cat.href || '#'} className={`category-btn ${isActiveGroup ? 'active' : ''}`}>
                  {cat.label}
                </Link>
              )}
              
              {cat.subLinks && cat.subLinks.length > 0 && (
                <div className="dropdown-menu">
                  {cat.subLinks.map(link => (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`dropdown-link ${pathname === link.href ? 'active' : ''}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MOBILE NAV */}
      <button 
        className="staff-mobile-toggle"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
      >
        <div className="hamburger-icon">
          <span style={{ transform: isOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }}></span>
          <span style={{ opacity: isOpen ? 0 : 1 }}></span>
          <span style={{ transform: isOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }}></span>
        </div>
        {isRTL ? 'القائمة' : 'Menu'}
      </button>

      <div 
        className={`staff-mobile-nav ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {categories.map((cat) => {
          const isActiveGroup = cat.href ? pathname === cat.href : cat.subLinks?.some(l => pathname === l.href);
          const isCatOpen = openCategory === cat.id;

          return (
            <div key={cat.id} className={`mobile-category ${isCatOpen ? 'open' : ''}`}>
              {cat.subLinks && cat.subLinks.length > 0 ? (
                <div 
                  className={`mobile-category-header ${isActiveGroup ? 'active' : ''}`}
                >
                  <Link href={cat.href || '#'} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
                    {cat.label}
                  </Link>
                  <button 
                    onClick={(e) => toggleCategory(cat.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 8px' }}
                  >
                    <svg style={{ width: '14px', height: '14px', transform: isCatOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              ) : (
                <Link 
                  href={cat.href || '#'} 
                  className={`mobile-category-header ${isActiveGroup ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  {cat.label}
                </Link>
              )}

              {cat.subLinks && (
                <div className="mobile-sublinks">
                  {cat.subLinks.map(link => (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`mobile-link ${pathname === link.href ? 'active' : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
