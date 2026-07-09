'use client'

import React, { useState } from 'react'

export default function EarningsCalculator({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const [role, setRole] = useState<'scout' | 'insider' | 'casual'>('scout')
  const [dailyTasks, setDailyTasks] = useState(5)

  const formatNum = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const rates = {
    scout: { name: isAr ? 'مندوب ميداني (Field Scout)' : 'Field Scout', rate: 30, unit: isAr ? 'جنيه كاش' : 'EGP Cash' },
    insider: { name: isAr ? 'موظف معرض (Store Insider)' : 'Store Insider', rate: 20, unit: isAr ? 'جنيه عمولة' : 'EGP Comm.' },
    casual: { name: isAr ? 'مساهم عادي (Casual User)' : 'Casual User', rate: 10, unit: isAr ? 'نقطة (تحول لكاش)' : 'Points (to Cash)' }
  }

  const current = rates[role]
  const dailyTotal = dailyTasks * current.rate
  const weeklyTotal = dailyTotal * 7
  const monthlyTotal = dailyTotal * 30

  // Estimate capabilities unlocked
  let levelBadge = '🥉 Level 1'
  let levelColor = 'hsl(30,84%,55%)'
  let levelDesc = isAr 
    ? 'مبتدئ: عمولة أساسية وبداية سريعة للأرباح.' 
    : 'Beginner: Base payout rate and immediate start.'

  if (role === 'casual') {
    const totalMonthlyTasks = dailyTasks * 30
    if (totalMonthlyTasks >= 10) {
      levelBadge = '🔓 Cash Unlocked'
      levelColor = '#4ade80'
      levelDesc = isAr 
        ? 'تهانينا! تجاوزت حد الـ 10 مهام معتمدة. يمكنك الآن سحب أرباحك كاش حقيقي!' 
        : 'Congratulations! You completed over 10 tasks. Points to cash conversion is fully unlocked!'
    } else {
      levelBadge = '🔒 Points Only'
      levelColor = '#f87171'
      levelDesc = isAr 
        ? `أكمل ${10 - totalMonthlyTasks} مهام أخرى لفتح خيار سحب الأرباح كاش (لتجنب الحسابات الوهمية).` 
        : `Complete ${10 - totalMonthlyTasks} more tasks to unlock cash conversion (prevents fraud).`
    }
  } else {
    if (monthlyTotal > 6000) {
      levelBadge = '👑 Level 3 (Team Leader)'
      levelColor = '#f7d46b'
      levelDesc = isAr 
        ? 'قائد فريق: مضاعف أرباح 1.25x وعمولة 5% مستمرة على أرباح فريق الـ Affiliate الخاص بك!' 
        : 'Team Leader: 1.25x multiplier + 5% recurring commission on your affiliate team!'
    } else if (monthlyTotal > 2000) {
      levelBadge = '🥈 Level 2 (Elite)'
      levelColor = '#e2e8f0'
      levelDesc = isAr 
        ? 'مساهم محترف: عمولات أعلى ومكافأة سرعة إتمام المهام.' 
        : 'Elite Scout: Higher limits, faster payouts, and unlock referrals.'
    }
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      padding: '32px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      maxWidth: '650px',
      margin: '0 auto'
    }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, color: '#fff', textAlign: 'center' }}>
        {isAr ? '🧮 حاسبة أرباح الشركاء المتوقعة' : '🧮 Interactive Earnings Estimator'}
      </h3>

      {/* Role Picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(Object.keys(rates) as Array<keyof typeof rates>).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            suppressHydrationWarning
            style={{
              flex: 1,
              minWidth: 140,
              padding: '12px 16px',
              borderRadius: '12px',
              border: role === r ? '2px solid hsl(258,89%,66%)' : '1px solid rgba(255,255,255,0.08)',
              background: role === r ? 'hsl(258,89%,66%,0.15)' : 'rgba(255,255,255,0.02)',
              color: role === r ? '#fff' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {rates[r].name}
          </button>
        ))}
      </div>

      {/* Tasks Slider */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.9rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {isAr ? 'عدد المهام المكتملة يومياً:' : 'Daily Completed Tasks:'}
          </span>
          <span style={{ color: 'hsl(258,89%,70%)', fontWeight: 800, fontSize: '1.05rem' }}>
            {dailyTasks} {isAr ? 'مهمة / عرض' : 'tasks'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="30"
          suppressHydrationWarning
          value={dailyTasks}
          onChange={(e) => setDailyTasks(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'hsl(258,89%,66%)',
            cursor: 'pointer',
            height: '6px',
            borderRadius: '999px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
          <span>1</span>
          <span>15</span>
          <span>30</span>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        background: 'rgba(0,0,0,0.3)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: 24,
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            {isAr ? 'يومياً' : 'Daily'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
            {formatNum(dailyTotal)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{current.unit}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            {isAr ? 'أسبوعياً' : 'Weekly'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'hsl(152,69%,51%)' }}>
            {formatNum(weeklyTotal)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{current.unit}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            {isAr ? 'شهرياً' : 'Monthly'}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#f7d46b' }}>
            {formatNum(monthlyTotal)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{current.unit}</div>
        </div>
      </div>

      {/* Unlocked Level Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 900,
          color: levelColor,
          background: `${levelColor}15`,
          border: `1px solid ${levelColor}33`,
          padding: '4px 10px',
          borderRadius: '999px',
          whiteSpace: 'nowrap'
        }}>
          {levelBadge}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
          {levelDesc}
        </div>
      </div>
    </div>
  )
}
