'use client';

import { useEffect, useState } from 'react';

interface ContributorAnnouncementBarProps {
  openSlots?: number;
  closingDate?: string;
  message?: string;
  locale: string;
}

function getTimeRemaining(targetDate: string): string | null {
  try {
    const now = new Date();
    const target = new Date(targetDate);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return null;
  }
}

export default function ContributorAnnouncementBar({
  openSlots,
  closingDate,
  message,
  locale,
}: ContributorAnnouncementBarProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(
    closingDate ? getTimeRemaining(closingDate) : null,
  );
  const isRTL = locale === 'ar';

  useEffect(() => {
    if (!closingDate) return;

    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(closingDate));
    }, 60_000); // update every minute

    return () => clearInterval(interval);
  }, [closingDate]);

  const buildMessage = (): string => {
    if (message) return message;

    const parts: string[] = [];

    if (openSlots !== undefined) {
      if (locale === 'ar') {
        parts.push(`🔥 ${openSlots} مكان متاح`);
      } else {
        parts.push(`🔥 ${openSlots} spots available`);
      }
    }

    if (timeLeft) {
      if (locale === 'ar') {
        parts.push(`⏳ ينتهي خلال ${timeLeft}`);
      } else {
        parts.push(`⏳ Closes in ${timeLeft}`);
      }
    } else if (closingDate && !timeLeft) {
      if (locale === 'ar') {
        parts.push('⏳ الوقت انتهى');
      } else {
        parts.push('⏳ Registration closed');
      }
    }

    return parts.join('  ·  ');
  };

  const displayMessage = buildMessage();

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="banner"
      aria-label={locale === 'ar' ? 'إعلان المساهمين' : 'Contributor Announcement'}
      style={{
        width: '100%',
        background:
          'linear-gradient(90deg, hsl(258,89%,16%) 0%, hsl(258,60%,22%) 50%, hsl(258,89%,16%) 100%)',
        backgroundSize: '200% 100%',
        animation: 'barShimmer 4s linear infinite',
        borderBottom: '1px solid hsla(258,89%,66%,0.3)',
        padding: '9px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, hsl(258,89%,66%), transparent)',
          opacity: 0.6,
        }}
      />

      {/* Pulsing dot */}
      <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'hsl(258,89%,72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            background: 'hsl(258,89%,72%)',
            animation: 'barDotPulse 1.8s ease-in-out infinite',
            opacity: 0,
          }}
        />
      </div>

      {/* Message text */}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'hsl(258,89%,88%)',
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}
      >
        {displayMessage}
      </span>

      {/* CTA chip if slots are available */}
      {openSlots !== undefined && openSlots > 0 && (
        <a
          href={`/${locale}/contributors/apply`}
          style={{
            padding: '3px 12px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, hsl(258,89%,66%), hsl(258,89%,50%))',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            boxShadow: '0 0 12px hsla(258,89%,66%,0.5)',
            animation: 'ctaGlow 2s ease-in-out infinite',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {locale === 'ar' ? 'انضم الآن' : 'Join Now'}
        </a>
      )}

      <style>{`
        @keyframes barShimmer {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes barDotPulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 0 12px hsla(258,89%,66%,0.5); }
          50% { box-shadow: 0 0 22px hsla(258,89%,66%,0.85); }
        }
      `}</style>
    </div>
  );
}
