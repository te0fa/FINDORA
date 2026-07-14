import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";
import { createClient } from "@/lib/supabase/server";

interface FooterProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

export default async function Footer({ dict, locale, isRTL }: FooterProps) {
  const currentYear = new Date().getFullYear();

  // 1. Fetch site configurations from DB with server client
  let settings = {
    email: 'info@findora.app',
    facebook_url: 'https://facebook.com/findora.app',
    facebook_enabled: true,
    twitter_url: 'https://twitter.com/findora_app',
    twitter_enabled: true,
    linkedin_url: 'https://linkedin.com/company/findora',
    linkedin_enabled: true,
    whatsapp_number: '201000000000',
    whatsapp_enabled: true,
  };

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('economy_config')
      .select('value')
      .eq('config_key', 'site_contact_settings')
      .maybeSingle();

    if (data?.value) {
      settings = { ...settings, ...(data.value as any) };
    }
  } catch (err) {
    console.warn("Failed to fetch footer site contact settings:", err);
  }

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
            src="/logo-v6.png"
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
            {settings.email && (
              <li className={styles.linkItem} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--space-8)" }}>
                <a href={`mailto:${settings.email}`} className={styles.emailLink}>
                  ✉ {settings.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Bar: Copyright and Socials */}
      <div className={styles.bottomBar}>
        <span className={styles.copyright}>{labels.copyright}</span>
        
        <div className={styles.socialLinks} aria-label="Social Media">
          {settings.facebook_enabled && settings.facebook_url && (
            <Link href={settings.facebook_url} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg">
                <path d="M400 32H48A48 48 0 0 0 0 80v352a48 48 0 0 0 48 48h137.25V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.27c-30.81 0-40.43 19.12-40.43 38.73V256h68.78l-11 71.69h-57.78V480H400a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48z" />
              </svg>
            </Link>
          )}
          {settings.twitter_enabled && settings.twitter_url && (
            <Link href={settings.twitter_url} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg">
                <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
              </svg>
            </Link>
          )}
          {settings.linkedin_enabled && settings.linkedin_url && (
            <Link href={settings.linkedin_url} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg">
                <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z" />
              </svg>
            </Link>
          )}
          {settings.whatsapp_enabled && settings.whatsapp_number && (
            <Link href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
export { Footer };
