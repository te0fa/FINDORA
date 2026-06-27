'use client';

interface StreakTrackerProps {
  dailyStreak: number;
  weeklyStreak: number;
  bestStreak: number;
  bonusActive: boolean;
  locale: string;
}

export default function StreakTracker({
  dailyStreak,
  weeklyStreak,
  bestStreak,
  bonusActive,
  locale,
}: StreakTrackerProps) {
  const isRTL = locale === 'ar';

  // 7 fire icons — how many consecutive days are filled
  const filledDays = Math.min(7, dailyStreak % 7 || (dailyStreak > 0 && dailyStreak % 7 === 0 ? 7 : 0));
  const totalFilled = Math.min(7, dailyStreak);

  const t = {
    title: locale === 'ar' ? '🔥 متتاليات الأداء' : '🔥 Activity Streaks',
    daily: locale === 'ar' ? 'متتالية يومية' : 'Daily Streak',
    weekly: locale === 'ar' ? 'متتالية أسبوعية' : 'Weekly Streak',
    best: locale === 'ar' ? 'أفضل متتالية' : 'Best Streak',
    days: locale === 'ar' ? 'يوم' : 'days',
    weeks: locale === 'ar' ? 'أسبوع' : 'weeks',
    bonusActive: locale === 'ar' ? '🔥 مكافأة نشطة' : '🔥 Bonus Active',
    bonusDesc:
      locale === 'ar'
        ? 'مضاعف الأرباح نشط بسبب المتتالية'
        : 'Earnings multiplier active due to streak',
    noStreak: locale === 'ar' ? 'ابدأ المتتالية اليوم!' : 'Start your streak today!',
  };

  const dayLabels = isRTL
    ? ['ج', 'خ', 'ر', 'أ', 'ث', 'ن', 'ح']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
      {/* Glow if bonus active */}
      {bonusActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '20px',
            border: '1px solid hsla(43,96%,56%,0.35)',
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 40px hsla(43,96%,56%,0.06)',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t.title}
        </h3>

        {/* Bonus chip */}
        {bonusActive && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background:
                'linear-gradient(135deg, hsla(43,96%,56%,0.25), hsla(43,96%,56%,0.1))',
              border: '1px solid hsla(43,96%,56%,0.45)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'hsl(43,96%,70%)',
              boxShadow: '0 0 16px hsla(43,96%,56%,0.3)',
              animation: 'bonusPulse 2s ease-in-out infinite',
            }}
          >
            {t.bonusActive}
          </div>
        )}
      </div>

      {/* 7 fire icons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '8px',
        }}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const filled = i < totalFilled;
          const isLast = i === totalFilled - 1;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  background: filled
                    ? isLast && bonusActive
                      ? 'linear-gradient(135deg, hsla(43,96%,56%,0.35), hsla(43,96%,56%,0.15))'
                      : 'linear-gradient(135deg, hsla(25,100%,55%,0.3), hsla(25,100%,45%,0.1))'
                    : 'rgba(255,255,255,0.04)',
                  border: filled
                    ? isLast && bonusActive
                      ? '1px solid hsla(43,96%,56%,0.6)'
                      : '1px solid hsla(25,100%,55%,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow:
                    filled && isLast && bonusActive
                      ? '0 0 16px hsla(43,96%,56%,0.5)'
                      : filled
                      ? '0 0 10px hsla(25,100%,55%,0.25)'
                      : 'none',
                  filter: filled ? 'none' : 'grayscale(1)',
                  opacity: filled ? 1 : 0.3,
                  transition: 'all 0.3s ease',
                  animation: filled && isLast && bonusActive ? 'fireWiggle 0.8s ease-in-out infinite alternate' : 'none',
                }}
              >
                🔥
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: filled ? 'hsl(25,100%,65%)' : 'hsl(220,10%,45%)',
                  fontWeight: filled ? 600 : 400,
                }}
              >
                {dayLabels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bonus description */}
      {bonusActive && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'hsl(43,96%,65%)',
            margin: '0 0 20px 0',
          }}
        >
          {t.bonusDesc}
        </p>
      )}

      {dailyStreak === 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'hsl(220,10%,55%)',
            margin: '8px 0 16px',
          }}
        >
          {t.noStreak}
        </p>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '20px',
        }}
      >
        <StreakStat value={dailyStreak} label={t.daily} unit={t.days} primary />
        <StreakStat value={weeklyStreak} label={t.weekly} unit={t.weeks} />
        <StreakStat value={bestStreak} label={t.best} unit={t.days} gold />
      </div>

      <style>{`
        @keyframes bonusPulse {
          0%, 100% { box-shadow: 0 0 16px hsla(43,96%,56%,0.3); }
          50% { box-shadow: 0 0 28px hsla(43,96%,56%,0.6); }
        }
        @keyframes fireWiggle {
          0% { transform: rotate(-5deg) scale(1.05); }
          100% { transform: rotate(5deg) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function StreakStat({
  value,
  label,
  unit,
  primary,
  gold,
}: {
  value: number;
  label: string;
  unit: string;
  primary?: boolean;
  gold?: boolean;
}) {
  const color = gold
    ? 'hsl(43,96%,60%)'
    : primary
    ? 'hsl(258,89%,72%)'
    : 'hsl(220,15%,80%)';

  return (
    <div
      style={{
        flex: 1,
        padding: '12px',
        borderRadius: '12px',
        background: gold
          ? 'hsla(43,96%,56%,0.08)'
          : primary
          ? 'hsla(258,89%,66%,0.08)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${gold ? 'hsla(43,96%,56%,0.25)' : primary ? 'hsla(258,89%,66%,0.2)' : 'rgba(255,255,255,0.06)'}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color,
          lineHeight: '1',
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'hsl(220,10%,55%)', lineHeight: '1.4' }}>
        {unit}
        <br />
        {label}
      </div>
    </div>
  );
}
