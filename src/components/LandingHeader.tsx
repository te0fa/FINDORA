"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";
import { Locale } from "@/lib/i18n/config";
import './LandingHeader.css';
type Props = {
  locale: string;
  isRTL: boolean;
  isRecruitmentActive?: boolean;
  labels: {
    home: string;
    how: string;
    why: string;
    categories: string;
    flow: string;
    pricing: string;
    faq: string;
    deals: string;
    start: string;
    track: string;
    login: string;
    signup: string;
  };
};
const DESKTOP_NAV_BREAKPOINT = 1120;
const DESKTOP_ACTIONS_BREAKPOINT = 920;
export default function LandingHeader({ locale, isRTL, labels, isRecruitmentActive = false }: Props) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sectionLinks = useMemo(
    () => {
      const base = [
        // Top 4 links
        { href: `/${locale}#home`, label: labels.home },
        { href: `/${locale}#how`, label: labels.how },
        { href: `/${locale}#pricing`, label: labels.pricing },
        { href: `/${locale}#faq`, label: labels.faq },
        // Dropdown links
        { href: `/${locale}#trust-framework`, label: labels.why },
        { href: `/${locale}#categories`, label: labels.categories },
        { href: `/${locale}#flow`, label: labels.flow },
      ];
      if (isRecruitmentActive) {
        base.push({ href: `/${locale}/contributors`, label: isRTL ? "اشتغل معانا 💰" : "Work With Us 💰" });
      }
      return base;
    },
    [locale, labels, isRecruitmentActive, isRTL]
  );
  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    setMoreOpen(false);
  };
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.includes("#")) {
      const parts = href.split("#");
      const id = parts[parts.length - 1];
      const element = document.getElementById(id);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        closeMenu();
      }
    }
  };
  useEffect(() => {
    const onScroll = () => {

      setIsScrolled(window.scrollY > 10);

    };



    const onResize = () => {

      if (window.innerWidth > DESKTOP_NAV_BREAKPOINT) {

        setIsMobileMenuOpen(false);

      }

    };



    const onKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setIsMobileMenuOpen(false);

      }

    };



    const onClickOutside = (event: MouseEvent) => {

      const target = event.target as Node;



      if (

        isMobileMenuOpen &&

        menuRef.current &&

        !menuRef.current.contains(target) &&

        toggleRef.current &&

        !toggleRef.current.contains(target)

      ) {

        setIsMobileMenuOpen(false);

      }

    };



    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("resize", onResize);

    window.addEventListener("keydown", onKeyDown);

    document.addEventListener("mousedown", onClickOutside);



    onScroll();

    onResize();



    return () => {

      window.removeEventListener("scroll", onScroll);

      window.removeEventListener("resize", onResize);

      window.removeEventListener("keydown", onKeyDown);

      document.removeEventListener("mousedown", onClickOutside);

    };

  }, [isMobileMenuOpen]);
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";



    return () => {

      document.body.style.overflow = "";

    };

  }, [isMobileMenuOpen]);
  return (
    <header

      className={`landing-header ${isScrolled ? "is-scrolled" : ""} ${isRTL ? "is-rtl" : "is-ltr"

        }`}

      data-testid="landing-header"

    >

      <div className="landing-header-inner">

        <div className="logo-shell" data-testid="landing-header-logo">

          <HeaderLogo locale={locale} onClick={closeMenu} />

        </div>



        <div className="nav-shell">

          <nav
            className="section-nav"

            dir={isRTL ? "rtl" : "ltr"}

            aria-label={isRTL ? "أقسام الصفحة" : "Landing sections"}

            data-testid="landing-section-nav"
            suppressHydrationWarning
          >

            {/* Top 4 Items */}
            {sectionLinks.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="section-link"
                onClick={(e) => handleLinkClick(e, item.href)}
              >
                {item.label}
              </Link>
            ))}

            {/* More Dropdown */}
            {sectionLinks.length > 4 && (
              <div 
                className="nav-more-dropdown" 
                onMouseEnter={() => setMoreOpen(true)} 
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button className="section-link more-trigger">
                  {isRTL ? "المزيد ▾" : "More ▾"}
                </button>
                {moreOpen && (
                  <div className="more-menu">
                    {sectionLinks.slice(4).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="more-link"
                        onClick={(e) => handleLinkClick(e, item.href)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

        </div>



        <div className="actions-shell">

          <div className="desktop-actions" data-testid="landing-desktop-actions">

            <div className="deals-group">
              <Link href={`/${locale}/deals`} className="action-deals" aria-label={labels.deals} data-testid="landing-deals-cta">
                <div className="deals-main">
                  <span className="deals-gem" aria-hidden="true">💎</span>
                  <div className="deals-text-wrapper">
                    <span className="deals-label">{labels.deals}</span>
                    <span className="deals-coming-soon">{isRTL ? 'قريباً' : 'Coming Soon'}</span>
                  </div>
                </div>
              </Link>
            </div>



            <div className="actions-divider" aria-hidden="true" />



            <div className="request-group">

              <Link href={`/${locale}/track-request`} className="action-track">

                {labels.track}

              </Link>



              <Link href={`/${locale}/start-request`} className="action-primary">

                {labels.start}

              </Link>

            </div>



            <div className="actions-divider" aria-hidden="true" />



            <div className="auth-group">

              <Link href={`/${locale}/auth/login`} className="action-login">

                {labels.login}

              </Link>



              <Link href={`/${locale}/auth/signup`} className="action-outline">

                {labels.signup}

              </Link>

            </div>

          </div>



          <div className="locale-shell">

            <HeaderLocaleDropdown currentLocale={locale as Locale} />

          </div>



          <button

            ref={toggleRef}

            type="button"

            className={`mobile-toggle ${isMobileMenuOpen ? "is-open" : ""}`}

            aria-label={isRTL ? "فتح القائمة" : "Open menu"}

            aria-expanded={isMobileMenuOpen}

            onClick={() => setIsMobileMenuOpen((prev) => !prev)}

            data-testid="landing-mobile-menu-toggle"

          >

            <span />

            <span />

            <span />

          </button>

        </div>

      </div>



      <div

        ref={menuRef}

        className={`mobile-popover ${isMobileMenuOpen ? "is-open" : ""}`}

        dir={isRTL ? "rtl" : "ltr"}

        data-testid="landing-mobile-menu"

      >

        <div className="mobile-menu-head">

          <span>{isRTL ? "القائمة" : "Menu"}</span>

          <button type="button" onClick={closeMenu} aria-label="Close menu">

            ×

          </button>

        </div>



        <Link
          href={`/${locale}/deals`}
          className="mobile-deals-cta"
          onClick={closeMenu}
          data-testid="landing-mobile-deals-cta"
        >
          <span aria-hidden="true">💎</span>
          <span>{labels.deals}</span>
        </Link>

        <div className="mobile-separator" />



        <div className="mobile-section">

          <div className="mobile-title">{isRTL ? "أقسام الصفحة" : "Sections"}</div>



          <div className="mobile-links-grid" suppressHydrationWarning>

            {sectionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-link"
                onClick={(e) => handleLinkClick(e, item.href)}
              >
                {item.label}
              </Link>

            ))}

          </div>

        </div>



        <div className="mobile-separator" />



        <div className="mobile-section">

          <div className="mobile-title">{isRTL ? "الطلبات" : "Requests"}</div>



          <div className="mobile-cta-stack">

            <Link

              href={`/${locale}/start-request`}

              className="mobile-primary"

              onClick={closeMenu}

            >

              {labels.start}

            </Link>



            <Link

              href={`/${locale}/track-request`}

              className="mobile-secondary"

              onClick={closeMenu}

            >

              {labels.track}

            </Link>

          </div>

        </div>



        <div className="mobile-separator" />



        <div className="mobile-section">

          <div className="mobile-title">{isRTL ? "الحساب" : "Account"}</div>



          <div className="mobile-auth">

            <Link

              href={`/${locale}/auth/login`}

              className="mobile-login"

              onClick={closeMenu}

            >

              {labels.login}

            </Link>



            <Link

              href={`/${locale}/auth/signup`}

              className="mobile-outline"

              onClick={closeMenu}

            >

              {labels.signup}

            </Link>

          </div>

        </div>



        <div className="mobile-separator" />

        <div className="mobile-language" style={{ display: 'flex', gap: 12, width: '100%', padding: '0 8px', marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              const segments = window.location.pathname.split("/");
              if (segments[1] === "en" || segments[1] === "ar") {
                segments[1] = "ar";
              } else {
                segments.splice(1, 0, "ar");
              }
              const hash = window.location.hash || "";
              router.push(segments.join("/") + hash);
              closeMenu();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: locale === 'ar' ? '1px solid hsl(258,89%,66%)' : '1px solid rgba(255,255,255,0.1)',
              background: locale === 'ar' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
              color: locale === 'ar' ? 'hsl(258,89%,75%)' : 'rgba(255,255,255,0.6)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => {
              const segments = window.location.pathname.split("/");
              if (segments[1] === "en" || segments[1] === "ar") {
                segments[1] = "en";
              } else {
                segments.splice(1, 0, "en");
              }
              const hash = window.location.hash || "";
              router.push(segments.join("/") + hash);
              closeMenu();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: locale === 'en' ? '1px solid hsl(258,89%,66%)' : '1px solid rgba(255,255,255,0.1)',
              background: locale === 'en' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
              color: locale === 'en' ? 'hsl(258,89%,75%)' : 'rgba(255,255,255,0.6)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            English
          </button>
        </div>

      </div>

    </header>

  );
}
