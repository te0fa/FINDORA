'use client';

import { ContributorTier } from '@/lib/contributors/access-system';

interface UnlockLadderCardProps {
  tiers: ContributorTier[];
  activeReferrals: number;
  locale: string;
}

const TIER_ICONS: Record<string, string> = {
  novice: '🌱',
  builder: '🔨',
  networker: '⚡',
  leader: '🔥',
  legend: '👑',
};

const TIER_UNLOCKS: Record<string, { en: string; ar: string }> = {
  novice: { en: 'Basic task access', ar: 'وصول أساسي للمهام' },
  builder: {
    en: 'Withdrawal unlocked + 1.1× multiplier',
    ar: 'السحب متاح + مضاعف 1.1×',
  },
  networker: {
    en: 'Premium tasks + 1.25× multiplier',
    ar: 'مهام مميزة + مضاعف 1.25×',
  },
  leader: {
    en: 'Increased payout limits + 1.5× multiplier',
    ar: 'حدود سحب وسرعة أكبر + مضاعف 1.5×',
  },
  legend: {
    en: 'L2 network revenue share + 2.0× multiplier',
    ar: 'حصة أرباح الشبكة L2 وبدون سقف أرباح + مضاعف 2.0×',
  },
};

export default function UnlockLadderCard({
  tiers,
  activeReferrals,
  locale,
}: UnlockLadderCardProps) {
  const isRTL = locale === 'ar';

  // Determine current tier index based on activeReferrals
  let currentTierIndex = -1;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (activeReferrals >= (tiers[i].required_active_referrals ?? 0)) {
      currentTierIndex = i;
      break;
    }
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
        color: 'hsl(220, 15%, 95%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(258,89%,66%,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <h3
        style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          fontWeight: 700,
          color: 'hsl(220, 15%, 95%)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {locale === 'ar' ? '🏅 سلم الترقيات' : '🏅 Unlock Ladder'}
      </h3>

      <div style={{ position: 'relative' }}>
        {/* Vertical connector line */}
        <div
          style={{
            position: 'absolute',
            left: isRTL ? 'auto' : '23px',
            right: isRTL ? '23px' : 'auto',
            top: '24px',
            bottom: '24px',
            width: '2px',
            background:
              'linear-gradient(to bottom, hsl(258,89%,66%), rgba(255,255,255,0.1))',
            borderRadius: '2px',
          }}
        />

        {tiers.map((tier, index) => {
          const isActive = index === currentTierIndex;
          const isLocked = index > currentTierIndex;
          const tierKey = (tier.name_en || '').toLowerCase();
          const icon = TIER_ICONS[tierKey] || '⭐️';
          const unlockText = TIER_UNLOCKS[tierKey];
          const referralsNeeded =
            tier.required_active_referrals != null
              ? Math.max(0, tier.required_active_referrals - activeReferrals)
              : 0;

          return (
            <div
              key={tier.level_number ?? index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: index < tiers.length - 1 ? '20px' : '0',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                position: 'relative',
              }}
            >
              {/* Icon node */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  position: 'relative',
                  zIndex: 1,
                  background: isActive
                    ? 'linear-gradient(135deg, hsl(258,89%,66%), hsl(258,89%,50%))'
                    : isLocked
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, hsl(152,69%,51%), hsl(152,69%,38%))',
                  border: isActive
                    ? '2px solid hsl(258,89%,75%)'
                    : isLocked
                    ? '2px solid rgba(255,255,255,0.1)'
                    : '2px solid hsl(152,69%,55%)',
                  boxShadow: isActive
                    ? '0 0 20px hsla(258,89%,66%,0.6), 0 0 40px hsla(258,89%,66%,0.3)'
                    : 'none',
                  animation: isActive ? 'pulseTierGlow 2s ease-in-out infinite' : 'none',
                }}
              >
                {isLocked ? '🔒' : icon}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isActive
                    ? 'linear-gradient(135deg, hsla(258,89%,66%,0.15), hsla(258,89%,66%,0.05))'
                    : isLocked
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(152,215,160,0.05)',
                  border: isActive
                    ? '1px solid hsla(258,89%,66%,0.4)'
                    : isLocked
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid hsla(152,69%,51%,0.3)',
                  opacity: isLocked ? 0.65 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isActive
                        ? 'hsl(258,89%,80%)'
                        : isLocked
                        ? 'hsl(220,10%,60%)'
                        : 'hsl(152,69%,65%)',
                    }}
                  >
                    {locale === 'ar'
                      ? (tier.name_ar ?? tier.name_en ?? '')
                      : (tier.name_en ?? '')}
                  </span>

                  {isActive && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: 'hsl(258,89%,66%)',
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {locale === 'ar' ? 'الحالي' : 'Current'}
                    </span>
                  )}

                  {!isActive && !isLocked && tier.required_active_referrals != null && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'hsl(152,69%,51%)',
                      }}
                    >
                      ✓ {locale === 'ar' ? 'مفتوح' : 'Unlocked'}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '12px',
                    color: isLocked ? 'hsl(220,10%,45%)' : 'hsl(220,10%,65%)',
                    lineHeight: '1.5',
                  }}
                >
                  {locale === 'ar'
                    ? unlockText?.ar ?? ''
                    : unlockText?.en ?? ''}
                </p>

                {/* Min referrals required */}
                {tier.required_active_referrals != null && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'hsl(220,10%,50%)',
                    }}
                  >
                    {locale === 'ar'
                      ? `${tier.required_active_referrals} إحالات نشطة مطلوبة`
                      : `${tier.required_active_referrals} active referrals required`}
                  </div>
                )}

                {/* Next tier countdown */}
                {index === currentTierIndex + 1 && referralsNeeded > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'hsl(43,96%,60%)',
                      background: 'hsla(43,96%,56%,0.1)',
                      border: '1px solid hsla(43,96%,56%,0.25)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      display: 'inline-block',
                    }}
                  >
                    {locale === 'ar'
                      ? `🎯 ${referralsNeeded} إحالة أخرى للفتح`
                      : `🎯 ${referralsNeeded} more referrals to unlock`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulseTierGlow {
          0%, 100% { box-shadow: 0 0 20px hsla(258,89%,66%,0.6), 0 0 40px hsla(258,89%,66%,0.3); }
          50% { box-shadow: 0 0 30px hsla(258,89%,66%,0.9), 0 0 60px hsla(258,89%,66%,0.5); }
        }
      `}</style>
    </div>
  );
}
