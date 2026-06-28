'use client';

import React from 'react';
import { Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface NavigationProps {
  currentLocale: string;
  onLocaleChange?: (locale: string) => void;
  brandName?: string;
  links?: { label: string; href: string }[];
}

export const Navbar: React.FC<NavigationProps> = ({
  currentLocale = 'ar',
  onLocaleChange,
  brandName = 'Findora',
  links = [],
}) => {
  const isRTL = currentLocale === 'ar';

  return (
    <nav
      style={{
        width: '100%',
        height: '80px',
        background: 'rgba(2, 6, 23, 0.7)',
        backdropFilter: 'blur(var(--blur-md))',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--space-32)',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 500,
      }}
    >
      {/* Brand logo & name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
        <span
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#000',
          }}
        >
          F
        </span>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            background: 'linear-gradient(to right, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}
        >
          {brandName}
        </span>
      </div>

      {/* Nav Links (Desktop) */}
      <div className="nav-links" style={{ display: 'flex', gap: 'var(--space-24)', alignItems: 'center' }}>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'color var(--duration-fast)',
            }}
            className="nav-item-link"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Action items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
        {/* Locale switcher */}
        <button
          onClick={() => onLocaleChange?.(isRTL ? 'en' : 'ar')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <Globe size={16} />
          <span>{isRTL ? 'English' : 'العربية'}</span>
        </button>

        <Button variant="primary" size="sm">
          {isRTL ? 'ابدأ الآن' : 'Get Started'}
        </Button>
      </div>

      <style jsx global>{`
        .nav-item-link:hover {
          color: var(--accent) !important;
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export const Footer: React.FC<{ brandName?: string; currentLocale?: string }> = ({
  brandName = 'Findora',
  currentLocale = 'ar',
}) => {
  const isRTL = currentLocale === 'ar';

  return (
    <footer
      style={{
        background: '#0b0f19',
        borderTop: '1px solid var(--border)',
        paddingBlock: 'var(--space-48)',
        color: 'var(--text-secondary)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          paddingInline: 'var(--space-24)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-32)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-24)',
          }}
        >
          <div style={{ maxWidth: '300px' }}>
            <h4 style={{ color: '#fff', fontWeight: 800, marginBottom: 'var(--space-12)' }}>{brandName}</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
              {isRTL
                ? 'فايندورا هي منصة البحث والتوريد الذكية التي تصلك بأفضل الأسعار والموردين في مصر.'
                : 'Findora is a smart procurement and sourcing platform connecting businesses with the best suppliers.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-48)' }}>
            <div>
              <h5 style={{ color: '#fff', fontWeight: 700, marginBottom: 'var(--space-12)', fontSize: '0.9rem' }}>
                {isRTL ? 'المنصة' : 'Platform'}
              </h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>{isRTL ? 'المميزات' : 'Features'}</li>
                <li>{isRTL ? 'الأسعار' : 'Pricing'}</li>
              </ul>
            </div>
            <div>
              <h5 style={{ color: '#fff', fontWeight: 700, marginBottom: 'var(--space-12)', fontSize: '0.9rem' }}>
                {isRTL ? 'قانوني' : 'Legal'}
              </h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>{isRTL ? 'الشروط والأحكام' : 'Terms of Use'}</li>
                <li>{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</li>
              </ul>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: 0 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', flexWrap: 'wrap', gap: '12px' }}>
          <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
          <span>{isRTL ? 'صنع بكل حب في مصر 🇪🇬' : 'Made with 💚 in Egypt 🇪🇬'}</span>
        </div>
      </div>
    </footer>
  );
};
