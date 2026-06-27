'use client';

interface LevelProgressCardProps {
  currentLevel: number;
  levelName: string;
  levelIcon: string;
  badgeColor: string;
  referralsToNext: number;
  nextLevelName: string | null;
  locale: string;
}

export default function LevelProgressCard({
  currentLevel,
  levelName,
  levelIcon,
  badgeColor,
  referralsToNext,
  nextLevelName,
  locale,
}: LevelProgressCardProps) {
  const isRTL = locale === 'ar';
  const isMaxLevel = nextLevelName === null;

  // Estimate progress bar fill (approximate: each tier is ~5 referrals away from next)
  // Since we only know referrals to NEXT tier, we infer fill as a rough visual
  // We'll show: if max level = 100%, else show progress based on rough 0→referralsToNext range
  // Defaulting to 70% fill as a visual guide when data is approximate
  const progressPct = isMaxLevel ? 100 : Math.max(10, 100 - Math.min(referralsToNext * 5, 90));

  const t = {
    title: locale === 'ar' ? '📊 مستوى التقدم' : '📊 Level Progress',
    level: locale === 'ar' ? 'المستوى' : 'Level',
    maxLevel: locale === 'ar' ? '🏆 أعلى مستوى!' : '🏆 Max Level!',
    away: locale === 'ar' ? 'إحالة للمستوى التالي' : 'referrals to next level',
    next: locale === 'ar' ? 'التالي' : 'Next',
  };

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
      {/* Radial glow from badge color */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          left: isRTL ? 'auto' : '-50px',
          right: isRTL ? '-50px' : 'auto',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${badgeColor}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <h3
        style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {t.title}
      </h3>

      {/* Badge + progress + next level row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        {/* Current level badge */}
        <div
          style={{
            flexShrink: 0,
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}88)`,
            border: `2px solid ${badgeColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${badgeColor}55, 0 0 40px ${badgeColor}22`,
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '24px', lineHeight: '1' }}>{levelIcon}</span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#fff',
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t.level} {currentLevel}
          </span>
        </div>

        {/* Level name */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: badgeColor,
              marginBottom: '2px',
              textShadow: `0 0 20px ${badgeColor}66`,
            }}
          >
            {levelName}
          </div>
          <div style={{ fontSize: '12px', color: 'hsl(220,10%,55%)' }}>
            {t.level} {currentLevel}
          </div>
        </div>

        {/* Next level badge (if exists) */}
        {!isMaxLevel && nextLevelName && (
          <div
            style={{
              flexShrink: 0,
              textAlign: isRTL ? 'left' : 'right',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: 'hsl(220,10%,55%)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t.next}
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'hsl(220,15%,80%)',
              }}
            >
              {nextLevelName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'hsl(43,96%,60%)',
                marginTop: '2px',
              }}
            >
              {referralsToNext} {t.away}
            </div>
          </div>
        )}

        {isMaxLevel && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, hsla(43,96%,56%,0.2), hsla(43,96%,56%,0.05))',
              border: '1px solid hsla(43,96%,56%,0.4)',
              fontSize: '13px',
              fontWeight: 700,
              color: 'hsl(43,96%,65%)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.maxLevel}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '11px',
            color: 'hsl(220,10%,55%)',
          }}
        >
          <span>{levelName}</span>
          {nextLevelName && <span>{nextLevelName}</span>}
        </div>

        <div
          style={{
            height: '8px',
            borderRadius: '99px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '99px',
              background: isMaxLevel
                ? `linear-gradient(90deg, ${badgeColor}88, ${badgeColor})`
                : `linear-gradient(90deg, ${badgeColor}88, ${badgeColor})`,
              transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 0 12px ${badgeColor}66`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '50%',
                height: '100%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmerBar 2.5s ease infinite',
              }}
            />
          </div>
        </div>

        {!isMaxLevel && (
          <div
            style={{
              marginTop: '8px',
              textAlign: 'center',
              fontSize: '12px',
              color: 'hsl(43,96%,60%)',
              fontWeight: 600,
            }}
          >
            🎯{' '}
            {locale === 'ar'
              ? `${referralsToNext} إحالة نشطة أخرى للوصول إلى ${nextLevelName}`
              : `${referralsToNext} more active referrals to reach ${nextLevelName}`}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmerBar {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
