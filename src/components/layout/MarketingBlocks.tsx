'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { accordionVariants } from '@/lib/design-system/motion';

// ──────────────────────────────────────────────────────────────────────────
// 1. HERO SECTION
// ──────────────────────────────────────────────────────────────────────────
export interface HeroProps {
  title: string;
  subtitle: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  badgeText?: string;
  locale?: string;
}

export const Hero: React.FC<HeroProps> = ({ title, subtitle, primaryAction, secondaryAction, badgeText, locale = 'ar' }) => {
  const isRTL = locale === 'ar';

  return (
    <section
      style={{
        paddingBlock: 'var(--space-80) var(--space-96)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Glow backgrounds */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(200,151,59,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {badgeText && (
        <span
          style={{
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            padding: 'var(--space-4) var(--space-16)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-20)',
            border: '1px solid rgba(200, 151, 59, 0.2)',
          }}
        >
          {badgeText}
        </span>
      )}

      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          maxWidth: '800px',
          marginBottom: 'var(--space-20)',
          background: 'linear-gradient(to right, #fff 40%, var(--accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        className="hero-title"
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          lineHeight: 1.6,
          marginBottom: 'var(--space-32)',
        }}
      >
        {subtitle}
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-16)', justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '400px' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>{primaryAction}</div>
        {secondaryAction && <div style={{ flex: 1, minWidth: '150px' }}>{secondaryAction}</div>}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.25rem !important;
          }
        }
      `}</style>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 2. CTA BLOCK
// ──────────────────────────────────────────────────────────────────────────
export interface CTAProps {
  title: string;
  description: string;
  action: React.ReactNode;
}

export const CTA: React.FC<CTAProps> = ({ title, description, action }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(2,6,23,0.9) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-48) var(--space-32)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--premium-glow)',
      }}
    >
      <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 'var(--space-12)' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '550px', marginInline: 'auto', marginBottom: 'var(--space-32)', lineHeight: 1.6 }}>
        {description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ minWidth: '200px' }}>{action}</div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 3. SECTION TITLE
// ──────────────────────────────────────────────────────────────────────────
export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: 'start' | 'center';
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, align = 'center' }) => {
  return (
    <div style={{ textAlign: align, marginBottom: 'var(--space-40)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
      {subtitle && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 'var(--space-8)', maxWidth: '500px', marginInline: align === 'center' ? 'auto' : '0' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 4. STATS CARD
// ──────────────────────────────────────────────────────────────────────────
export interface StatisticsCardProps {
  value: string;
  label: string;
  description?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ value, label, description }) => {
  return (
    <Card variant="statistics">
      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)', margin: 0, letterSpacing: '-0.03em' }}>
        {value}
      </h3>
      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 'var(--space-8) 0 0 0', color: 'var(--text-primary)' }}>
        {label}
      </h4>
      {description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 'var(--space-4) 0 0 0' }}>
          {description}
        </p>
      )}
    </Card>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 5. TIMELINE
// ──────────────────────────────────────────────────────────────────────────
export interface TimelineItem {
  title: string;
  description: string;
  step: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  locale?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, locale = 'ar' }) => {
  const isRTL = locale === 'ar';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)', position: 'relative' }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid rgba(200, 151, 59, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              flexShrink: 0,
            }}
          >
            {item.step}
          </div>
          <div style={{ paddingTop: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{item.title}</h4>
            <p style={{ margin: 'var(--space-4) 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 6. FAQ (ACCORDION)
// ──────────────────────────────────────────────────────────────────────────
export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: React.FC<{ items: FAQItem[] }> = ({ items }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(15,23,42,0.2)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => toggle(idx)}
              style={{
                width: '100%',
                padding: 'var(--space-16) var(--space-20)',
                background: 'none',
                border: 'none',
                color: '#fff',
                textAlign: 'inherit',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>{item.question}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  variants={accordionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div
                    style={{
                      padding: '0 var(--space-20) var(--space-16) var(--space-20)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
