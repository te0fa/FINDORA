'use client';
import React, { useState } from 'react';
import Link from 'next/link';

interface MerchantDashboardClientProps {
  locale: string;
  merchant: {
    id: string;
    business_name_ar: string;
    business_name_en: string;
    status: string;
    trust_score: number;
    total_deals: number;
    total_earnings_egp: number;
    rating_average: number | null;
    rating_count: number;
  };
  stats: {
    openRequests: number;
    pendingOffers: number;
    acceptedOffers: number;
    totalEarnings: number;
  };
  recentOffers: Array<{
    id: string;
    request_id: string;
    price_offered_egp: number;
    status: string;
    created_at: string;
    request?: { product_name_ar?: string; product_name_en?: string };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
  expired: '#6b7280',
  cancelled: '#6b7280',
};

export default function MerchantDashboardClient({ locale, merchant, stats, recentOffers }: MerchantDashboardClientProps) {
  const isAr = locale === 'ar';
  const name = isAr ? merchant.business_name_ar : merchant.business_name_en;

  const statusLabel = (s: string) => ({
    pending: isAr ? 'في الانتظار' : 'Pending',
    accepted: isAr ? 'مقبول ✅' : 'Accepted ✅',
    rejected: isAr ? 'مرفوض' : 'Rejected',
    expired: isAr ? 'منتهي' : 'Expired',
    cancelled: isAr ? 'ملغي' : 'Cancelled',
  }[s] || s);

  const STAT_CARDS = [
    { label_ar: 'طلبات مفتوحة', label_en: 'Open Requests', value: stats.openRequests, icon: '📬', color: '#6366f1' },
    { label_ar: 'عروض معلقة', label_en: 'Pending Offers', value: stats.pendingOffers, icon: '⏳', color: '#f59e0b' },
    { label_ar: 'صفقات مكتملة', label_en: 'Completed Deals', value: merchant.total_deals, icon: '🤝', color: '#10b981' },
    { label_ar: 'إجمالي الأرباح', label_en: 'Total Earnings', value: `${Math.round(merchant.total_earnings_egp).toLocaleString()} EGP`, icon: '💰', color: '#8b5cf6' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,25%,8%)', color: 'white', fontFamily: "'Outfit','Cairo',sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>FINDORA MERCHANT</div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>🏪 {name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: merchant.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${merchant.status === 'active' ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`, color: merchant.status === 'active' ? '#10b981' : '#f59e0b', fontSize: '0.78rem', fontWeight: 700 }}>
            {merchant.status === 'active' ? (isAr ? '✅ نشط' : '✅ Active') : (isAr ? '⏳ قيد المراجعة' : '⏳ Under Review')}
          </div>
          <Link href={`/${locale}/merchant/offers`} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>
            {isAr ? '+ عرض جديد' : '+ New Offer'}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Pending review notice */}
        {merchant.status === 'pending' && (
          <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>{isAr ? 'طلبك قيد المراجعة' : 'Your account is under review'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{isAr ? 'سيتم تفعيل حسابك خلال 24-48 ساعة. يمكنك البدء في استعراض الطلبات المتاحة.' : 'Your account will be activated within 24-48 hours. You can browse available requests in the meantime.'}</div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 32 }}>
          {STAT_CARDS.map(card => (
            <div key={card.label_en} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px', borderLeft: `4px solid ${card.color}` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{isAr ? card.label_ar : card.label_en}</div>
            </div>
          ))}
        </div>

        {/* Trust Score + Rating */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{isAr ? '🛡️ نقاط الثقة' : '🛡️ Trust Score'}</span>
              <span style={{ fontWeight: 900, fontSize: '1.4rem', color: merchant.trust_score >= 70 ? '#10b981' : merchant.trust_score >= 40 ? '#f59e0b' : '#ef4444' }}>{merchant.trust_score}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${merchant.trust_score}%`, background: `linear-gradient(90deg, ${merchant.trust_score >= 70 ? '#10b981' : merchant.trust_score >= 40 ? '#f59e0b' : '#ef4444'}, transparent)`, borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{isAr ? '⭐ تقييم العملاء' : '⭐ Customer Rating'}</span>
              <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#f59e0b' }}>{merchant.rating_average ? merchant.rating_average.toFixed(1) : '—'}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{isAr ? `${merchant.rating_count} تقييم` : `${merchant.rating_count} reviews`}</div>
          </div>
        </div>

        {/* Recent Offers */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{isAr ? '📋 آخر عروضي' : '📋 Recent Offers'}</h2>
            <Link href={`/${locale}/merchant/offers`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>{isAr ? 'عرض الكل →' : 'View All →'}</Link>
          </div>
          {recentOffers.length === 0 ? (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div>{isAr ? 'لم تقدم أي عروض بعد' : 'No offers submitted yet'}</div>
              <Link href={`/${locale}/merchant/offers`} style={{ display: 'inline-block', marginTop: 14, padding: '10px 20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#818cf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                {isAr ? '→ استعرض الطلبات المتاحة' : '→ Browse Available Requests'}
              </Link>
            </div>
          ) : (
            <div>
              {recentOffers.map((offer, i) => (
                <div key={offer.id} style={{ padding: '16px 22px', borderBottom: i < recentOffers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                      {offer.request ? (isAr ? offer.request.product_name_ar : offer.request.product_name_en) || 'Request' : `Request #${offer.request_id.slice(0,8)}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(offer.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#10b981' }}>{Math.round(offer.price_offered_egp).toLocaleString()} EGP</span>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: `${STATUS_COLORS[offer.status]}20`, border: `1px solid ${STATUS_COLORS[offer.status]}40`, color: STATUS_COLORS[offer.status], fontSize: '0.75rem', fontWeight: 700 }}>
                      {statusLabel(offer.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
