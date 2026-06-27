import { 
  getStaffMemberByAuthUserId, 
  getStaffUiPermissions 
} from '@/lib/dal/staff'
import { 
  getServiceCatalogAdmin, 
  getPricingVersionsAdmin,
  getPromoAnalyticsAdmin
} from '@/lib/dal/marketing'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { handleCreatePricingVersion } from './actions'
import PricingRowActions from './PricingRowActions'
import { resolvePricing } from '@/lib/pricing/resolver'
import BasePriceEditor from './BasePriceEditor'
import PromoServiceSelector from './PromoServiceSelector'
import ExpiredPricingList from './ExpiredPricingList'
import PromoAnalyticsDashboard from './PromoAnalyticsDashboard'

export default async function PricingManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ tab?: string; success?: string; error?: string }>
}) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const tab = resolvedSearchParams.tab || 'active'
  
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`)

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.canManagePricing && !permissions.canManageMarketing) {
    redirect(`/${locale}/staff/dashboard`)
  }

  const [catalog, versions, promoAnalytics] = await Promise.all([
    getServiceCatalogAdmin(),
    getPricingVersionsAdmin(),
    getPromoAnalyticsAdmin()
  ])

  // Resolve active pricing for all services
  const resolvedPricingMap = new Map<string, any>()
  if (catalog) {
    await Promise.all(
      catalog.map(async (s: any) => {
        const resolved = await resolvePricing(s.service_key)
        resolvedPricingMap.set(s.service_key, resolved)
      })
    )
  }

  // Build TWO separate maps:
  // 1. basePricingIdMap → ID of the BASE (non-promo) active version → for pencil edit
  // 2. promoPricingIdMap → ID of the active PROMO version → to know if promo is running
  const basePricingIdMap = new Map<string, string>()
  const basePriceValueMap = new Map<string, number>()  // the real base price from DB
  const promoPricingIdMap = new Map<string, string>()

  if (versions) {
    // versions sorted by created_at DESC (newest first)
    for (const v of versions) {
      if (v.deleted_at || !v.is_active) continue
      const isPromo = !!(v.promo_label_en || v.promo_label_ar)
      if (isPromo) {
        if (!promoPricingIdMap.has(v.service_key)) {
          promoPricingIdMap.set(v.service_key, v.id)
        }
      } else {
        if (!basePricingIdMap.has(v.service_key)) {
          basePricingIdMap.set(v.service_key, v.id)
          basePriceValueMap.set(v.service_key, Number(v.current_price))
        }
      }
    }
    // Also scan inactive versions to find base price if no active base exists
    for (const v of versions) {
      if (v.deleted_at) continue
      const isPromo = !!(v.promo_label_en || v.promo_label_ar)
      if (!isPromo && !basePricingIdMap.has(v.service_key)) {
        // Use first non-promo even if inactive — for price display reference
        basePriceValueMap.set(v.service_key, Number(v.original_price || v.current_price))
      }
    }
  }

  // Build enriched version lists
  const activePricing: any[] = []
  const scheduledPricing: any[] = []
  const expiredPricing: any[] = []
  const deletedPricing: any[] = []
  const serviceMap = new Map<string, any>((catalog || []).map((s: any) => [s.service_key, s]))

  for (const v of (versions || [])) {
    const serviceInfo = serviceMap.get(v.service_key) || { title_en: v.service_key, title_ar: v.service_key }
    const resolved = resolvedPricingMap.get(v.service_key)
    const is_promo_version = !!(v.promo_label_en || v.promo_label_ar)
    const is_promo = v.status === 'active' && resolved ? resolved.is_promo === true && is_promo_version : false

    const enriched = { 
      ...v, 
      serviceTitle: isRTL ? serviceInfo.title_ar : serviceInfo.title_en,
      is_promo,
      is_promo_version
    }

    if (v.deleted_at || v.status === 'deleted') {
      deletedPricing.push(enriched)
    } else if (v.status === 'inactive' || v.status === 'expired' || !v.is_active) {
      expiredPricing.push(enriched)
    } else if (v.status === 'scheduled') {
      scheduledPricing.push(enriched)
    } else {
      activePricing.push(enriched)
    }
  }

  let currentList = activePricing
  if (tab === 'scheduled') currentList = scheduledPricing
  else if (tab === 'expired') currentList = expiredPricing
  else if (tab === 'deleted') currentList = deletedPricing

  // For the promo form service options
  const serviceOptionsForForm = (catalog || []).map((s: any) => {
    const resolved = resolvedPricingMap.get(s.service_key)
    const baseId = basePricingIdMap.get(s.service_key) || null
    const basePrice = basePriceValueMap.get(s.service_key) || (resolved ? resolved.price : null)
    return {
      id: s.id,
      service_key: s.service_key,
      title_en: s.title_en,
      title_ar: s.title_ar,
      currentBasePrice: basePrice,
      activePricingId: baseId
    }
  })

  const getServiceIcon = (key: string) => {
    switch (key) {
      case 'everyday_purchase': return { icon: '🛒', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' }
      case 'high_value_asset':
      case 'high_value_deals': return { icon: '💎', color: '#d4a63c', bg: 'rgba(212,166,60,0.1)', border: 'rgba(212,166,60,0.2)' }
      case 'project_supply':
      case 'projects_supplies': return { icon: '💼', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)' }
      default: return { icon: '⚙️', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' }
    }
  }

  const successMsg = resolvedSearchParams.success === 'true'
  const errorMsg = resolvedSearchParams.error

  return (
    <main 
      dir={isRTL ? 'rtl' : 'ltr'} 
      style={{ 
        minHeight: '100vh', 
        background: '#060810',
        color: '#f1f5f9',
        fontFamily: "'Inter', 'Outfit', sans-serif"
      }}
      data-testid="staff-marketing-pricing-page"
    >
      {/* ── Top Gradient Bar ── */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #d4a63c, #f59e0b, #d4a63c)', boxShadow: '0 0 20px rgba(212,166,60,0.5)' }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Page Header ── */}
        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,166,60,0.15)', border: '1px solid rgba(212,166,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  💰
                </div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 0%, #d4a63c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {isRTL ? 'خصومات الباقات (Offers)' : 'Service Offers (Pricing)'}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                {isRTL ? 'تكوين العروض، الخصومات الترويجية لخدمات وباقات فايندورا.' : 'Configure promotions and discounts for Findora services.'}
              </p>
            </div>
            <Link 
              href={`/${locale}/staff/dashboard`} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s' }}
            >
              ← {isRTL ? 'لوحة القيادة' : 'Dashboard'}
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <Link 
              href={`/${locale}/staff/marketing/deals`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              {isRTL ? 'المنتجات (Deals)' : 'Products (Deals)'}
            </Link>
            <Link 
              href={`/${locale}/staff/marketing/pricing`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: '#d4a63c', color: '#000', textDecoration: 'none', boxShadow: '0 0 15px rgba(212,166,60,0.3)', transition: 'all 0.2s' }}
            >
              {isRTL ? 'خصومات الباقات (Offers)' : 'Service Offers (Pricing)'}
            </Link>
          </div>
        </header>

        {/* ── Success / Error Toast ── */}
        {successMsg && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✅ {isRTL ? 'تم حفظ إعدادات التسعير بنجاح.' : 'Pricing configuration saved successfully.'}
          </div>
        )}
        {errorMsg && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ {errorMsg.replace(/_/g, ' ')}
          </div>
        )}

        {/* ── Stats Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: isRTL ? 'نشط' : 'Active Configs', value: activePricing.length, color: '#34d399', icon: '🟢' },
            { label: isRTL ? 'مجدول' : 'Scheduled', value: scheduledPricing.length, color: '#60a5fa', icon: '📅' },
            { label: isRTL ? 'منتهي' : 'Expired', value: expiredPricing.length, color: '#f59e0b', icon: '⏰' },
            { label: isRTL ? 'خدمات' : 'Services', value: catalog?.length || 0, color: '#d4a63c', icon: '🎯' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.icon} {stat.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

          {/* ═══ LEFT COLUMN: Active versions table ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Tab bar */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.35rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'active', label: isRTL ? 'الإصدارات النشطة' : 'Active Versions', count: activePricing.length },
                { id: 'scheduled', label: isRTL ? 'مجدولة' : 'Scheduled', count: scheduledPricing.length },
                { id: 'expired', label: isRTL ? 'منتهية / غير نشطة' : 'Expired / Inactive', count: expiredPricing.length },
                { id: 'deleted', label: isRTL ? 'محذوفة' : 'Deleted', count: deletedPricing.length },
              ].map(t => (
                <Link
                  key={t.id}
                  href={`/${locale}/staff/marketing/pricing?tab=${t.id}`}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    ...(tab === t.id
                      ? { background: '#d4a63c', color: '#0a0a0a', boxShadow: '0 2px 12px rgba(212,166,60,0.3)' }
                      : { color: 'rgba(255,255,255,0.4)', background: 'transparent' })
                  }}
                >
                  {t.label}
                  <span style={{ 
                    marginInlineStart: '0.4rem', 
                    fontSize: '0.65rem', 
                    padding: '0.1rem 0.4rem', 
                    borderRadius: '999px',
                    background: tab === t.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    color: tab === t.id ? '#0a0a0a' : 'rgba(255,255,255,0.5)'
                  }}>
                    {t.count}
                  </span>
                </Link>
              ))}
            </div>

            {/* Version Cards */}
            {tab === 'expired' ? (
              <ExpiredPricingList expiredPricing={expiredPricing} locale={locale} isRTL={isRTL} />
            ) : currentList.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                {tab === 'scheduled' ? (isRTL ? '📅 لا توجد عروض مجدولة' : '📅 No scheduled promotions') :
                 tab === 'deleted' ? (isRTL ? '🗑️ لا يوجد أرشيف محذوف' : '🗑️ No deleted records') :
                 (isRTL ? '✨ لا يوجد تسعير نشط' : '✨ No active pricing')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {currentList.map((v: any) => {
                  const ui = getServiceIcon(v.service_key)
                  const showPromo = v.is_promo && v.status === 'active'
                  const isBaseVersion = !v.is_promo_version

                  return (
                    <div
                      key={v.id}
                      data-testid="pricing-service-row"
                      id={`pricing-version-${v.id}`}
                      style={{
                        background: showPromo
                          ? 'linear-gradient(135deg, rgba(212,166,60,0.06) 0%, rgba(245,158,11,0.03) 100%)'
                          : isBaseVersion
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(255,255,255,0.015)',
                        border: showPromo
                          ? '1px solid rgba(212,166,60,0.25)'
                          : isBaseVersion
                          ? '1px solid rgba(255,255,255,0.08)'
                          : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '18px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Card shimmer effect */}
                      {showPromo && (
                        <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #d4a63c, transparent)' }} />
                      )}

                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: ui.bg, border: `1px solid ${ui.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                            {ui.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'white', marginBottom: '0.15rem' }}>{v.serviceTitle}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{v.service_key} · v{v.version_no}</div>
                          </div>
                        </div>
                        {/* Type badge */}
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px', letterSpacing: '0.05em',
                          ...(showPromo
                            ? { background: 'rgba(212,166,60,0.15)', color: '#d4a63c', border: '1px solid rgba(212,166,60,0.25)' }
                            : isBaseVersion
                            ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' })
                        }}>
                          {showPromo ? '🎁 PROMO' : isBaseVersion ? '📌 BASE' : '📄'}
                        </span>
                      </div>

                      {/* Price row */}
                      <div>
                        {showPromo ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d4a63c', lineHeight: 1 }}>
                              {v.current_price}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>EGP</span>
                            {v.original_price && Number(v.original_price) !== Number(v.current_price) && (
                              <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.25)' }}>
                                {v.original_price} EGP
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                              {v.current_price}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>EGP</span>
                          </div>
                        )}
                        {showPromo && (v.promo_label_en || v.promo_label_ar) && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24' }}>
                            🏷️ {isRTL ? v.promo_label_ar : v.promo_label_en}
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>📅 {isRTL ? 'البدء' : 'Start'}</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                            {v.starts_at ? new Date(v.starts_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : (isRTL ? 'فوري' : 'Immediately')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>⏰ {isRTL ? 'الانتهاء' : 'Expires'}</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                            {v.ends_at || v.expires_at
                              ? new Date(v.ends_at || v.expires_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')
                              : (isRTL ? 'مستمر' : 'Never')}
                          </span>
                        </div>
                      </div>

                      <PricingRowActions 
                        id={v.id} 
                        isActive={v.is_active} 
                        isDeleted={tab === 'deleted'}
                        locale={locale} 
                        isRTL={isRTL} 
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN: Controls ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '1.5rem' }}>

            {/* ── Base Prices Card ── */}
            <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '1.5rem', backdropFilter: 'blur(12px)' }}>
              <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '1.1rem' }}>🏷️</span>
                {isRTL ? 'الأسعار الأساسية للخدمات' : 'Service Base Prices'}
                <span style={{ marginInlineStart: 'auto', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isRTL ? 'السعر الفعلي' : 'Real Price'}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {catalog.map((s: any) => {
                  const ui = getServiceIcon(s.service_key)
                  // Show the actual BASE price (not promo price)
                  const baseId = basePricingIdMap.get(s.service_key)
                  const basePrice = basePriceValueMap.get(s.service_key)
                  const resolved = resolvedPricingMap.get(s.service_key)
                  const displayPrice = basePrice ?? (resolved ? resolved.price : '—')
                  const hasActivePromo = promoPricingIdMap.has(s.service_key)

                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.75rem 0.875rem',
                        background: hasActivePromo ? 'rgba(212,166,60,0.04)' : 'rgba(255,255,255,0.02)',
                        border: hasActivePromo ? '1px solid rgba(212,166,60,0.12)' : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: ui.bg, border: `1px solid ${ui.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                          {ui.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isRTL ? s.title_ar : s.title_en}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                            {s.service_key}
                            {hasActivePromo && <span style={{ marginInlineStart: '0.3rem', color: '#d4a63c' }}>· 🎁 عرض</span>}
                          </div>
                        </div>
                      </div>
                      {/* BasePriceEditor always gets the BASE version ID (never promo) */}
                      <BasePriceEditor
                        serviceKey={s.service_key}
                        pricingId={baseId}
                        currentPrice={displayPrice}
                        locale={locale}
                        isRTL={isRTL}
                      />
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: '#34d399' }}>✏️</span>
                  {isRTL ? 'انقر على أيقونة القلم لتعديل السعر الأساسي فقط' : 'Click pencil to edit BASE price only'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: '#d4a63c' }}>🎁</span>
                  {isRTL ? 'السعر الأساسي لا يتأثر بالعروض الترويجية' : 'Base price is not affected by promos'}
                </div>
              </div>
            </section>

            {/* ── New Promo Form ── */}
            <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '1.5rem', backdropFilter: 'blur(12px)' }}>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span>
                {isRTL ? 'إضافة عرض ترويجي جديد' : 'Add New Promo Offer'}
              </h2>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {isRTL 
                  ? 'لتغيير السعر الأساسي فقط استخدم أيقونة القلم ✏️ أعلاه. هذه النموذج للعروض الترويجية المؤقتة.'
                  : 'Use ✏️ above for base price only. Use this form for promo offers.'}
              </p>
              
              <form action={handleCreatePricingVersion} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }} data-testid="pricing-create-version-form">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="is_active" value="true" />
                
                <PromoServiceSelector services={serviceOptionsForForm} isRTL={isRTL} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'السعر الأصلي' : 'Original Price'}
                    </label>
                    <input 
                      type="number" 
                      name="original_price" 
                      step="0.01"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                      data-testid="pricing-original-price-input"
                      placeholder="299"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'سعر العرض 🔥' : 'Promo Price 🔥'}
                    </label>
                    <input 
                      type="number" 
                      name="current_price" 
                      step="0.01"
                      style={{ width: '100%', background: 'rgba(212,166,60,0.05)', border: '1px solid rgba(212,166,60,0.2)', color: '#d4a63c', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                      data-testid="pricing-promo-price-input"
                      placeholder="99"
                      required 
                    />
                  </div>
                </div>

                <input type="hidden" name="currency_code" value="EGP" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📅 {isRTL ? 'تاريخ البدء' : 'Start Date'}
                    </label>
                    <input 
                      type="datetime-local" 
                      name="starts_at"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⏰ {isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}
                    </label>
                    <input 
                      type="datetime-local" 
                      name="expires_at"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'اسم العرض (EN)' : 'Promo Label (EN)'}
                    </label>
                    <input 
                      type="text" 
                      name="promo_label_en"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Limited time offer"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'اسم العرض (AR)' : 'Promo Label (AR)'}
                    </label>
                    <input 
                      type="text" 
                      name="promo_label_ar"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }}
                      placeholder="عرض لفترة محدودة"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #d4a63c, #f59e0b)', color: '#0a0a0a', border: 'none', borderRadius: '12px', padding: '0.875rem', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', marginTop: '0.25rem', boxShadow: '0 4px 20px rgba(212,166,60,0.3)', letterSpacing: '0.03em' }}
                  data-testid="pricing-save-button"
                >
                  {isRTL ? '✨ حفظ العرض الترويجي' : '✨ Save Promo Offer'}
                </button>
              </form>
            </section>
          </div>
        </div>

        {/* ── Analytics section ── */}
        <div style={{ marginTop: '2rem' }}>
          <PromoAnalyticsDashboard promos={promoAnalytics} isRTL={isRTL} />
        </div>
      </div>
    </main>
  )
}
