'use client';

import { useState } from 'react';

interface Badge {
  badge_type: string;
  badge_label_en: string;
  badge_label_ar: string;
  earned_at: string | null;
}

interface BadgeDisplayProps {
  badges: Badge[];
  locale: string;
}

const BADGE_ICONS: Record<string, string> = {
  early_adopter: '⚡',
  first_referral: '🎯',
  five_referrals: '🌟',
  ten_referrals: '💎',
  twenty_five_referrals: '🚀',
  high_health: '💚',
  streak_7: '🔥',
  streak_30: '🌙',
  top_10: '🏆',
  founding_member: '👑',
  default: '🏅',
};

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function BadgeDisplay({ badges, locale }: BadgeDisplayProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isRTL = locale === 'ar';

  const t = {
    title: locale === 'ar' ? '🎖️ الأوسمة والإنجازات' : '🎖️ Badges & Achievements',
    earned: locale === 'ar' ? 'تم الكسب في' : 'Earned on',
    locked: locale === 'ar' ? 'مقفل' : 'Locked',
    noBadges:
      locale === 'ar'
        ? 'لا توجد أوسمة بعد — استمر في المشاركة!'
        : 'No badges yet — keep contributing!',
  };

  if (!badges || badges.length === 0) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          fontFamily: "'Inter', sans-serif",
          color: 'hsl(220,15%,95%)',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'hsl(220,10%,55%)', fontSize: '14px' }}>{t.noBadges}</p>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '28px',
        fontFamily: "'Inter', sans-serif",
        color: 'hsl(220,15%,95%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <h3
        style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {t.title}
      </h3>

      {/* Scrollable row */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent',
        }}
      >
        {badges.map((badge, index) => {
          const isEarned = badge.earned_at !== null;
          const icon = BADGE_ICONS[badge.badge_type] ?? BADGE_ICONS.default;
          const label =
            locale === 'ar' ? badge.badge_label_ar : badge.badge_label_en;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={badge.badge_type + index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                flexShrink: 0,
                position: 'relative',
                opacity: isEarned ? 1 : 0.3,
                cursor: isEarned ? 'default' : 'not-allowed',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transform: isHovered && isEarned ? 'translateY(-4px) scale(1.02)' : 'none',
              }}
            >
              {/* Badge chip */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '14px 12px 10px',
                  borderRadius: '14px',
                  background: isEarned
                    ? 'linear-gradient(135deg, hsla(258,89%,66%,0.18), hsla(258,89%,66%,0.06))'
                    : 'rgba(255,255,255,0.04)',
                  border: isEarned
                    ? '1px solid hsla(258,89%,66%,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  minWidth: '80px',
                  boxShadow:
                    isEarned && isHovered
                      ? '0 8px 32px hsla(258,89%,66%,0.3)'
                      : isEarned
                      ? '0 0 0 hsla(258,89%,66%,0)'
                      : 'none',
                  transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                }}
              >
                <span style={{ fontSize: '28px', marginBottom: '6px' }}>
                  {isEarned ? icon : '?'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isEarned ? 'hsl(258,89%,78%)' : 'hsl(220,10%,55%)',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    maxWidth: '72px',
                    wordBreak: 'break-word',
                  }}
                >
                  {isEarned ? label : t.locked}
                </span>
              </div>

              {/* Tooltip on hover */}
              {isHovered && isEarned && badge.earned_at && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'hsl(220,25%,16%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: 'hsl(220,10%,75%)',
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    animation: 'tooltipFade 0.15s ease',
                  }}
                >
                  {t.earned}: {formatDate(badge.earned_at, locale)}
                  {/* Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '8px',
                      height: '8px',
                      background: 'hsl(220,25%,16%)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderTop: 'none',
                      borderLeft: 'none',
                      rotate: '45deg',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Badge count summary */}
      <div
        style={{
          marginTop: '16px',
          fontSize: '12px',
          color: 'hsl(220,10%,55%)',
        }}
      >
        {locale === 'ar'
          ? `${badges.filter((b) => b.earned_at).length} من ${badges.length} وسام مكتسب`
          : `${badges.filter((b) => b.earned_at).length} of ${badges.length} badges earned`}
      </div>

      <style>{`
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
