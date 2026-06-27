'use client';

import { useState, useCallback } from 'react';

interface ReferralHubProps {
  referralCode: string;
  referralCount: number;
  activeCount: number;
  locale: string;
}

export default function ReferralHub({
  referralCode,
  referralCount,
  activeCount,
  locale,
}: ReferralHubProps) {
  const [copied, setCopied] = useState(false);
  const isRTL = locale === 'ar';

  const referralLink = `https://findora.app/join/${referralCode}`;
  const inactiveCount = referralCount - activeCount;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referralLink]);

  const t = {
    title: locale === 'ar' ? '🔗 مركز الإحالات' : '🔗 Referral Hub',
    yourLink: locale === 'ar' ? 'رابط الإحالة الخاص بك' : 'Your Referral Link',
    copy: locale === 'ar' ? 'نسخ' : 'Copy',
    copied: locale === 'ar' ? '✓ تم النسخ!' : '✓ Copied!',
    qrHint:
      locale === 'ar'
        ? '📱 مسح رمز QR للمشاركة'
        : '📱 Scan QR code to share',
    stats: locale === 'ar' ? 'إحصائيات الإحالة' : 'Referral Stats',
    total: locale === 'ar' ? 'إجمالي المُحالين' : 'Total Referred',
    active: locale === 'ar' ? 'نشط' : 'Active',
    inactive: locale === 'ar' ? 'غير نشط' : 'Inactive',
    shareVia: locale === 'ar' ? 'مشاركة عبر' : 'Share via',
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
        color: 'hsl(220, 15%, 95%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          left: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(152,69%,51%,0.12) 0%, transparent 70%)',
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
          color: 'hsl(220,15%,95%)',
        }}
      >
        {t.title}
      </h3>

      {/* Referral link section */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: 'hsl(220,10%,60%)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t.yourLink}
        </label>

        <div
          style={{
            display: 'flex',
            gap: '0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              color: 'hsl(220,15%,80%)',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {referralLink}
          </div>

          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              padding: '12px 20px',
              background: copied
                ? 'linear-gradient(135deg, hsl(152,69%,40%), hsl(152,69%,32%))'
                : 'linear-gradient(135deg, hsl(258,89%,66%), hsl(258,89%,50%))',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: copied ? 'flashGreen 0.3s ease' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      </div>

      {/* QR Code hint area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.12)',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background =
            'rgba(255,255,255,0.06)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background =
            'rgba(255,255,255,0.03)')
        }
      >
        {/* QR placeholder */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
          }}
        >
          ▦
        </div>
        <span style={{ fontSize: '13px', color: 'hsl(220,10%,65%)' }}>
          {t.qrHint}
        </span>
      </div>

      {/* Stats */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'hsl(220,10%,60%)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t.stats}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Total */}
          <StatChip
            value={referralCount}
            label={t.total}
            color="hsl(220,10%,65%)"
            bg="rgba(255,255,255,0.05)"
            border="rgba(255,255,255,0.1)"
          />

          {/* Active */}
          <StatChip
            value={activeCount}
            label={t.active}
            color="hsl(152,69%,55%)"
            bg="hsla(152,69%,51%,0.1)"
            border="hsla(152,69%,51%,0.3)"
            glow="hsla(152,69%,51%,0.25)"
          />

          {/* Inactive */}
          <StatChip
            value={inactiveCount}
            label={t.inactive}
            color="hsl(220,10%,55%)"
            bg="rgba(255,255,255,0.03)"
            border="rgba(255,255,255,0.06)"
          />
        </div>
      </div>

      {/* Active rate bar */}
      {referralCount > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
              fontSize: '11px',
              color: 'hsl(220,10%,60%)',
            }}
          >
            <span>{locale === 'ar' ? 'معدل النشاط' : 'Activity Rate'}</span>
            <span style={{ color: 'hsl(152,69%,55%)' }}>
              {Math.round((activeCount / referralCount) * 100)}%
            </span>
          </div>
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
                width: `${(activeCount / referralCount) * 100}%`,
                borderRadius: '99px',
                background:
                  'linear-gradient(90deg, hsl(152,69%,40%), hsl(152,69%,55%))',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 8px hsla(152,69%,51%,0.5)',
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes flashGreen {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function StatChip({
  value,
  label,
  color,
  bg,
  border,
  glow,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
  border: string;
  glow?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: '80px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: bg,
        border: `1px solid ${border}`,
        textAlign: 'center',
        boxShadow: glow ? `0 0 16px ${glow}` : 'none',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color,
          lineHeight: '1',
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'hsl(220,10%,55%)',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
