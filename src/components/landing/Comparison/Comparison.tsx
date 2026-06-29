import React from "react";
import styles from "./Comparison.module.css";

interface ComparisonProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

/**
 * Enterprise Component Contract: Comparison Section
 * Purpose: Compare Findora vs typical sourcing methods side-by-side.
 * Props Interface: ComparisonProps
 * States: Server rendered layout
 * Accessibility: WCAG 2.2 AA compliant, clean headings structure, ARIA labeled tables
 * Analytics: Comparison viewed, hover row tracking
 * Reusability: Reusable on Onboarding guides and Pricing pages
 */
export default function Comparison({ dict, locale, isRTL }: ComparisonProps) {
  const landingDict = dict.landing_v3 || {};
  const compDict = landingDict.comparison || {};

  const headers = [
    compDict.label_searching_alone || "Searching Alone",
    compDict.label_marketplaces || "Marketplaces",
    compDict.label_comparison_sites || "Comparison Sites",
    compDict.label_procurement || "Traditional Procurement",
    compDict.label_findora || "Findora Sourcing",
  ];

  // Vectors data: label, values for headers (Alone, Marketplaces, PriceSites, Procurement, Findora)
  // 'yes' | 'no' | 'partial'
  const rows = [
    {
      label: compDict.vector_online_search || "Online search",
      values: ["yes", "yes", "yes", "no", "yes"],
    },
    {
      label: compDict.vector_offline_sourcing || "Offline sourcing",
      values: ["no", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_negotiation || "Negotiation support",
      values: ["no", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_warranty_verification || "Warranty verification",
      values: ["partial", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_supplier_trust || "Supplier trust checks",
      values: ["no", "partial", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_spec_matching || "Technical spec matching",
      values: ["no", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_professional_report || "Structured options report",
      values: ["no", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_human_verification || "On-ground human review",
      values: ["no", "no", "no", "yes", "yes"],
    },
    {
      label: compDict.vector_privacy_protection || "Privacy protection",
      values: ["no", "no", "no", "partial", "yes"],
    },
    {
      label: compDict.vector_decision_explanation || "Why recommendations are chosen",
      values: ["no", "no", "no", "no", "yes"],
    },
  ];

  const renderBadge = (val: string) => {
    switch (val) {
      case "yes":
        return <span className={styles.badgeYes}>✓</span>;
      case "no":
        return <span className={styles.badgeNo}>✗</span>;
      case "partial":
      default:
        return <span className={styles.badgePartial}>~</span>;
    }
  };

  return (
    <section 
      id="comparison" 
      className={styles.section}
      aria-labelledby="comparison-title"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 id="comparison-title" className={styles.title}>
            {compDict.title || "Why Not Search Yourself?"}
          </h2>
          <p className={styles.subtitle}>
            {compDict.subtitle || "A transparent comparison of Findora against traditional buying channels."}
          </p>
        </div>

        {/* Desktop Table View */}
        <div className={styles.tableWrapper}>
          <table className={styles.matrixTable} aria-label="Sourcing methods comparison matrix">
            <thead>
              <tr>
                <th scope="col" className={styles.rowHeader}>
                  {isRTL ? "مزايا المقارنة والتوريد" : "Sourcing Parameters"}
                </th>
                {headers.map((h, i) => (
                  <th 
                    key={i} 
                    scope="col"
                    className={i === 4 ? styles.findoraHeader : ""}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <th scope="row" className={styles.rowHeader}>
                    {row.label}
                  </th>
                  {row.values.map((val, vIdx) => (
                    <td 
                      key={vIdx}
                      className={vIdx === 4 ? styles.findoraCol : ""}
                    >
                      {renderBadge(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout Fallback */}
        <div className={styles.mobileCards}>
          {/* We only render Searching Alone vs Findora on mobile for compactness, or all of them */}
          {headers.map((h, hIdx) => {
            // Keep it simple on mobile: highlight Findora differently
            const isFindora = hIdx === 4;
            return (
              <div 
                key={hIdx} 
                className={styles.mobileCard}
                style={isFindora ? { borderColor: "var(--accent)", background: "rgba(200, 151, 59, 0.05)" } : {}}
              >
                <h3 className={styles.mobileCardTitle} style={isFindora ? { color: "var(--accent)" } : {}}>
                  {h}
                </h3>
                {rows.map((row, rIdx) => (
                  <div key={rIdx} className={styles.mobileRow}>
                    <span className={styles.mobileRowLabel}>{row.label}</span>
                    <span>{renderBadge(row.values[hIdx])}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export { Comparison };
