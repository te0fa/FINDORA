'use client'
/**
 * src/app/[locale]/admin/link-analytics/LinkAnalyticsClient.tsx
 * Analytics dashboard for link attempt logs.
 */

import React, { useState, useTransition } from 'react'
import { getAnalyticsAction } from './actions'
import type { LinkAttemptSummary, TopRejectedDomain, LinkAttemptRow } from '@/lib/dal/link-attempts'

interface Props {
  locale: string
  initialSummary: LinkAttemptSummary
  initialTopRejected: TopRejectedDomain[]
  initialRecent: LinkAttemptRow[]
}

type Days = 7 | 30

const OUTCOME_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  accepted:           { ar: 'مقبول',           en: 'Accepted',       color: '#4ade80' },
  rejected_domain:    { ar: 'دومين مرفوض',     en: 'Bad Domain',     color: '#f87171' },
  rejected_malformed: { ar: 'رابط خاطئ',       en: 'Malformed URL',  color: '#fb923c' },
  rejected_disabled:  { ar: 'ميزة معطّلة',     en: 'Feature Off',    color: '#94a3b8' },
  fetch_failed:       { ar: 'فشل الجلب',       en: 'Fetch Failed',   color: '#fbbf24' },
}

function OutcomeBadge({ outcome, isAr }: { outcome: string; isAr: boolean }) {
  const info = OUTCOME_LABELS[outcome] ?? { ar: outcome, en: outcome, color: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: info.color + '22',
      color: info.color,
      border: `1px solid ${info.color}44`,
    }}>
      {isAr ? info.ar : info.en}
    </span>
  )
}

function StatCard({ value, label, color = '#6366f1' }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${color}33`,
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      textAlign: 'center',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function LinkAnalyticsClient({ locale, initialSummary, initialTopRejected, initialRecent }: Props) {
  const isAr = locale === 'ar'
  const [days, setDays]               = useState<Days>(7)
  const [summary, setSummary]         = useState(initialSummary)
  const [topRejected, setTopRejected] = useState(initialTopRejected)
  const [recent, setRecent]           = useState(initialRecent)
  const [loading, startTransition]    = useTransition()

  function switchDays(d: Days) {
    setDays(d)
    startTransition(async () => {
      const result = await getAnalyticsAction(d)
      setSummary(result.summary)
      setTopRejected(result.topRejected)
      setRecent(result.recent)
    })
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .la-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .la-title { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.25rem; }
        .la-sub { color: #94a3b8; font-size: 0.875rem; margin: 0 0 1.5rem; }
        .la-section-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; margin: 0 0 1rem; }
        .la-pills { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .la-pill { padding: 0.4rem 1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid #334155; background: transparent; color: #94a3b8; transition: all 0.15s; }
        .la-pill.active { background: #6366f1; border-color: #6366f1; color: #fff; }
        .la-cards-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .la-table { width: 100%; border-collapse: collapse; }
        .la-table th { text-align: start; color: #64748b; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; }
        .la-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #0f172a; font-size: 0.875rem; color: #cbd5e1; vertical-align: middle; }
        .la-table tr:last-child td { border-bottom: none; }
        .la-table tr:hover td { background: #0d1526; }
        .la-domain { font-family: monospace; color: #a5b4fc; font-weight: 600; }
        .la-count { font-weight: 700; color: #f1f5f9; }
        .la-quick-add { padding: 0.3rem 0.7rem; border-radius: 6px; background: #6366f120; color: #818cf8; border: 1px solid #6366f140; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; transition: background 0.15s; }
        .la-quick-add:hover { background: #6366f130; }
        .la-empty { text-align: center; color: #475569; padding: 2rem; font-size: 0.875rem; }
        .la-loading { opacity: 0.5; pointer-events: none; }
      `}</style>

      <h1 className="la-title">
        {isAr ? '📊 تحليل محاولات الروابط' : '📊 Link Attempt Analytics'}
      </h1>
      <p className="la-sub">
        {isAr
          ? 'رؤية شاملة لطلبات العملاء — أي الدومينات الأكثر طلباً والمرفوضة'
          : 'Overview of customer link submissions — which domains are most in demand'}
      </p>

      {/* Date range toggle */}
      <div className="la-pills">
        <button className={`la-pill ${days === 7  ? 'active' : ''}`} onClick={() => switchDays(7)}>
          {isAr ? 'آخر 7 أيام' : 'Last 7 days'}
        </button>
        <button className={`la-pill ${days === 30 ? 'active' : ''}`} onClick={() => switchDays(30)}>
          {isAr ? 'آخر 30 يوم' : 'Last 30 days'}
        </button>
      </div>

      {/* Summary cards */}
      <div className={`la-cards-row ${loading ? 'la-loading' : ''}`}>
        <StatCard value={summary.total}     label={isAr ? 'إجمالي المحاولات' : 'Total Attempts'} color="#6366f1" />
        <StatCard value={summary.accepted}  label={isAr ? 'مقبولة'           : 'Accepted'}       color="#4ade80" />
        <StatCard value={summary.rejected}  label={isAr ? 'مرفوضة'           : 'Rejected'}       color="#f87171" />
        <StatCard
          value={`${summary.rejectionRate}%`}
          label={isAr ? 'معدل الرفض' : 'Rejection Rate'}
          color={summary.rejectionRate > 50 ? '#f87171' : summary.rejectionRate > 20 ? '#fbbf24' : '#4ade80'}
        />
      </div>

      {/* Top rejected domains */}
      <div className={`la-card ${loading ? 'la-loading' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h2 className="la-section-title" style={{ margin: 0 }}>
            {isAr ? '🔴 أكتر الدومينات المرفوضة' : '🔴 Top Rejected Domains'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            {isAr
              ? 'الدومينات التي حاول العملاء استخدامها لكن غير مدرجة في القائمة البيضاء'
              : 'Domains customers tried but are not in the allowlist'}
          </p>
        </div>
        {topRejected.length === 0 ? (
          <p className="la-empty">{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
        ) : (
          <table className="la-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{isAr ? 'الدومين' : 'Domain'}</th>
                <th>{isAr ? 'عدد المحاولات' : 'Attempts'}</th>
                <th>{isAr ? 'إجراء سريع' : 'Quick Action'}</th>
              </tr>
            </thead>
            <tbody>
              {topRejected.map((row, i) => (
                <tr key={row.domain}>
                  <td style={{ color: '#475569' }}>{i + 1}</td>
                  <td><span className="la-domain">{row.domain}</span></td>
                  <td><span className="la-count">{row.count}</span></td>
                  <td>
                    <a
                      href={`/${locale}/admin/link-domains?prefill=${encodeURIComponent(row.domain)}`}
                      className="la-quick-add"
                    >
                      {isAr ? '➕ أضف كدومين مسموح' : '➕ Add to allowlist'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent attempts */}
      <div className={`la-card ${loading ? 'la-loading' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h2 className="la-section-title" style={{ margin: 0 }}>
            {isAr ? '⏱ آخر المحاولات' : '⏱ Recent Attempts'}
          </h2>
        </div>
        {recent.length === 0 ? (
          <p className="la-empty">{isAr ? 'لا توجد سجلات بعد' : 'No logs yet'}</p>
        ) : (
          <table className="la-table">
            <thead>
              <tr>
                <th>{isAr ? 'الدومين' : 'Domain'}</th>
                <th>{isAr ? 'النتيجة' : 'Outcome'}</th>
                <th>{isAr ? 'التوقيت' : 'Time'}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(row => (
                <tr key={row.id}>
                  <td>
                    <span className="la-domain">{row.domain ?? <span style={{ color: '#475569' }}>—</span>}</span>
                  </td>
                  <td><OutcomeBadge outcome={row.outcome} isAr={isAr} /></td>
                  <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                    {new Date(row.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
