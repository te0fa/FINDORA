'use client'

import React from 'react'
import Link from 'next/link'
import styles from './CustomerDashboard.module.css'

export function getStatusLabel(status: string) {
  const map: Record<string, { ar: string; en: string }> = {
    new:                 { ar: 'تم الاستلام',             en: 'Received' },
    intake_review:       { ar: 'قيد المراجعة',          en: 'Under Review' },
    needs_clarification: { ar: 'يحتاج تفاصيل إضافية', en: 'Needs More Details' },
    approved:            { ar: 'تمت الموافقة',         en: 'Approved' },
    operations_review:   { ar: 'قيد المعالجة',         en: 'In Progress' },
    research_phase:      { ar: 'جاري البحث',           en: 'Researching' },
    report_ready:        { ar: 'التقرير جاهز',         en: 'Report Ready' },
    partially_revealed:  { ar: 'التقرير متاح جزئياً', en: 'Report Partially Available' },
    completed:           { ar: 'مكتمل',                en: 'Completed' },
    rejected:            { ar: 'مرفوض',                en: 'Not Accepted' },
    archived:            { ar: 'مؤرشف',                en: 'Archived' },
    cancelled:           { ar: 'ملغي',                 en: 'Cancelled' },
    open:                { ar: 'تم الاستلام',             en: 'Received' },
    submitted:           { ar: 'تم التقديم',            en: 'Submitted' },
    in_progress:         { ar: 'قيد المعالجة',         en: 'In Progress' },
    research:            { ar: 'جاري البحث',           en: 'Researching' },
    reporting:           { ar: 'إعداد التقرير',         en: 'Reporting' },
    client_ready:        { ar: 'جاهز للعرض',           en: 'Ready' },
    closed:              { ar: 'مغلق',                 en: 'Closed' },
  };
  const entry = map[status];
  if (entry) return `${entry.ar} / ${entry.en}`;
  return 'جاري المعالجة / Processing';
}

export default function CustomerDashboardClient({ locale, requests }: { locale: string, requests: any[] }) {
  const isAr = locale === 'ar'

  if (requests.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🛒</div>
        <h3 className={styles.emptyTitle}>{isAr ? 'لا توجد طلبات بعد' : 'No requests yet'}</h3>
        <p className={styles.emptyText}>{isAr ? 'ابدأ أول طلب لك ودع شبكتنا تبحث لك عن أفضل العروض.' : 'Start your first request and let our network hunt for the best deals.'}</p>
        <Link href={`/${locale}/start-request`} className={styles.emptyCta}>
          {isAr ? 'ابدأ البحث الآن' : 'Start Searching Now'}
        </Link>
      </div>
    )
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new':
      case 'open':
      case 'submitted':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          borderColor: 'rgba(245, 158, 11, 0.4)'
        }
      case 'intake_review':
      case 'operations_review':
      case 'research_phase':
      case 'research':
      case 'in_progress':
      case 'processing':
        return {
          background: 'rgba(139, 92, 246, 0.15)',
          color: '#c4b5fd',
          borderColor: 'rgba(139, 92, 246, 0.4)'
        }
      case 'report_ready':
      case 'partially_revealed':
      case 'client_ready':
      case 'completed':
      case 'approved':
        return {
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#4ade80',
          borderColor: 'rgba(34, 197, 94, 0.4)'
        }
      case 'rejected':
      case 'cancelled':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          borderColor: 'rgba(239, 68, 68, 0.4)'
        }
      case 'archived':
      default:
        return {
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.12)'
        }
    }
  }

  return (
    <div className={styles.requestsList}>
      {requests.map(req => {
        const statusStyle = getStatusStyle(req.status || 'open');
        const reqLink = `/${locale}/customer/request/${req.id}${req.request_code ? `?code=${req.request_code}` : ''}`;
        return (
          <Link
            href={reqLink}
            key={req.id}
            className={styles.requestCard}
          >
            <div className={styles.cardContent}>
              <div>
                <div className={styles.cardTopRow}>
                  <span className={styles.statusPill} style={statusStyle}>
                    {getStatusLabel(req.status || 'open')}
                  </span>
                  {req.request_code && (
                    <span className={styles.codePill}>
                      #{req.request_code}
                    </span>
                  )}
                  <span className={styles.dateText}>{new Date(req.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
                <h2 className={styles.cardProduct}>
                  {req.product_name}
                </h2>
                <div className={styles.cardMeta}>
                  <span>📍 {req.target_location}</span>
                  {req.max_price && <span>💰 Max: {Number(req.max_price).toLocaleString()} EGP</span>}
                </div>
              </div>

              <div className={styles.cardCta}>
                <span>{isAr ? 'عرض التفاصيل ←' : 'View Details →'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  )
}
