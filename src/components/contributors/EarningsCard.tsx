// Display-only component
interface EarningsCardProps {
  baseMultiplier: number;
  stabilizerMultiplier: number;
  effectiveMultiplier: number;
  monthlyCap: number | null;
  locale: string;
}

export default function EarningsCard({
  baseMultiplier,
  stabilizerMultiplier,
  effectiveMultiplier,
  monthlyCap,
  locale,
}: EarningsCardProps) {
  const isRTL = locale === 'ar';
  const stabilizerActive = stabilizerMultiplier < 1.0;

  // For the cap progress bar, we need current earnings — we'll show a placeholder bar
  // Since this is display-only, we'll show the cap value as a limit indicator
  const capProgressPct = monthlyCap !== null ? Math.min(85, (effectiveMultiplier / 2.0) * 100) : null;

  const t = {
    title: locale === 'ar' ? '💰 مضاعفات الأرباح' : '💰 Earnings Multipliers',
    base: locale === 'ar' ? 'المضاعف الأساسي' : 'Base Multiplier',
    stabilizer: locale === 'ar' ? 'مثبّت الاقتصاد' : 'Economy Stabilizer',
    effective: locale === 'ar' ? 'المضاعف الفعّال' : 'Effective Multiplier',
    monthlyCap: locale === 'ar' ? 'الحد الشهري' : 'Monthly Cap',
    unlimited: locale === 'ar' ? '∞ غير محدود' : '∞ Unlimited',
    stabilizerWarning:
      locale === 'ar'
        ? '⚠️ مثبّت الاقتصاد نشط — مضاعفاتك مخفضة مؤقتًا'
        : '⚠️ Economy Stabilizer Active — multipliers temporarily reduced',
    formula: locale === 'ar' ? 'الحساب' : 'Calculation',
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
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: isRTL ? 'auto' : '-50px',
          left: isRTL ? '-50px' : 'auto',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(258,89%,66%,0.1) 0%, transparent 70%)',
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

      {/* Stabilizer warning */}
      {stabilizerActive && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'hsla(43,96%,56%,0.1)',
            border: '1px solid hsla(43,96%,56%,0.35)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'hsl(43,96%,56%)',
              color: 'hsl(220,25%,8%)',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}
          >
            {locale === 'ar' ? 'نشط' : 'Active'}
          </span>
          <span style={{ fontSize: '12px', color: 'hsl(43,96%,70%)', lineHeight: '1.4' }}>
            {t.stabilizerWarning}
          </span>
        </div>
      )}

      {/* Multiplier formula */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'hsl(220,10%,55%)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t.formula}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: isRTL ? 'flex-end' : 'flex-start',
          }}
        >
          {/* Base */}
          <MultiplierBlock
            label={t.base}
            value={`${baseMultiplier.toFixed(2)}×`}
            color="hsl(258,89%,72%)"
            bg="hsla(258,89%,66%,0.12)"
            border="hsla(258,89%,66%,0.3)"
          />

          <span style={{ color: 'hsl(220,10%,45%)', fontSize: '20px', fontWeight: 300 }}>×</span>

          {/* Stabilizer */}
          <MultiplierBlock
            label={t.stabilizer}
            value={`${stabilizerMultiplier.toFixed(2)}×`}
            color={stabilizerActive ? 'hsl(43,96%,60%)' : 'hsl(152,69%,55%)'}
            bg={stabilizerActive ? 'hsla(43,96%,56%,0.1)' : 'hsla(152,69%,51%,0.1)'}
            border={stabilizerActive ? 'hsla(43,96%,56%,0.3)' : 'hsla(152,69%,51%,0.25)'}
          />

          <span style={{ color: 'hsl(220,10%,45%)', fontSize: '20px', fontWeight: 300 }}>=</span>

          {/* Effective */}
          <MultiplierBlock
            label={t.effective}
            value={`${effectiveMultiplier.toFixed(2)}×`}
            color="hsl(152,69%,55%)"
            bg="hsla(152,69%,51%,0.15)"
            border="hsla(152,69%,51%,0.4)"
            large
            glow="hsla(152,69%,51%,0.3)"
          />
        </div>
      </div>

      {/* Monthly cap */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'hsl(220,10%,55%)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {t.monthlyCap}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color:
                monthlyCap === null ? 'hsl(152,69%,55%)' : 'hsl(220,15%,85%)',
            }}
          >
            {monthlyCap === null
              ? t.unlimited
              : `${monthlyCap.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} FNDRA`}
          </span>
        </div>

        {monthlyCap !== null && capProgressPct !== null && (
          <div
            style={{
              height: '6px',
              borderRadius: '99px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${capProgressPct}%`,
                borderRadius: '99px',
                background:
                  capProgressPct > 80
                    ? 'linear-gradient(90deg, hsl(43,96%,40%), hsl(0,84%,55%))'
                    : 'linear-gradient(90deg, hsl(258,89%,50%), hsl(258,89%,66%))',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow:
                  capProgressPct > 80
                    ? '0 0 8px hsla(0,84%,60%,0.4)'
                    : '0 0 8px hsla(258,89%,66%,0.4)',
              }}
            />
          </div>
        )}

        {monthlyCap === null && (
          <div
            style={{
              height: '6px',
              borderRadius: '99px',
              background:
                'linear-gradient(90deg, hsla(152,69%,51%,0.3), hsla(152,69%,51%,0.6), hsla(152,69%,51%,0.3))',
              backgroundSize: '200% 100%',
              animation: 'shimmerUnlimited 2s linear infinite',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes shimmerUnlimited {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function MultiplierBlock({
  label,
  value,
  color,
  bg,
  border,
  large,
  glow,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
  large?: boolean;
  glow?: string;
}) {
  return (
    <div
      style={{
        padding: large ? '14px 20px' : '10px 16px',
        borderRadius: '12px',
        background: bg,
        border: `1px solid ${border}`,
        textAlign: 'center',
        boxShadow: glow ? `0 0 20px ${glow}` : 'none',
      }}
    >
      <div
        style={{
          fontSize: large ? '24px' : '18px',
          fontWeight: 800,
          color,
          lineHeight: '1',
          marginBottom: '4px',
          textShadow: glow ? `0 0 16px ${glow}` : 'none',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: 'hsl(220,10%,55%)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
}
