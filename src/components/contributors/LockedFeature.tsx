// Display-only component — no client hooks needed
interface LockedFeatureProps {
  featureName: string;
  labelEn: string;
  labelAr: string;
  referralsNeeded: number;
  locale: string;
}

export default function LockedFeature({
  featureName,
  labelEn,
  labelAr,
  referralsNeeded,
  locale,
}: LockedFeatureProps) {
  const isRTL = locale === 'ar';
  const label = locale === 'ar' ? labelAr : labelEn;

  const t = {
    referralsToUnlock:
      locale === 'ar'
        ? `${referralsNeeded} إحالة نشطة لفتح هذه الميزة`
        : `${referralsNeeded} active referrals to unlock`,
    invite: locale === 'ar' ? 'ادعُ أصدقاءك للوصول' : 'Invite friends to gain access',
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        minHeight: '160px',
      }}
    >
      {/* Blurred placeholder background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          filter: 'blur(2px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Abstract placeholder content behind blur */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[70, 50, 85, 40].map((w, i) => (
            <div
              key={i}
              style={{
                height: '10px',
                width: `${w}%`,
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Frosted glass overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8,10,20,0.65)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '32px 24px',
          minHeight: '160px',
          gap: '12px',
        }}
      >
        {/* Padlock icon */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
            border: '1.5px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 0 24px rgba(0,0,0,0.3)',
          }}
        >
          🔒
        </div>

        {/* Feature label */}
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'hsl(220,15%,85%)',
              marginBottom: '4px',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'hsl(220,10%,55%)',
            }}
          >
            {featureName}
          </div>
        </div>

        {/* Referrals badge */}
        <div
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            background:
              'linear-gradient(135deg, hsla(258,89%,66%,0.2), hsla(258,89%,66%,0.06))',
            border: '1px solid hsla(258,89%,66%,0.35)',
            fontSize: '12px',
            fontWeight: 700,
            color: 'hsl(258,89%,78%)',
          }}
        >
          🎯 {t.referralsToUnlock}
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'hsl(220,10%,50%)',
          }}
        >
          {t.invite}
        </div>
      </div>
    </div>
  );
}
