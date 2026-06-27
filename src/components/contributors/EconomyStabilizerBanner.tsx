'use client';

import { useState } from 'react';

interface EconomyStabilizerBannerProps {
  status: 'normal' | 'warning' | 'critical';
  multiplier: number;
  growthPct: number;
  locale: string;
}

export default function EconomyStabilizerBanner({
  status,
  multiplier,
  growthPct,
  locale,
}: EconomyStabilizerBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const isRTL = locale === 'ar';

  // Normal status = hidden
  if (status === 'normal' || dismissed) return null;

  const isWarning = status === 'warning';
  const isCritical = status === 'critical';

  const colors = {
    warning: {
      bg: 'linear-gradient(90deg, hsla(43,96%,56%,0.18) 0%, hsla(43,96%,56%,0.08) 100%)',
      border: 'hsla(43,96%,56%,0.4)',
      text: 'hsl(43,96%,75%)',
      dot: 'hsl(43,96%,60%)',
      badge: 'hsl(43,96%,56%)',
      badgeText: 'hsl(220,25%,8%)',
      icon: '⚡',
    },
    critical: {
      bg: 'linear-gradient(90deg, hsla(0,84%,60%,0.18) 0%, hsla(0,84%,60%,0.08) 100%)',
      border: 'hsla(0,84%,60%,0.5)',
      text: 'hsl(0,84%,80%)',
      dot: 'hsl(0,84%,60%)',
      badge: 'hsl(0,84%,60%)',
      badgeText: '#fff',
      icon: '🚨',
    },
  };

  const c = isWarning ? colors.warning : colors.critical;

  const messages = {
    warning: {
      en: `Economy stabilizer active — multipliers temporarily reduced to ${multiplier.toFixed(2)}×`,
      ar: `مثبّت الاقتصاد نشط — المضاعفات مخفضة مؤقتًا إلى ${multiplier.toFixed(2)}×`,
    },
    critical: {
      en: `High growth detected — earnings temporarily capped at ${multiplier.toFixed(2)}×`,
      ar: `نمو مرتفع مُكتشف — الأرباح مقيدة مؤقتًا عند ${multiplier.toFixed(2)}×`,
    },
  };

  const messageKey = isWarning ? 'warning' : 'critical';
  const message =
    locale === 'ar' ? messages[messageKey].ar : messages[messageKey].en;

  const growthLabel =
    locale === 'ar'
      ? `نمو الشبكة: +${growthPct.toFixed(1)}%`
      : `Network growth: +${growthPct.toFixed(1)}%`;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="alert"
      style={{
        width: '100%',
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        borderTop: `2px solid ${c.dot}`,
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: "'Inter', sans-serif",
        flexWrap: 'wrap',
        animation: 'bannerSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Pulsing dot */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          width: '10px',
          height: '10px',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: c.dot,
            position: 'absolute',
          }}
        />
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: c.dot,
            position: 'absolute',
            animation: 'bannerDotPulse 1.5s ease-in-out infinite',
            opacity: 0.5,
          }}
        />
      </div>

      {/* Status badge */}
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '20px',
          background: c.badge,
          color: c.badgeText,
          fontSize: '10px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        {c.icon}{' '}
        {locale === 'ar'
          ? isCritical
            ? 'حرج'
            : 'تحذير'
          : isCritical
          ? 'Critical'
          : 'Warning'}
      </span>

      {/* Message */}
      <span
        style={{
          fontSize: '13px',
          color: c.text,
          flex: 1,
          fontWeight: 500,
          lineHeight: '1.4',
        }}
      >
        {message}
      </span>

      {/* Growth pct */}
      <span
        style={{
          fontSize: '11px',
          color: c.dot,
          fontWeight: 600,
          flexShrink: 0,
          opacity: 0.85,
        }}
      >
        {growthLabel}
      </span>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label={locale === 'ar' ? 'إغلاق' : 'Dismiss'}
        style={{
          flexShrink: 0,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: c.text,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s ease',
          fontFamily: "'Inter', sans-serif",
          lineHeight: '1',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.16)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.08)')
        }
      >
        ×
      </button>

      <style>{`
        @keyframes bannerSlideIn {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bannerDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
