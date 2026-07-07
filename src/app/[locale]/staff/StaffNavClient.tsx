'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './staff-nav.css';

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
