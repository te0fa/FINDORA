"use client";

import React, { useState } from "react";
import styles from "./ReportPreview.module.css";
import { useAnalytics } from "@/hooks/useAnalytics";

interface ReportPreviewProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

/**
 * Enterprise Component Contract: Sourcing Report Preview Component
 * Purpose: Provide interactive preview of Sourcing report detailing Deal Score, trust, pros/cons, alternatives.
 * Props Interface: ReportPreviewProps
 * States: activeTab ('value' | 'budget' | 'trust')
 * Accessibility: WCAG 2.2 AA compliant, interactive tabs mapped with aria-selected
 * Analytics: Report tab clicks, explain details toggled
 * Reusability: Reusable on Reports panel onboarding tour, Customer Workspace Dashboard
 */
export default function ReportPreview({ dict, locale, isRTL }: ReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<"value" | "budget" | "trusted">("value");
  const track = useAnalytics();

  const landingDict = dict.landing_v3 || {};
  const reportDict = landingDict.report || {};
  const explainDict = landingDict.explain || {};

  // Mock Sourcing options mapped to specific choices
  const offersData = {
    value: {
      title: reportDict.best_value || "Best Value",
      score: 94,
      confidence: "95% (High)",
      price: isRTL ? "١٤,٢٠٠ جنيه" : "EGP 14,200",
      seller: "Cairo Electronics",
      sellerScore: "96%",
      warranty: isRTL ? "ضمان محلي سنتين" : "24 Months Official",
      availability: isRTL ? "متوفر" : "In Stock",
      delivery: isRTL ? "خلال ٢٤ ساعة" : "Within 24h",
      whyThis: isRTL 
        ? "هذا العرض يمثل التوازن المثالي بين السعر المنخفض والضمان الرسمي الطويل (سنتين) وسمعة البائع الممتازة."
        : "This option offers the optimal balance of price, long local official warranty (24 months), and excellent merchant trust.",
      whyNotCheapest: isRTL
        ? "العرض الأرخص في السوق (١٣,٥٠٠ جنيه) يأتي بدون ضمان وكيل محلي، ولديه تقييم تاجر منخفض جداً (٧٢%)."
        : "The cheapest option on the market (EGP 13,500) carries no official agent warranty and has a low seller rating (72%).",
      pros: isRTL 
        ? ["ضمان محلي معتمد سنتين", "بائع موثوق وتقييم مرتفع", "شحن وتوصيل فوري"]
        : ["24 Months Official Warranty", "Highly rated trusted merchant", "Express immediate delivery"],
      cons: isRTL
        ? ["السعر يزيد بنسبة ٥% عن البديل الأرخص"]
        : ["Sticker price is 5% higher than cheapest option"],
    },
    budget: {
      title: reportDict.budget_choice || "Budget Choice",
      score: 78,
      confidence: "80% (Medium)",
      price: isRTL ? "١٣,٥٠٠ جنيه" : "EGP 13,500",
      seller: "Al-Amal Store",
      sellerScore: "72%",
      warranty: isRTL ? "ضمان محل ٣ أشهر" : "3 Months Shop Warranty",
      availability: isRTL ? "متوفر" : "In Stock",
      delivery: isRTL ? "خلال يومين" : "2-3 Days Delivery",
      whyThis: isRTL
        ? "الخيار الأقل تكلفة في السوق الفعلي. مناسب للمشترين الذين يبحثون عن أقل سعر فوري وبغض النظر عن طول مدة الضمان."
        : "The lowest upfront cost available. Suitable for buyers prioritizing short-term budget limits over extended warranty periods.",
      whyNotCheapest: isRTL
        ? "هذا هو العرض الأرخص بالفعل، ولكن نقيم موثوقيته بـ 80% فقط لعدم وجود ضمان وكيل رسمي."
        : "This is the cheapest option, but confidence rating is limited to 80% due to the lack of official agent support.",
      pros: isRTL
        ? ["أقل سعر متاح في السوق بالكامل", "توافر فوري للمنتج"]
        : ["Lowest upfront cost on the market", "Immediate stock available"],
      cons: isRTL
        ? ["ضمان محل قصير جداً (٣ أشهر)", "تقييم التاجر متوسط وموثوقية متدنية"]
        : ["Very short shop warranty (3 months)", "Average merchant rating and lower trust"],
    },
    trusted: {
      title: reportDict.trusted_seller || "Most Trusted Seller",
      score: 88,
      confidence: "98% (Premium)",
      price: isRTL ? "١٤,٨٠٠ جنيه" : "EGP 14,800",
      seller: "Findora Verified Hub",
      sellerScore: "99%",
      warranty: isRTL ? "ضمان رسمي ٣ سنوات" : "36 Months Official Extension",
      availability: isRTL ? "شحن خلال ٣ أيام" : "Order on request",
      delivery: isRTL ? "شحن خلال ٤٨ ساعة" : "Within 48h",
      whyThis: isRTL
        ? "تم اختياره لحصول البائع على أعلى موثوقية وتقديمه ضماناً ممتداً لثلاث سنوات، ما يوفر حماية كاملة للمشترين من الشركات."
        : "Selected due to the merchant's 99% track record and their premium 3-year extended warranty, ideal for corporate procurement.",
      whyNotCheapest: isRTL
        ? "سعر هذا العرض يزيد بنسبة ٩% عن العرض الأرخص بسبب رسوم الضمان الممتد لثلاث سنوات وموثوقية المورد الاستثنائية."
        : "Costs 9% more than the cheapest option due to the extended 3-year warranty package and exceptional merchant quality.",
      pros: isRTL
        ? ["ضمان رسمي طويل جداً (٣ سنوات)", "المورد الأعلى تقييماً ونسب استرجاع صفرية", "خدمة عملاء فائقة الجودة"]
        : ["Extended 3-year official warranty", "Highest rated supplier with 0% return rate", "Premium corporate service tier"],
      cons: isRTL
        ? ["السعر الأعلى بين الخيارات المعروضة", "يحتاج ٣ أيام للشحن"]
        : ["Highest price among all offers", "Requires 3 days processing lead time"],
    },
  };

  const activeOffer = offersData[activeTab];

  const handleTabChange = (tab: "value" | "budget" | "trusted") => {
    setActiveTab(tab);
    track.reportInteraction("tab_switch", tab);
  };

  return (
    <section 
      id="report-preview" 
      className={styles.section}
      aria-labelledby="report-preview-title"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 id="report-preview-title" className={styles.title}>
            {reportDict.title || "Interactive Sourcing Report Preview"}
          </h2>
          <p className={styles.subtitle}>
            {reportDict.subtitle || "Factual, explained recommendations mapped with pros, cons, and alternatives."}
          </p>
        </div>

        {/* Tabs Control Header */}
        <div className={styles.tabsContainer} role="tablist" aria-label="Sourcing report choices">
          {(["value", "budget", "trusted"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTabBtn : ""}`}
              onClick={() => handleTabChange(tab)}
            >
              {offersData[tab].title}
            </button>
          ))}
        </div>

        {/* Live Interactive Sourcing Dashboard */}
        <div className={styles.reportShell} aria-live="polite">
          {/* Left panel: Score meter & parameters grid */}
          <div className={styles.leftPanel}>
            <div className={styles.scoreMeter}>
              {/* SVG Radial Meter */}
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle
                  cx="75"
                  cy="75"
                  r="64"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="8"
                />
                <circle
                  cx="75"
                  cy="75"
                  r="64"
                  fill="transparent"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeDasharray="402"
                  strokeDashoffset={402 - (402 * activeOffer.score) / 100}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </svg>
              <div className={styles.scoreValue}>
                <span className={styles.scoreNumber}>{activeOffer.score}</span>
                <span className={styles.scoreMax}>{reportDict.score_label || "Score"}</span>
              </div>
            </div>

            {/* Sourced parameters matrix */}
            <div className={styles.metricItems}>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "السعر المعروض" : "Sourced Price"}</span>
                <span className={styles.metricValue} style={{ color: "var(--accent)", fontSize: "1.1rem" }}>
                  {activeOffer.price}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "مستوى الموثوقية" : "Confidence Level"}</span>
                <span className={styles.metricValue}>{activeOffer.confidence}</span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "اسم البائع" : "Seller Name"}</span>
                <span className={styles.metricValue}>
                  {activeOffer.seller}{" "}
                  <span className={styles.verifiedBadge}>
                    {activeOffer.sellerScore}
                  </span>
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "الضمان المحلي" : "Official Warranty"}</span>
                <span className={styles.metricValue}>{activeOffer.warranty}</span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "توافر السلعة" : "Immediate Stock"}</span>
                <span className={styles.metricValue}>{activeOffer.availability}</span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>{isRTL ? "سرعة التوصيل" : "Delivery Lead"}</span>
                <span className={styles.metricValue}>{activeOffer.delivery}</span>
              </div>
            </div>
          </div>

          {/* Right panel: Rationale & Disclosures */}
          <div className={styles.rightPanel}>
            {/* Why This Option? */}
            <div className={styles.explainCard}>
              <h4 className={styles.cardTitle}>
                <span>💡</span>
                <span>{reportDict.why_this || "Why This Option?"}</span>
              </h4>
              <p className={styles.cardDesc}>{activeOffer.whyThis}</p>
            </div>

            {/* Why Not Cheapest? */}
            {activeTab !== "budget" && (
              <div className={styles.explainCard}>
                <h4 className={styles.cardTitle}>
                  <span>⚠️</span>
                  <span>{reportDict.why_not_cheapest || "Why Not The Cheapest?"}</span>
                </h4>
                <p className={styles.cardDesc}>{activeOffer.whyNotCheapest}</p>
              </div>
            )}

            {/* Pros & Cons (Trade-offs) */}
            <div className={styles.prosCons}>
              <div className={styles.proList}>
                <h5 className={styles.cardTitle} style={{ fontSize: "0.85rem", color: "var(--success)" }}>
                  {reportDict.advantages || "Advantages"}
                </h5>
                {activeOffer.pros.map((item, idx) => (
                  <div key={idx} className={styles.proItem}>
                    {item}
                  </div>
                ))}
              </div>

              <div className={styles.conList}>
                <h5 className={styles.cardTitle} style={{ fontSize: "0.85rem", color: "var(--warning)" }}>
                  {reportDict.disadvantages || "Trade-offs"}
                </h5>
                {activeOffer.cons.map((item, idx) => (
                  <div key={idx} className={styles.conItem}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Explainability Parameters section */}
        <div className={styles.explainabilitySection}>
          <div className={styles.sectionHeader} style={{ marginBottom: "var(--space-24)" }}>
            <h3 className={styles.title} style={{ fontSize: "1.7rem" }}>
              {explainDict.title || "Decision Explainability Parameters"}
            </h3>
            <p className={styles.subtitle} style={{ fontSize: "0.95rem" }}>
              {explainDict.subtitle || "We disclose parameter weights to ensure unbiased evaluation."}
            </p>
          </div>

          <div className={styles.weightsGrid}>
            <div className={styles.weightBar}>
              <span className={styles.weightValue}>40%</span>
              <div className={styles.weightLabel}>{explainDict.weight_price || "Price & Cost"}</div>
            </div>
            <div className={styles.weightBar}>
              <span className={styles.weightValue}>25%</span>
              <div className={styles.weightLabel}>{explainDict.weight_trust || "Merchant Reliability"}</div>
            </div>
            <div className={styles.weightBar}>
              <span className={styles.weightValue}>15%</span>
              <div className={styles.weightLabel}>{explainDict.weight_warranty || "Warranty Validity"}</div>
            </div>
            <div className={styles.weightBar}>
              <span className={styles.weightValue}>10%</span>
              <div className={styles.weightLabel}>{explainDict.weight_avail || "Immediate Stock"}</div>
            </div>
            <div className={styles.weightBar}>
              <span className={styles.weightValue}>10%</span>
              <div className={styles.weightLabel}>{explainDict.weight_delivery || "Delivery speed"}</div>
            </div>
          </div>

          <div 
            className={styles.cardDesc} 
            style={{ 
              maxWidth: "800px", 
              margin: "var(--space-24) auto 0", 
              textAlign: "center",
              fontSize: "0.88rem",
              color: "var(--text-muted)"
            }}
          >
            <strong>{explainDict.why_transparency_title || "Why Transparency Matters:"}</strong>{" "}
            {explainDict.why_transparency_desc || "Unlike sites ranking offers by sponsored advertising bids, Findora ranks dynamically. We reveal tradeoffs so you are fully informed."}
          </div>
        </div>
      </div>
    </section>
  );
}
export { ReportPreview };
