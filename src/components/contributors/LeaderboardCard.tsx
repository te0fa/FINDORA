'use client';

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  active_referral_count: number;
  trust_score: number;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  currentContributorId?: string;
  locale: string;
}

const RANK_MEDALS: Record<number, { emoji: string; color: string; bg: string; glow: string }> = {
  1: {
    emoji: '🥇',
    color: 'hsl(43,96%,60%)',
    bg: 'hsla(43,96%,56%,0.12)',
    glow: 'hsla(43,96%,56%,0.25)',
  },
  2: {
    emoji: '🥈',
    color: 'hsl(220,15%,72%)',
    bg: 'hsla(220,15%,72%,0.1)',
    glow: 'hsla(220,15%,72%,0.15)',
  },
  3: {
    emoji: '🥉',
    color: 'hsl(25,80%,55%)',
    bg: 'hsla(25,80%,55%,0.12)',
    glow: 'hsla(25,80%,55%,0.2)',
  },
};

function maskName(name: string): string {
  if (!name || name.length < 2) return '***';
  const parts = name.trim().split(' ');
  return parts
    .map((part, i) => {
      if (i === 0) {
        // First name: show first 2 chars
        return part.length <= 2 ? part : part.slice(0, 2) + '***';
      }
      // Subsequent parts: show first char only
      return part.charAt(0) + '***';
    })
    .join(' ');
}

export default function LeaderboardCard({
  entries,
  currentContributorId,
  locale,
}: LeaderboardCardProps) {
  const isRTL = locale === 'ar';

  const t = {
    title: locale === 'ar' ? '🏆 لوحة المتصدرين' : '🏆 Leaderboard',
    rank: locale === 'ar' ? 'الرتبة' : 'Rank',
    name: locale === 'ar' ? 'المساهم' : 'Contributor',
    referrals: locale === 'ar' ? 'إحالات نشطة' : 'Active Refs',
    trust: locale === 'ar' ? 'الثقة' : 'Trust',
    you: locale === 'ar' ? 'أنت' : 'You',
    empty: locale === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet',
  };

  if (!entries || entries.length === 0) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          fontFamily: "'Inter', sans-serif",
          color: 'hsl(220,10%,55%)',
          textAlign: 'center',
          fontSize: '14px',
        }}
      >
        {t.empty}
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
      {/* Gold glow for top 1 */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: isRTL ? 'auto' : '-40px',
          left: isRTL ? '-40px' : 'auto',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(43,96%,56%,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

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

      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 80px 60px',
          gap: '8px',
          padding: '0 12px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '8px',
          fontSize: '10px',
          fontWeight: 600,
          color: 'hsl(220,10%,50%)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        <span>{t.rank}</span>
        <span>{t.name}</span>
        <span style={{ textAlign: 'center' }}>{t.referrals}</span>
        <span style={{ textAlign: 'center' }}>{t.trust}</span>
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map((entry) => {
          const medal = RANK_MEDALS[entry.rank];
          const isCurrentUser = currentContributorId && String(entry.rank) === currentContributorId;
          const maskedName = maskName(entry.full_name);

          return (
            <div
              key={entry.rank}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 80px 60px',
                gap: '8px',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '12px',
                background: isCurrentUser
                  ? 'linear-gradient(135deg, hsla(258,89%,66%,0.18), hsla(258,89%,66%,0.06))'
                  : medal
                  ? medal.bg
                  : 'rgba(255,255,255,0.02)',
                border: isCurrentUser
                  ? '1px solid hsla(258,89%,66%,0.4)'
                  : medal
                  ? `1px solid ${medal.color}33`
                  : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isCurrentUser
                  ? '0 0 20px hsla(258,89%,66%,0.15)'
                  : medal
                  ? `0 0 12px ${medal.glow}`
                  : 'none',
                transition: 'background 0.2s ease',
              }}
            >
              {/* Rank */}
              <div
                style={{
                  fontSize: '16px',
                  textAlign: 'center',
                  fontWeight: 800,
                  color: medal ? medal.color : 'hsl(220,10%,55%)',
                }}
              >
                {medal ? medal.emoji : `#${entry.rank}`}
              </div>

              {/* Name */}
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: isCurrentUser || medal ? 700 : 500,
                    color: isCurrentUser
                      ? 'hsl(258,89%,80%)'
                      : medal
                      ? medal.color
                      : 'hsl(220,15%,82%)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {maskedName}
                </div>
                {isCurrentUser && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'hsl(258,89%,70%)',
                      marginTop: '1px',
                    }}
                  >
                    {t.you}
                  </div>
                )}
              </div>

              {/* Active referrals */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'hsl(152,69%,55%)',
                }}
              >
                {entry.active_referral_count}
              </div>

              {/* Trust score */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'hsl(220,10%,65%)',
                }}
              >
                {entry.trust_score.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
