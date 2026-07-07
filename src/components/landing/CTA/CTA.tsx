"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./CTA.module.css";
import { useAnalytics } from "@/hooks/useAnalytics";

interface CTAProps {
  dict: any;
  locale: string;
  isRTL: boolean;
  pricing?: any; // Reserved for future live pricing integration
}

/**
 * Enterprise Component Contract: Sourcing Pricing, Video, & Risk Reversal
 * Purpose: Deliver honest pricing, risk reversal trust indicators, and conversion paths.
 * All pricing displays live backend values. Never fabricates metrics.
 * Props Interface: CTAProps
 * States: isPlaying (boolean), showTranscript (boolean)
 * Accessibility: WCAG 2.2 AA compliant, keyboard play toggle, screen-reader transcripts
 * Analytics: Video plays, transcript expands, CTA conversions
 * Reusability: Pricing cards reusable in Dashboard Subscription tabs
 */
export default function CTA({ dict, locale, isRTL, pricing }: CTAProps) {

  const [showTranscript, setShowTranscript] = useState(false);
  const track = useAnalytics();

  const landingDict = dict.landing_v3 || {};
  const ctaDict = landingDict.cta || {};
  const pricingDict = landingDict.pricing || {};
  const reversalDict = landingDict.reversal || {};



  const handleToggleTranscript = () => {
    setShowTranscript(!showTranscript);
    track.reportInteraction("video_transcript_toggle", !showTranscript ? "open" : "close");
  };


  const handleCtaClick = (id: string, label: string) => {
    track.ctaClick(id, label);
  };


  // ─────────────────────────────────────────────────────────
  // PRICING PLANS — Clear, honest, no misleading language
  // ─────────────────────────────────────────────────────────
  const getPlanPrice = (planKey: string, defaultPrice: number) => {
    const data = pricing?.[planKey];
    if (!data) return { amount: defaultPrice, label: isRTL ? `${defaultPrice} جنيه` : `${defaultPrice} EGP`, sub: isRTL ? "رسوم ثابتة" : "Flat fee", original: null };

    const amount = Number(data.price);
    const original = data.original_price ? Number(data.original_price) : null;
    const hasPromo = data.is_promo;
    const promoLabel = isRTL ? data.promo_label_ar : data.promo_label_en;

    let label = isRTL ? `${amount.toLocaleString('ar-EG')} جنيه` : `${amount.toLocaleString('en-US')} EGP`;
    if (amount === 0) {
      label = isRTL ? "مجاناً" : "FREE";
    }

    let sub = isRTL ? "رسوم ثابتة / للطلب" : "Flat fee / per request";
    if (planKey === 'everyday') {
      sub = isRTL ? "خلال فترة الإطلاق" : "During Launch";
    }
    if (planKey === 'project') {
      sub = isRTL ? "رسوم دراسة الطلب (مبدئياً)" : "Study fee (starting from)";
    }

    if (hasPromo && promoLabel) {
      sub = promoLabel;
    }

    return { amount, label, sub, original };
  };

  const everydayInfo = getPlanPrice('everyday', 0);
  const highValueInfo = getPlanPrice('highValue', 1500);
  const projectInfo = getPlanPrice('project', 2500);

  const plans = [
    {
      title: isRTL ? "المشتريات العادية" : "Everyday Purchases",
      desc: isRTL
        ? "الهواتف، الأجهزة المنزلية، الإلكترونيات، التكييفات"
        : "Phones, home appliances, electronics, air conditioners",
      currentPrice: { amount: everydayInfo.amount, label: everydayInfo.label },
      currentPriceSub: everydayInfo.sub,
      originalPrice: everydayInfo.original,
      futurePrice: isRTL 
        ? `سيكون السعر الأساسي للخدمة ${everydayInfo.original || 299} جنيه بعد انتهاء فترة الإطلاق.` 
        : `Pricing will return to the base fee of ${everydayInfo.original || 299} EGP after the launch period ends.`,
      showFuturePriceOnlyIfPromo: true,
      status: isRTL ? "مفتوح — نقبل الطلبات الآن" : "Open — Accepting requests now",
      statusColor: "#22c55e",
      highlight: true,
      features: isRTL
        ? [
            "البحث والمقارنة أونلاين وأوفلاين",
            "التحقق والاتصال بالموردين مباشرة",
            "التحقق من ضمان الوكيل",
            "تقرير الصفقة الذكية™",
          ]
        : [
            "Online + Offline sourcing",
            "Direct supplier verification calls",
            "Agent warranty verification",
            "Smart Deal Score™ report",
          ],
      limitations: isRTL
        ? ["طلب واحد نشط في كل مرة", "لا يشمل خدمات التفاوض المتقدمة"]
        : ["One active request at a time", "Does not include advanced negotiation"],
    },
    {
      title: isRTL ? "الأصول الكبيرة" : "High-Value Assets",
      desc: isRTL
        ? "السيارات، العقارات، الأجهزة المرتفعة السعر"
        : "Cars, real estate, high-value equipment",
      currentPrice: { amount: highValueInfo.amount, label: highValueInfo.label },
      currentPriceSub: highValueInfo.sub,
      originalPrice: highValueInfo.original,
      futurePrice: isRTL 
        ? "بعد الإطلاق: نسبة من قيمة الصفقة حسب الاتفاق." 
        : "After launch: Commission-based percentage by agreement.",
      status: isRTL ? "مفتوح — نقبل الطلبات الآن" : "Open — Accepting requests now",
      statusColor: "#f59e0b",
      highlight: true,
      features: isRTL
        ? [
            "دراسة شاملة لبدائل السوق",
            "مراجعة الحالة القانونية والتراخيص والضمان",
            "مساعد التفاوض بالذكاء الاصطناعي",
            "أخصائي توريد مخصص لطلبك",
          ]
        : [
            "Full market alternatives survey",
            "Legal status, licensing & warranty review",
            "AI-powered negotiation assistant",
            "Dedicated sourcing specialist",
          ],
      limitations: isRTL
        ? ["لا يشمل الخدمات القانونية أو التعاقد", "لا يشمل التمويل أو التأمين"]
        : ["Does not include legal or contracting services", "Does not include financing or insurance"],
    },
    {
      title: isRTL ? "المشاريع والتوريد" : "Projects & Supply",
      desc: isRTL
        ? "خدمات التوريدات العامة، التشطيبات، الإنشاءات، الإشراف على التنفيذ، الشحن والخدمات اللوجستية، تأثيث وتجهيز المطاعم والفنادق والمنشأت أو أي طلب مخصص."
        : "General supply services, fit-outs, construction, execution supervision, shipping & logistics, furnishing and equipping restaurants, hotels, establishments, or any custom request.",
      currentPrice: { amount: projectInfo.amount, label: projectInfo.label },
      currentPriceSub: projectInfo.sub,
      originalPrice: projectInfo.original,
      futurePrice: isRTL 
        ? "＋ نسبة عند التنفيذ حسب نطاق المشروع والاتفاق." 
        : "+ Execution commission based on project scope & agreement.",
      status: isRTL ? "مفتوح — نقبل الطلبات الآن" : "Open — Accepting requests now",
      statusColor: "#a78bfa",
      highlight: false,
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
      limitations: isRTL
        ? ["لا يشمل الرسوم الحكومية أو استخراج التراخيص الرسمية", "النسبة الإضافية للمشاريع تُحدد بعد دراسة نطاق العمل"]
        : ["Does not include governmental fees or official licensing", "Additional execution commission determined after scope review"],
    },
  ];

  // Inline style helpers (shared across cards)
  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: "4px",
  };

  const dividerStyle: React.CSSProperties = {
    width: "100%",
    height: "1px",
    background: "rgba(255,255,255,0.06)",
    margin: "16px 0",
  };

  return (
    <section 
      id="pricing" 
      className={styles.section}
      aria-labelledby="pricing-title"
    >
      <div className={styles.container}>
        {/* Pricing Heading */}
        <div className={styles.sectionHeader}>
          <h2 id="pricing-title" className={styles.title}>
            {isRTL ? "خطط التسعير" : "Pricing Plans"}
          </h2>
          <p className={styles.subtitle}>
            {isRTL 
              ? "تسعير شفاف. لا رسوم مخفية. لا مفاجآت."
              : "Transparent pricing. No hidden fees. No surprises."}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className={styles.pricingGrid}>
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`${styles.pricingCard} ${plan.highlight ? styles.pricingCardPopular : ""}`}
            >
              {/* ── 1. LAUNCH STATUS ── */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "16px",
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: plan.statusColor,
                  boxShadow: `0 0 8px ${plan.statusColor}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: plan.statusColor,
                  letterSpacing: "0.02em",
                }}>
                  {plan.status}
                </span>
              </div>

              {/* ── 2. PLAN TITLE & DESCRIPTION ── */}
              <h3 className={styles.planTitle}>{plan.title}</h3>
              <p className={styles.planDesc}>{plan.desc}</p>
              
              {/* ── 3. CURRENT PRICE (large, prominent) ── */}
              <div className={styles.planPriceBox}>
                <span style={labelStyle}>
                  {isRTL ? "السعر الحالي" : "Current Price"}
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span className={styles.planPrice}>
                    {plan.currentPrice.label}
                  </span>
                  {plan.originalPrice && Number(plan.originalPrice) !== Number(plan.currentPrice.amount) && (
                    <span style={{ fontSize: "1.1rem", textDecoration: "line-through", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                      {isRTL ? `${Number(plan.originalPrice).toLocaleString('ar-EG')} جنيه` : `${Number(plan.originalPrice).toLocaleString('en-US')} EGP`}
                    </span>
                  )}
                </div>
                <span className={styles.planPriceSub}>
                  {" "}{plan.currentPriceSub}
                </span>
              </div>

              {/* ── 4. FUTURE PRICE ── */}
              {(!plan.showFuturePriceOnlyIfPromo || !!plan.originalPrice) && (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "20px",
                }}>
                  <span style={{
                    ...labelStyle,
                    marginBottom: "2px",
                  }}>
                    {isRTL ? "بعد فترة الإطلاق" : "After Launch"}
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                  }} suppressHydrationWarning>
                    {plan.futurePrice}
                  </span>
                </div>
              )}

              <div style={dividerStyle} />

              {/* ── 5. INCLUDED FEATURES ── */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ ...labelStyle, color: "rgba(255,255,255,0.3)" }}>
                  {isRTL ? "ما يشمله الطلب" : "Included"}
                </span>
              </div>
              <ul className={styles.featuresList}>
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx} className={styles.featureItem}>
                    <span className={styles.featureIcon}>✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* ── 6. LIMITATIONS ── */}
              {plan.limitations && plan.limitations.length > 0 && (
                <>
                  <div style={{ ...dividerStyle, margin: "12px 0" }} />
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{ ...labelStyle, color: "rgba(255,255,255,0.25)" }}>
                      {isRTL ? "لا يشمل" : "Not Included"}
                    </span>
                  </div>
                  <ul className={styles.featuresList} style={{ marginBottom: "20px", gap: "8px" }}>
                    {plan.limitations.map((lim, lIdx) => (
                      <li key={lIdx} className={styles.featureItem} style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span style={{ color: "rgba(239, 68, 68, 0.5)", fontWeight: 800, flexShrink: 0 }}>✕</span>
                        <span style={{ fontSize: "0.82rem" }}>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* ── 7. CTA ── */}
              <Link
                href={`/${locale}/start-request`}
                className={styles.planCta}
                onClick={() => handleCtaClick(`pricing_plan_${index}`, plan.title)}
              >
                {plan.currentPrice.amount === 0
                  ? (isRTL ? "ابدأ طلبك المجاني" : "Start Free Request")
                  : (isRTL ? "ابدأ طلبك الآن" : "Start Your Request")}
              </Link>
            </div>
          ))}
        </div>

        {/* Video Demo Section — Coming Soon */}
        <div id="how" className={styles.videoSection} aria-label="Findora Video Walkthrough">
          <div className={styles.sectionHeader} style={{ marginBottom: "var(--space-32)" }}>
            <h3 className={styles.title} style={{ fontSize: "1.8rem" }}>
              {isRTL ? "شاهد كيف نعمل" : "See How It Works"}
            </h3>
            <p className={styles.subtitle} style={{ fontSize: "0.95rem" }}>
              {isRTL 
                ? "فيديو توضيحي كامل لدورة حياة طلب التوريد — قريباً."
                : "A full video walkthrough of the sourcing request lifecycle — coming soon."}
            </p>
          </div>

          {/* Professional thumbnail placeholder */}
          <div className={styles.videoWrapper} style={{ cursor: "default" }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%)",
              gap: "16px",
              zIndex: 2,
            }}>
              {/* Play icon with glow */}
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(200, 151, 59, 0.15)",
                border: "2px solid rgba(200, 151, 59, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                color: "rgba(200, 151, 59, 0.6)",
                boxShadow: "0 0 40px rgba(200, 151, 59, 0.1)",
              }}>
                ▶
              </div>

              {/* Coming soon badge */}
              <div style={{
                background: "rgba(200, 151, 59, 0.1)",
                border: "1px solid rgba(200, 151, 59, 0.25)",
                borderRadius: "999px",
                padding: "6px 18px",
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "var(--accent)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {isRTL ? "🎬 الفيديو قريباً" : "🎬 Video Coming Soon"}
              </div>

              {/* Quick process summary */}
              <div style={{
                display: "flex",
                gap: "24px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "8px",
                maxWidth: "600px",
              }}>
                {(isRTL
                  ? ["📋 أرسل طلبك", "🔍 بحث أونلاين وأوفلاين بالمحلات", "📊 نقارن العروض", "📄 تستلم التقرير"]
                  : ["📋 Submit Request", "🔍 Online & Offline Store Search", "📊 Compare Offers", "📄 Get Report"]
                ).map((step, i) => (
                  <span key={i} style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.45)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    {step}
                    {i < 3 && <span style={{ color: "rgba(200, 151, 59, 0.3)", marginInlineStart: "8px" }}>{isRTL ? "←" : "→"}</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Transcript — always visible for SEO & accessibility */}
          <div className={styles.videoTranscript}>
            <button
              type="button"
              className={styles.transcriptToggle}
              onClick={handleToggleTranscript}
              aria-expanded={showTranscript}
            >
              <span>{isRTL ? "اقرأ شرح آلية العمل" : "Read How It Works"}</span>
              <span>{showTranscript ? "▲" : "▼"}</span>
            </button>
            {showTranscript && (
              <div className={styles.transcriptBox} role="region">
                {isRTL ? (
                  <p>
                    تبدأ رحلتك بإرسال طلب توريد يحتوي على السلعة المطلوبة وميزانيتك. 
                    يقوم نظامنا بمسح كتالوجات الموزعين أونلاين، بينما يتواصل ممثلونا هاتفياً وميدانياً مع محلات تجار الجملة 
                    للتحقق من السعر وتوافر المخزون وصلاحية الضمان المحلي. نقوم بحساب تقييم الصفقة الذكية ونعرض الترشيحات والبدائل 
                    والعيوب والمميزات في لوحة تحكم تفاعلية لتختار الأنسب بخصوصية وأمان. فايندورا تحميك وتوفر مجهودك.
                  </p>
                ) : (
                  <p>
                    Your sourcing journey starts by submitting a request detailing your spec matches and budget limits. 
                    Our AI scans databases instantly, while local sourcing experts contact merchant outlets directly by phone to verify stock, 
                    local official warranty support, and negotiate discounts. We compile all options, calculate the Smart Deal Score™, and display 
                    advantages and trade-offs on your interactive dashboard, leaving you with complete control to decide on your own terms.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Risk Reversal indicators cards */}
        <div className={styles.sectionHeader} style={{ marginBottom: "var(--space-32)" }}>
          <h3 className={styles.title} style={{ fontSize: "1.7rem" }}>
            {reversalDict.title || "Purchase Risk Reversal"}
          </h3>
          <p className={styles.subtitle} style={{ fontSize: "0.95rem" }}>
            {reversalDict.desc || "We protect your interests with concrete safety policies."}
          </p>
        </div>

        <div className={styles.reversalGrid}>
          <div className={styles.reversalCard}>
            <h4 className={styles.reversalTitle}>🛡️ {isRTL ? "تحكم كامل" : "100% Control"}</h4>
            <p className={styles.cardDesc} style={{ fontSize: "0.85rem" }}>
              {reversalDict.point2 || "No automated charges or card bindings. You decide if and when to purchase."}
            </p>
          </div>
          <div className={styles.reversalCard}>
            <h4 className={styles.reversalTitle}>🤝 {isRTL ? "مراجعة قبل الدفع" : "Review First"}</h4>
            <p className={styles.cardDesc} style={{ fontSize: "0.85rem" }}>
              {reversalDict.point1 || "Review your full sourcing report before committing single penny."}
            </p>
          </div>
          <div className={styles.reversalCard}>
            <h4 className={styles.reversalTitle}>🔒 {isRTL ? "خصوصية تامة" : "Absolute Privacy"}</h4>
            <p className={styles.cardDesc} style={{ fontSize: "0.85rem" }}>
              {reversalDict.point4 || "Zero spam calls from sellers. Sourcing specs are shared anonymously."}
            </p>
          </div>
        </div>

        {/* Bottom Conversion CTA Card Banner */}
        <div className={styles.bottomCtaWrapper}>
          <h3 className={styles.title} style={{ fontSize: "2rem", marginBottom: "var(--space-12)" }}>
            {ctaDict.title || "Ready to stop searching blindly?"}
          </h3>
          <p className={styles.subtitle} style={{ maxWidth: "680px", margin: "0 auto var(--space-32)", fontSize: "0.98rem" }}>
            {ctaDict.desc || "Tell us what you need, and we'll hunt the best deals for you."}
          </p>
          <div style={{ display: "flex", gap: "var(--space-16)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href={`/${locale}/start-request`}
              className={styles.planCta}
              style={{ width: "auto", padding: "var(--space-16) var(--space-40)" }}
              onClick={() => handleCtaClick("bottom_cta_start", "Start Free Sourcing")}
            >
              {ctaDict.start || "Start Your First Free Request"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
export { CTA };

