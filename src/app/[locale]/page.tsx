import React, { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/i18n/config";
import LandingHeader from "@/components/LandingHeader";
import FloatingHighlightsHub from "@/components/marketing/FloatingHighlightsHub";
import { getActiveHomepageAnnouncements, getFeaturedFindoraDeals } from "@/lib/dal/marketing";
import { resolvePricing } from "@/lib/pricing/resolver";
import { createClient } from "@/lib/supabase/server";
import { getRegistrationAvailability } from "@/lib/contributors/scarcity";
import Link from "next/link";

// Enterprise Sourcing Components (Modularized & A/B Ready)
import Hero from "@/components/landing/Hero/Hero";
import Trust from "@/components/landing/Trust/Trust";
import Comparison from "@/components/landing/Comparison/Comparison";
import ReportPreview from "@/components/landing/ReportPreview/ReportPreview";
import FAQ from "@/components/landing/FAQ/FAQ";
import CTA from "@/components/landing/CTA/CTA";
import Footer from "@/components/landing/Footer/Footer";

import Categories from "@/components/landing/Categories/Categories";

// Skeletons for Lazy/Progressive Hydration
function SectionSkeleton() {
  return (
    <div 
      className="section-skeleton animate-pulse" 
      style={{ 
        height: "400px", 
        background: "rgba(15, 23, 42, 0.15)", 
        margin: "var(--space-32) 0",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)"
      }} 
    />
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const supabase = await createClient();

  // 1. Fetch Economy Configuration flags (e.g. A/B flags, active features)
  let configData: any[] | null = null;
  try {
    const { data } = await supabase
      .from("economy_config")
      .select("config_key, value")
      .like("config_key", "flag_%");
    configData = data;
  } catch (err) {
    console.warn("Failed to fetch economy config flags:", err);
  }

  const flags: Record<string, boolean> = {};
  if (configData) {
    configData.forEach((f: any) => {
      flags[f.config_key] = f.value === "true" || f.value === true;
    });
  }

  // 2. Fetch marketing announcements and marketplace deals
  const announcements = await getActiveHomepageAnnouncements();
  const featuredDeals = await getFeaturedFindoraDeals(3);

  // Check if recruitment campaign is active to dynamically display alert card & highlight
  const recruitmentAvailability = await getRegistrationAvailability();
  const isRecruitmentActive = recruitmentAvailability.is_active;

  if (isRecruitmentActive) {
    announcements.unshift({
      id: 'recruitment-active-announcement',
      title_en: '🟢 Work with us: Scout registration slots are open!',
      title_ar: '🟢 اشتغل معانا: باب التسجيل مفتوح للمناديب والشركاء!',
      body_en: 'Join our team as a Field Scout or Store Partner. Earn commissions on deals.',
      body_ar: 'انضم كشريك أو مندوب ميداني لتوثيق وتوريد الصفقات واكسب عمولات حقيقية.',
      link_url: '/contributors',
      announcement_type: 'announcement'
    });
  }

  // 3. Dynamic Pricing Engine Resolution with Safe Baseline Fallbacks
  const [everydayPricing, highValuePricing, projectPricing] = await Promise.all([
    resolvePricing("everyday_purchase"),
    resolvePricing("high_value_deals"),
    resolvePricing("projects_supplies"),
  ]);

  // 4. Localized navigation header labels
  const headerLabels = {
    home: isRTL ? "الرئيسية" : "Home",
    how: isRTL ? "كيف نعمل" : "How It Works",
    why: isRTL ? "لماذا فايندورا" : "Why Findora",
    categories: isRTL ? "التصنيفات" : "Categories",
    flow: isRTL ? "آلية الطلب" : "Process",
    pricing: isRTL ? "الأسعار" : "Pricing",
    faq: isRTL ? "الأسئلة الشائعة" : "FAQ",
    deals: isRTL ? "عروض فايندورا" : "Findora Deals",
    start: isRTL ? "ابدأ طلبك الآن" : "Start Your Request",
    track: isRTL ? "تتبع طلبك" : "Track Your Request",
    login: dict.navigation.login,
    signup: dict.navigation.signup,
  };

  // 5. Generate JSON-LD Schema structures for SEO compliance (WCAG & Lighthouse > 95)
  const faqData = [
    { q: dict.landing_v3?.faq?.q1, a: dict.landing_v3?.faq?.a1 },
    { q: dict.landing_v3?.faq?.q2, a: dict.landing_v3?.faq?.a2 },
    { q: dict.landing_v3?.faq?.q3, a: dict.landing_v3?.faq?.a3 },
    { q: dict.landing_v3?.faq?.q4, a: dict.landing_v3?.faq?.a4 },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://findora.app/#organization",
        "name": "Findora",
        "url": "https://findora.app",
        "logo": "https://findora.app/logo-2-processed.png",
        "sameAs": [
          "https://facebook.com/findora.app",
          "https://twitter.com/findora_app",
          "https://linkedin.com/company/findora",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://findora.app/#website",
        "url": "https://findora.app",
        "name": "Findora",
        "publisher": { "@id": "https://findora.app/#organization" },
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqData.map((faq) => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": isRTL ? "الرئيسية" : "Home",
            "item": `https://findora.app/${locale}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="landing-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* Skip Link for WCAG 2.2 keyboard navigation accessibility */}
      <a href="#main-content" className="skipLink">
        {isRTL ? "تجاوز إلى المحتوى الرئيسي" : "Skip to Main Content"}
      </a>

      {/* Shared Navigation Header */}
      <LandingHeader locale={locale} isRTL={isRTL} labels={headerLabels} isRecruitmentActive={isRecruitmentActive} />

      {/* Floating Announcements Widget */}
      <FloatingHighlightsHub
        offers={announcements}
        deals={featuredDeals}
        locale={locale}
        dict={dict}
      />

      <main id="main-content">
        {/* V3.5 Core Landing Page Sections */}
        <Hero 
          dict={dict} 
          locale={locale} 
          isRTL={isRTL} 
          variant={flags.flag_engine_ai_pricing ? "B" : "A"}
        />

        <Suspense fallback={<SectionSkeleton />}>
          <Categories dict={dict} locale={locale} isRTL={isRTL} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Trust dict={dict} locale={locale} isRTL={isRTL} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Comparison dict={dict} locale={locale} isRTL={isRTL} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <ReportPreview dict={dict} locale={locale} isRTL={isRTL} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FAQ dict={dict} locale={locale} isRTL={isRTL} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CTA 
            dict={dict} 
            locale={locale} 
            isRTL={isRTL} 
            pricing={{
              everyday: everydayPricing,
              highValue: highValuePricing,
              project: projectPricing,
            }}
          />
        </Suspense>
      </main>

      {isRecruitmentActive && (
        <section style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03))',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '60px 24px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <span style={{
              background: 'rgba(139,92,246,0.15)',
              color: '#a5b4fc',
              border: '1px solid rgba(139,92,246,0.3)',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'inline-block',
              marginBottom: 16
            }}>
              {isRTL ? 'فرص عمل للشركاء والمناديب' : 'Partners & Scouts Opportunities'}
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: 12 }}>
              {isRTL ? 'انضم لشبكة مناديب وموردي فايندورا 💰' : 'Join Findora Sourcing Network & Earn'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: 24, lineHeight: 1.6 }}>
              {isRTL 
                ? `باب التسجيل مفتوح الآن لفترة محدودة! متبقي فقط ${recruitmentAvailability.open_slots} مكان معتمد للانضمام كمناديب ميدان أو شركاء معارض والبدء في كسب عمولات على الصفقات.`
                : `Sourcing slots are open for a limited time! Only ${recruitmentAvailability.open_slots} spots remaining to join as field scouts or store partners and earn commissions.`}
            </p>
            <Link
              href={`/${locale}/contributors`}
              style={{
                display: 'inline-block',
                background: 'hsl(258,89%,66%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '12px 28px',
                borderRadius: '999px',
                boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                transition: 'all 0.2s'
              }}
            >
              {isRTL ? 'ابدأ كسب الأرباح معنا' : 'Start Earning With Us'}
            </Link>
          </div>
        </section>
      )}

      {/* Enterprise Localized Footer */}
      <Footer dict={dict} locale={locale} isRTL={isRTL} />

      {/* JSON-LD SEO Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}