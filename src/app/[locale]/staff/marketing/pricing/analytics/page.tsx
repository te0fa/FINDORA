import Link from 'next/link'
import { getPromoAnalyticsAdmin } from '@/lib/dal/marketing'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export default async function PromoAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  // 1. Authorization checks
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/staff/marketing/pricing/analytics`)
  }

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) {
    redirect(`/${locale}/unauthorized`)
  }

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManagePricing && !permissions.canManageMarketing) {
    redirect(`/${locale}/unauthorized`)
  }

  // 2. Fetch data
  const promoAnalytics = await getPromoAnalyticsAdmin()

  return (
    <main style={{ minHeight: '100vh', background: '#090d16', color: '#f1f5f9', direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* ── Page Header ── */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,166,60,0.15)', border: '1px solid rgba(212,166,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  📊
                </div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 0%, #d4a63c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {isRTL ? 'سجل وتحليلات العروض الترويجية' : 'Promotional Log & Analytics'}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                {isRTL 
                  ? 'متابعة أداء العروض والخصومات النشطة والمنتهية وتقييم ربحيتها ومعدلات الطلبات.' 
                  : 'Track the performance, profitability, and order conversion rates of active and expired offers.'}
              </p>
            </div>
            
            <Link 
              href={`/${locale}/staff/marketing/pricing`} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                padding: '0.5rem 1.25rem', 
                background: 'rgba(255,255,255,0.04)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '10px', 
                fontSize: '0.8rem', 
                color: 'rgba(255,255,255,0.7)', 
                textDecoration: 'none', 
                fontWeight: 700, 
                transition: 'all 0.2s' 
              }}
            >
              {isRTL ? '← العودة لإدارة العروض' : '← Back to Offers'}
            </Link>
          </div>

          {/* Sub Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
            <Link 
              href={`/${locale}/staff/marketing/deals`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              📦 {isRTL ? 'المنتجات (Deals)' : 'Products (Deals)'}
            </Link>
            <Link 
              href={`/${locale}/staff/marketing/pricing`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              🏷️ {isRTL ? 'خصومات الباقات (Offers)' : 'Service Offers (Pricing)'}
            </Link>
            <Link 
              href={`/${locale}/staff/marketing/pricing/analytics`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: '#d4a63c', color: '#000', textDecoration: 'none', boxShadow: '0 0 15px rgba(212,166,60,0.3)', transition: 'all 0.2s' }}
            >
              📊 {isRTL ? 'سجل وتحليلات العروض' : 'Promo Log & Analytics'}
            </Link>
          </div>
        </header>

        {/* ── Client Analytics Component ── */}
        <AnalyticsClient 
          promos={promoAnalytics} 
          locale={locale} 
          isRTL={isRTL} 
        />
        
      </div>
    </main>
  )
}
