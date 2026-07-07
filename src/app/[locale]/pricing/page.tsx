import React from 'react'
import Link from 'next/link'
import { resolvePricing } from '@/lib/pricing/resolver'
import HeaderLogo from "@/components/HeaderLogo"
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown"
import './pricing.css'

export const metadata = {
  title: 'Pricing Plans — FINDORA',
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  // 1. Resolve pricing details dynamically from backend database
  const [everydayInfo, highValueInfo, projectInfo] = await Promise.all([
    resolvePricing("everyday_purchase"),
    resolvePricing("high_value_deals"),
    resolvePricing("projects_supplies"),
  ])

  // Helper to format individual plan details
  const getPlanPrice = (data: any, defaultPrice: number) => {
    if (!data) {
      return {
        amount: defaultPrice,
        label: isRTL ? `${defaultPrice} جنيه` : `${defaultPrice} EGP`,
        original: null,
        isPromo: false,
        promoLabel: null
      }
    }
    const amount = Number(data.price)
    const original = data.original_price ? Number(data.original_price) : null
    const isPromo = data.is_promo
    const promoLabel = isRTL ? data.promo_label_ar : data.promo_label_en

    let label = isRTL ? `${amount.toLocaleString('ar-EG')} جنيه` : `${amount.toLocaleString('en-US')} EGP`
    if (amount === 0) {
      label = isRTL ? "مجاناً" : "FREE"
    }

    return { amount, label, original, isPromo, promoLabel }
  }

  const everydayPrice = getPlanPrice(everydayInfo, 299)
  const highValuePrice = getPlanPrice(highValueInfo, 1500)
  const projectPrice = getPlanPrice(projectInfo, 2500)

  const plans = [
    {
      title: isRTL ? "المشتريات العادية" : "Everyday Purchases",
      desc: isRTL
        ? "الهواتف، الأجهزة المنزلية، الإلكترونيات، التكييفات والقطع الاستهلاكية"
        : "Phones, home appliances, electronics, air conditioners, and daily goods",
      icon: "🛒",
      color: "#34d399",
      bgGradient: "linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(0,0,0,0) 100%)",
      borderColor: "rgba(52,211,153,0.15)",
      price: everydayPrice.label,
      originalPrice: everydayPrice.original,
      isPromo: everydayPrice.isPromo,
      promoLabel: everydayPrice.promoLabel || (isRTL ? "عرض فترة الإطلاق" : "Launch Offer"),
      subtext: isRTL ? "رسوم ثابتة / للطلب" : "Flat fee / request",
      futurePrice: isRTL 
        ? `سيكون سعر الخدمة الأساسي ${everydayPrice.original || 299} جنيه بعد انتهاء فترة الإطلاق.` 
        : `Pricing will return to the base rate of ${everydayPrice.original || 299} EGP after the launch period ends.`,
      showFuturePriceOnlyIfPromo: true,
      features: isRTL
        ? [
            "البحث والمقارنة أونلاين وأوفلاين",
            "التحقق والاتصال بالموردين مباشرة",
            "التحقق من ضمان الوكيل المعتمد",
            "تقرير الصفقة الذكية™ المتكامل",
          ]
        : [
            "Online + Offline sourcing survey",
            "Direct supplier verification calls",
            "Agent warranty verification",
            "Smart Deal Score™ report",
          ],
      ctaText: isRTL ? "ابدأ طلبك الآن" : "Start Your Request",
      ctaLink: `/${locale}/start-request?type=everyday_purchase`
    },
    {
      title: isRTL ? "الأصول الكبيرة" : "High-Value Assets",
      desc: isRTL
        ? "السيارات، العقارات، الأجهزة المرتفعة السعر ومعدات المصانع"
        : "Cars, real estate, high-value equipment, and machinery",
      icon: "💎",
      color: "#f59e0b",
      bgGradient: "linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(0,0,0,0) 100%)",
      borderColor: "rgba(245,158,11,0.25)",
      highlight: true,
      price: highValuePrice.label,
      originalPrice: highValuePrice.original,
      isPromo: highValuePrice.isPromo,
      promoLabel: highValuePrice.promoLabel,
      subtext: isRTL ? "رسوم دراسة الطلب + نسبة تفاوض" : "Sourcing study fee + % negotiation",
      futurePrice: isRTL 
        ? "بعد الإطلاق: نسبة من قيمة الصفقة حسب الاتفاق." 
        : "After launch: Commission-based percentage by agreement.",
      features: isRTL
        ? [
            "دراسة شاملة لبدائل وعروض السوق",
            "مراجعة الحالة القانونية والتراخيص والضمان",
            "مساعد التفاوض بالذكاء الاصطناعي لتأمين خصومات",
            "أخصائي توريد مخصص لطلبك خطوة بخطوة",
          ]
        : [
            "Full market alternatives survey",
            "Legal status, licensing & warranty review",
            "AI-powered negotiation assistant",
            "Dedicated sourcing specialist step-by-step",
          ],
      ctaText: isRTL ? "ابدأ دراسة الأصول" : "Start Asset Sourcing",
      ctaLink: `/${locale}/start-request?type=high_value_deals`
    },
    {
      title: isRTL ? "المشاريع والتوريد" : "Projects & Supply",
      desc: isRTL
        ? "خدمات التوريدات العامة، التشطيبات، الإنشاءات، الإشراف على التنفيذ، الشحن والخدمات اللوجستية، تأثيث وتجهيز المطاعم والفنادق والمنشأت أو أي طلب مخصص."
        : "General supply services, fit-outs, construction, execution supervision, shipping & logistics, furnishing and equipping restaurants, hotels, establishments, or any custom request.",
      icon: "🏢",
      color: "#a78bfa",
      bgGradient: "linear-gradient(135deg, rgba(167,139,250,0.05) 0%, rgba(0,0,0,0) 100%)",
      borderColor: "rgba(167,139,250,0.15)",
      price: projectPrice.label,
      originalPrice: projectPrice.original,
      isPromo: projectPrice.isPromo,
      promoLabel: projectPrice.promoLabel,
      subtext: isRTL ? "دراسة طلبات RFQ والتوريد للمشاريع" : "RFQ compilation & execution commission",
      futurePrice: isRTL 
        ? "＋ نسبة عند التنفيذ حسب نطاق المشروع والاتفاق." 
        : "+ Execution commission based on project scope & agreement.",
      features: isRTL
        ? [
            "تجميع ومقارنة عروض الأسعار (RFQ)",
            "خدمات الإشراف على التنفيذ والتشطيبات والإنشاءات",
            "إدارة الشحن الدولي والمحلي والخدمات اللوجستية",
            "عقود توريد متكاملة وضوابط أمان للدفعات الماليّة",
            "تنفيذ أي طلبات مخصصة عبر شبكة الموردين",
          ]
        : [
            "RFQ compilation & vendor matching",
            "Execution oversight, fit-outs & construction",
            "Logistics, shipping & custom delivery routing",
            "Supply contracts & secure payment milestones",
            "Execution of any custom or bespoke sourcing requests",
          ],
      ctaText: isRTL ? "أرسل تفاصيل طلبك" : "Submit Sourcing Details",
      ctaLink: `/${locale}/start-request?type=projects_supplies`
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Public Header ── */}
      <header style={{
        background: 'rgba(9, 13, 22, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }}>
          <HeaderLogo locale={locale} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <HeaderLocaleDropdown currentLocale={locale as any} />
            
            <Link 
              href={`/${locale}/login`}
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'white',
                textDecoration: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s'
              }}
            >
              {isRTL ? 'تسجيل الدخول' : 'Login'}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 1.5rem', direction: isRTL ? 'rtl' : 'ltr', flex: 1 }}>
        
        {/* ── Title Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: 'rgba(212,166,60,0.15)',
            border: '1px solid rgba(212,166,60,0.3)',
            color: '#d4a63c',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            display: 'inline-block',
            marginBottom: '1rem'
          }}>
            {isRTL ? 'تسعير شفاف وعادل' : 'Transparent Sourcing Rates'}
          </span>
          <h1 style={{
            margin: 0,
            fontSize: '2.5rem',
            fontWeight: 900,
            color: 'white',
            background: 'linear-gradient(135deg, #ffffff 30%, #d4a63c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            marginBottom: '1rem'
          }}>
            {isRTL ? 'خطط أسعار الخدمات الذكية' : 'Smart Sourcing Pricing'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.4)',
            maxWidth: '600px',
            lineHeight: 1.6,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {isRTL 
              ? 'تغطية شاملة لعروض الأسعار مع أخصائي توريد مخصص. ابحث عن أفضل العروض ووفر مجهودك.' 
              : 'Full market coverage with a dedicated sourcing specialist. Find the best deals and secure discounts.'}
          </p>
        </div>

        {/* ── Cards Grid ── */}
        <div className="pricing-grid">
          {plans.map((plan, idx) => {
            const hasPromo = plan.isPromo
            const showFutureBox = plan.showFuturePriceOnlyIfPromo ? !!plan.originalPrice : true

            return (
              <div
                key={idx}
                style={{
                  background: plan.bgGradient,
                  backgroundColor: 'rgba(255,255,255,0.015)',
                  border: plan.highlight ? '1px solid #d4a63c' : `1px solid ${plan.borderColor}`,
                  borderRadius: '24px',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.75rem',
                  boxShadow: plan.highlight ? '0 10px 30px rgba(212,166,60,0.05)' : 'none',
                  position: 'relative',
                  backdropFilter: 'blur(16px)'
                }}
              >
                {/* Active Highlight Badge */}
                {plan.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: isRTL ? 'auto' : '1.25rem',
                    left: isRTL ? '1.25rem' : 'auto',
                    background: '#d4a63c',
                    color: '#090d16',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {isRTL ? 'موصى به' : 'Recommended'}
                  </div>
                )}

                {/* Plan Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{plan.icon}</span>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                      {plan.title}
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    {plan.desc}
                  </p>
                </div>

                {/* Pricing Area */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {hasPromo && plan.originalPrice && (
                      <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontWeight: 600 }}>
                        {plan.originalPrice} EGP
                      </span>
                    )}
                    <span style={{ fontSize: '2.5rem', fontWeight: 950, color: hasPromo ? '#d4a63c' : 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {plan.price}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                      {plan.subtext}
                    </span>
                    {hasPromo && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(212,166,60,0.1)',
                        border: '1px solid rgba(212,166,60,0.2)',
                        color: '#d4a63c'
                      }}>
                        {plan.promoLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Included Features */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
                    {isRTL ? 'مزايا الخدمة الأساسية' : 'Key Sourcing Features'}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'start', gap: '0.6rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                        <span style={{ color: plan.color, fontWeight: 900 }}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Future Price Alert */}
                {showFutureBox && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.5
                  }}>
                    <strong style={{ display: 'block', color: 'white', marginBottom: '0.15rem', fontSize: '0.75rem' }}>
                      {isRTL ? 'بعد فترة الإطلاق' : 'After Launch'}
                    </strong>
                    {plan.futurePrice}
                  </div>
                )}

                {/* CTA Button */}
                <Link
                  href={plan.ctaLink}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    background: plan.highlight ? 'linear-gradient(135deg, #d4a63c, #f59e0b)' : 'rgba(255,255,255,0.04)',
                    color: plan.highlight ? '#090d16' : 'white',
                    border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: plan.highlight ? '0 4px 15px rgba(212,166,60,0.2)' : 'none'
                  }}
                >
                  {plan.ctaText}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer info link */}
        <div style={{ textAlign: 'center', marginTop: '4rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem' }}>
          <Link
            href={`/${locale}`}
            style={{ fontSize: '0.85rem', color: '#d4a63c', textDecoration: 'none', fontWeight: 600 }}
          >
            {isRTL ? '← العودة إلى الصفحة الرئيسية لفايندورا' : '← Back to Findora Home'}
          </Link>
        </div>

      </div>
    </div>
  )
}
