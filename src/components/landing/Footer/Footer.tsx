import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

interface FooterProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

/**
 * Enterprise Component Contract: Sourcing Footer Component
 * Purpose: Administrative transparency, navigation fallback indices, localized legal paths.
 * Props Interface: FooterProps
 * States: Server rendered layout
 * Accessibility: WCAG 2.2 AA compliant, screen-reader focus targets
 * Analytics: Footer link clicks
 * Reusability: Global application footer layout
 */
export default function Footer({ dict, locale, isRTL }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const labels = {
    about: isRTL ? "عن فايندورا" : "About Findora",
    aboutDesc: isRTL
      ? "فايندورا هي منصة البحث والتوريد الذكي في مصر. نساعد الأفراد والشركات في الوصول لأفضل الصفقات وعروض الأسعار والضمانات محلياً."
      : "Findora is Egypt's smart sourcing & procurement platform. We help buyers secure optimal prices, warranties, and verified suppliers.",
    services: isRTL ? "الخدمات" : "Services",
    howItWorks: isRTL ? "كيف نعمل" : "How It Works",
    pricing: isRTL ? "الأسعار" : "Pricing",
    vendorPortal: isRTL ? "بوابة الموردين" : "Vendor Portal",
    scoutNetwork: isRTL ? "شبكة المناديب" : "Scout Network",
    legal: isRTL ? "الضوابط القانونية" : "Legal",
    privacy: isRTL ? "سياسة الخصوصية" : "Privacy Policy",
    terms: isRTL ? "شروط الخدمة" : "Terms of Service",
    refund: isRTL ? "سياسة الاسترجاع" : "Refund Policy",
    contact: isRTL ? "اتصل بنا" : "Contact",
    careers: isRTL ? "الوظائف" : "Careers",
    blog: isRTL ? "المدونة" : "Blog",
    auction: isRTL ? "المزاد" : "Auction",
    copyright: isRTL
      ? `© ${currentYear} فايندورا. جميع الحقوق محفوظة.`
      : `© ${currentYear} Findora. All rights reserved.`,
  };

  return (
    <footer className={styles.footer} aria-label="Findora Footer">
      <div className={styles.container}>
        {/* Brand column */}
        <div className={styles.brandCol}>
          <Image
            src="/logo-2-processed.png"
            alt="Findora"
            width={120}
            height={84}
            className={styles.logo}
            priority={false}
          />
          <p className={styles.brandDesc}>{labels.aboutDesc}</p>
        </div>

        {/* Company column */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>{isRTL ? "الشركة" : "Company"}</h4>
          <ul className={styles.linksList}>
            <li className={styles.linkItem}>
              <Link href={`/${locale}#home`}>{isRTL ? "الرئيسية" : "Home"}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}#how`}>{labels.howItWorks}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}#pricing`}>{labels.pricing}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/blog`}>{labels.blog}</Link>
            </li>
          </ul>
        </div>

        {/* Services column */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>{labels.services}</h4>
          <ul className={styles.linksList}>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/services/coming-soon`}>{labels.vendorPortal}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/contributors`}>{labels.scoutNetwork}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/services/coming-soon`}>{labels.careers}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/services/coming-soon`}>{labels.auction}</Link>
            </li>
          </ul>
        </div>

        {/* Legal & Contacts column */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>{labels.legal}</h4>
          <ul className={styles.linksList}>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/legal#privacy`}>{labels.privacy}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/legal#terms`}>{labels.terms}</Link>
            </li>
            <li className={styles.linkItem}>
              <Link href={`/${locale}/legal#refund`}>{labels.refund}</Link>
            </li>
            <li className={styles.linkItem} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--space-8)" }}>
              <span>✉ info@findora.app</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar: Copyright and Socials */}
      <div className={styles.bottomBar}>
        <span className={styles.copyright}>{labels.copyright}</span>
        
        <div className={styles.socialLinks} aria-label="Social Media">
          <Link href="https://facebook.com/findora.app" className={styles.socialIcon} target="_blank" rel="noopener noreferrer">
            FB
          </Link>
          <Link href="https://twitter.com/findora_app" className={styles.socialIcon} target="_blank" rel="noopener noreferrer">
            TW
          </Link>
          <Link href="https://linkedin.com/company/findora" className={styles.socialIcon} target="_blank" rel="noopener noreferrer">
            LN
          </Link>
        </div>
      </div>
    </footer>
  );
}
export { Footer };
