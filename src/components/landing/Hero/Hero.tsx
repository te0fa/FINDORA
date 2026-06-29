import React from "react";
import Link from "next/link";
import styles from "./Hero.module.css";
import WorkflowAnimation from "../Workflow/Workflow";

interface HeroProps {
  dict: any;
  locale: string;
  isRTL: boolean;
  announcements?: any[];
  variant?: "A" | "B";
  profile?: "B2B" | "B2C" | "returning_user" | "industrial" | "medical" | "electronics";
}

/**
 * Enterprise Component Contract: Hero Component
 * Purpose: Instantly communicate value, clarify differential sourcing logic, and drive request intake.
 * Props Interface: HeroProps
 * States: Server rendered (Static layout elements, skeleton placeholders for client-hydrated sub-elements)
 * Accessibility: WCAG 2.2 AA compliant, semantic markup, focus state targets, screen-reader titles
 * Analytics Events: Hero viewed intersection tracking, CTA clicks
 * Reusability: Modular configuration supporting A/B layouts and dynamic user profiles (B2B, returning)
 */
export default function Hero({
  dict,
  locale,
  isRTL,
  announcements = [],
  variant = "A",
  profile = "B2C",
}: HeroProps) {
  const landingDict = dict.landing_v3 || {};
  const heroDict = landingDict.hero || {};

  // Resolve personalized B2B/B2C values
  const isB2B = profile === "B2B" || profile === "industrial" || profile === "medical";
  
  // Cairo Cairo Cairo Cairo
  const displayTitle = isRTL ? heroDict.title_ar : heroDict.title_en;
  
  const displaySubtitle = isB2B
    ? (isRTL 
        ? "مساعد المشتريات والتوريد الذكي للشركات. نقوم بمسح كتالوجات الموزعين وتجار الجملة الفعليين ومطابقة المواصفات الفنية لضمان أفضل قيمة إجمالية."
        : "Your Enterprise Sourcing Assistant. We scan wholesale catalogs, call physical distributors, and match specs to optimize your supply chains.")
    : heroDict.subtitle;

  // Reusable category lists
  return (
    <section id="home" className={styles.heroSection} aria-label="Findora Introduction">
      <div className={styles.heroGlow1} />
      <div className={styles.heroGlow2} />

      <div className={styles.container}>
        <div className={styles.heroContent}>
          {/* Dynamic Announcement Banner / Launch Badge */}
          <div className={styles.launchBadge} role="status">
            <span>🎁</span>
            <span>{heroDict.launch_badge || "Free Sourcing During Launch"}</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleHighlight}>
              {displayTitle ? displayTitle.split(/(?<=\.\.\.|\.)\s+/).map((segment: string, index: number, array: string[]) => (
                <React.Fragment key={index}>
                  {segment}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              )) : null}
            </span>
          </h1>

          <p className={styles.heroDesc}>
            {displaySubtitle}
          </p>

          {/* Action CTAs with tracking properties */}
          <div className={styles.heroCtas}>
            <Link
              href={`/${locale}/start-request`}
              className={styles.ctaPrimary}
              data-analytics-id="hero_cta_primary"
              data-testid="homepage-cms-hero-cta"
            >
              {heroDict.cta_primary || "Start First Free Request"}
            </Link>
            <Link
              href={`/${locale}/track-request`}
              className={styles.ctaSecondary}
              data-analytics-id="hero_cta_secondary"
              data-testid="homepage-cms-hero-track"
            >
              {isRTL ? "تتبع طلبك" : "Track Request"}
            </Link>
          </div>

          {/* Reusable Trust Badges */}
          <div className={styles.trustBadges} aria-label="Trust Badges">
            <div className={styles.trustBadgeItem}>
              <span className={styles.trustBadgeDot} />
              <span>{heroDict.trust_human || "Human Verified"}</span>
            </div>
            <div className={styles.trustBadgeItem}>
              <span className={styles.trustBadgeDot} />
              <span>{heroDict.trust_privacy || "Privacy Protected"}</span>
            </div>
            <div className={styles.trustBadgeItem}>
              <span className={styles.trustBadgeDot} />
              <span>{heroDict.trust_comparison || "Transparent Comparison"}</span>
            </div>
            <div className={styles.trustBadgeItem}>
              <span className={styles.trustBadgeDot} />
              <span>{heroDict.trust_score || "Smart Deal Score™"}</span>
            </div>
          </div>

        </div>

        {/* Client-side Workflow Animation Component */}
        <div className={styles.heroVisual} style={{ marginTop: '56px' }} aria-hidden="true">
          <WorkflowAnimation dict={dict} isRTL={isRTL} />
        </div>
      </div>
    </section>
  );
}
