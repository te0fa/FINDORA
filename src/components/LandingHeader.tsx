"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";
import { Locale } from "@/lib/i18n/config";
type Props = {
  locale: string;
  isRTL: boolean;
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
const DESKTOP_NAV_BREAKPOINT = 1240;
const DESKTOP_ACTIONS_BREAKPOINT = 920;
export default function LandingHeader({ locale, isRTL, labels }: Props) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sectionLinks = useMemo(
    () => [

      { href: `/${locale}#home`, label: labels.home },

      { href: `/${locale}#how`, label: labels.how },

      { href: `/${locale}#why`, label: labels.why },

      { href: `/${locale}#categories`, label: labels.categories },

      { href: `/${locale}#flow`, label: labels.flow },

      { href: `/${locale}#pricing`, label: labels.pricing },

      { href: `/${locale}#faq`, label: labels.faq },

    ],

    [locale, labels]

  );
  const closeMenu = () => setIsMobileMenuOpen(false);
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

          >

            {sectionLinks.map((item) => (

              <Link

                key={item.href}

                href={item.href}

                className="section-link"

                onClick={closeMenu}

              >

                {item.label}

              </Link>

            ))}

          </nav>

        </div>



        <div className="actions-shell">

          <div className="desktop-actions" data-testid="landing-desktop-actions">

            <div className="deals-group">

              <Link href={`/${locale}/deals`} className="action-deals" aria-label={labels.deals} data-testid="landing-deals-cta">

                <span className="deals-gem" aria-hidden="true">💎</span>

                <span className="deals-label">{labels.deals}</span>

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



          <div className="mobile-links-grid">

            {sectionLinks.map((item) => (

              <Link

                key={item.href}

                href={item.href}

                className="mobile-link"

                onClick={closeMenu}

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



        <div className="mobile-language">

          <HeaderLocaleDropdown currentLocale={locale as Locale} />

        </div>

      </div>



      <style jsx>{`

    .landing-header {

      position: fixed;

      inset: 0 0 auto 0;

      z-index: 1000;

      height: 96px;

      display: flex;

      align-items: center;

      background:

        linear-gradient(

          180deg,

          rgba(2, 6, 23, 0.94),

          rgba(2, 6, 23, 0.78)

        );

      border-bottom: 1px solid rgba(255, 255, 255, 0.07);

      backdrop-filter: blur(24px);

      -webkit-backdrop-filter: blur(24px);

      transition:

        height 0.22s ease,

        background 0.22s ease,

        box-shadow 0.22s ease,

        border-color 0.22s ease;

    }



    .landing-header.is-scrolled {

      height: 84px;

      background: rgba(2, 6, 23, 0.96);

      border-bottom-color: rgba(255, 255, 255, 0.11);

      box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32);

    }



    .landing-header-inner {

      width: 100%;

      max-width: 1520px;

      margin: 0 auto;

      padding: 0 28px;

      display: grid;

      grid-template-columns: 180px minmax(520px, 1fr) auto;

      align-items: center;

      gap: 22px;

      box-sizing: border-box;

      direction: ltr !important;

    }



    .logo-shell {

      flex: 0 0 auto;

      display: flex;

      align-items: center;

      width: 180px;

      min-width: 180px;

      justify-content: flex-start;

      overflow: visible;

      margin-left: -2cm; /* Shifting 1cm to the left as requested */

    }



    .logo-shell :global(.logo-link) {

      width: 100% !important;

      min-width: unset !important;

    }



    .nav-shell {

      display: flex;

      justify-content: center;

      min-width: 0;

    }



    .section-nav {

      display: flex;

      align-items: center;

      justify-content: center;

      gap: 6px;

      padding: 8px 10px;

      border-radius: 999px;

      background: rgba(255, 255, 255, 0.05);

      border: 1px solid rgba(255, 255, 255, 0.1);

      white-space: nowrap;

      overflow: hidden;

    }



    .section-link,

    .section-link:link,

    .section-link:visited {

      display: inline-flex;

      align-items: center;

      justify-content: center;

      min-height: 38px;

      padding: 0 11px;

      border-radius: 999px;

      color: rgba(226, 232, 240, 0.76) !important;

      text-decoration: none !important;

      font-size: 0.82rem;

      font-weight: 800;

      white-space: nowrap !important;

      line-height: 1 !important;

      text-align: center;

      transition: all 0.2s ease;

    }



    .section-link:hover {

      color: #ffffff !important;

      background: rgba(255, 255, 255, 0.09);

      transform: translateY(-1px);

    }



    .actions-shell {

      display: flex;

      align-items: center;

      gap: 16px;

      justify-content: flex-end;

      min-width: 0;

    }



    .desktop-actions {

      display: flex;

      align-items: center;

      gap: 14px;

      min-width: 0;

      white-space: nowrap;

    }



    .desktop-actions a,

    .desktop-actions a:link,

    .desktop-actions a:visited,

    .desktop-actions a:hover,

    .desktop-actions a:active,

    .landing-header a,

    .landing-header a:link,

    .landing-header a:visited,

    .landing-header a:hover,

    .landing-header a:active {

      text-decoration: none !important;

    }



    .deals-group,

    .request-group,

    .auth-group {

      display: flex;

      align-items: center;

      gap: 8px;

      flex: 0 0 auto;

      white-space: nowrap;

    }



    .actions-divider {

      width: 2px;

      height: 34px;

      flex: 0 0 2px;

      border-radius: 999px;

      background:

        linear-gradient(

          180deg,

          transparent 0%,

          rgba(148, 163, 184, 0.2) 16%,

          rgba(226, 232, 240, 0.42) 50%,

          rgba(148, 163, 184, 0.2) 84%,

          transparent 100%

        );

      box-shadow: 0 0 10px rgba(148, 163, 184, 0.16);

    }



    .action-deals,

    .action-deals:link,

    .action-deals:visited,

    .action-deals:hover,

    .action-deals:active {

      min-height: 44px;

      display: inline-flex;

      align-items: center;

      justify-content: center;

      gap: 12px;

      padding: 0 28px;

      border-radius: 999px;

      position: relative;

      isolation: isolate;

      overflow: hidden;

      text-decoration: none !important;

      color: #f8f8ff !important; /* Pearl White */

      font-size: 0.9rem;

      font-weight: 950;

      line-height: 1 !important;

      white-space: nowrap !important;

      vertical-align: middle;

      background:

        radial-gradient(circle at 18% 18%, rgba(255,255,255,0.15), transparent 25%),

        linear-gradient(135deg, #2d1e02 0%, #7c4a03 35%, #b8860b 70%, #d4a63c 100%) !important;

      border: 1.5px solid rgba(212, 166, 60, 0.6) !important;

      box-shadow:

        0 0 0 1px rgba(255, 255, 255, 0.08),

        0 0 24px rgba(0, 0, 0, 0.4),

        0 8px 30px rgba(0, 0, 0, 0.4),

        inset 0 1px 0 rgba(255, 255, 255, 0.15);

      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);

      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);

    }



    .action-deals::before {

      content: "";

      position: absolute;

      inset: 0;

      background: linear-gradient(

        90deg,

        transparent,

        rgba(255, 255, 255, 0.12),

        transparent

      );

      transform: translateX(-100%) skewX(-15deg);

      transition: transform 0.6s ease;

    }



    .action-deals::after {

      content: "";

      position: absolute;

      inset: -15px;

      z-index: -2;

      border-radius: inherit;

      background: radial-gradient(circle, rgba(212, 166, 60, 0.22) 0%, transparent 70%);

      filter: blur(12px);

      opacity: 0.6;

    }



    .action-deals:hover {

      transform: translateY(-1.5px) scale(1.02);

      border-color: rgba(255, 232, 150, 0.8) !important;

      box-shadow:

        0 0 0 1px rgba(255, 255, 255, 0.12),

        0 0 35px rgba(212, 166, 60, 0.35),

        0 12px 40px rgba(0, 0, 0, 0.5);

    }



    .action-deals:hover::before {

      transform: translateX(100%) skewX(-15deg);

    }



    .deals-gem {

      display: inline-flex;

      align-items: center;

      justify-content: center;

      font-size: 1.25rem;

      line-height: 1;

      filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));

    }



    .deals-label {

      display: inline-flex;

      align-items: center;

      justify-content: center;

      color: #f8f8ff !important; /* Pearl White */

      font-weight: 950;

      line-height: 1 !important;

      white-space: nowrap;

      letter-spacing: 0.02em;

    }



    .action-deals *,

    .action-deals,

    .action-deals:link,

    .action-deals:visited {

      text-decoration: none !important;

      text-decoration-line: none !important;

    }



    .desktop-actions .action-deals {

      color: #111827 !important;

    }



    .action-track,

    .action-primary {

      min-height: 42px;

      display: inline-flex;

      align-items: center;

      justify-content: center;

      padding: 0 15px;

      border-radius: 999px;

      font-size: 0.82rem;

      font-weight: 850;

      line-height: 1 !important;

      white-space: nowrap !important;

      text-decoration: none !important;

      transition: all 0.2s ease;

    }



    .action-track,

    .action-track:link,

    .action-track:visited {

      color: #dbeafe !important;

      background:

        linear-gradient(135deg, rgba(37, 99, 235, 0.26), rgba(29, 78, 216, 0.14)) !important;

      border: 1px solid rgba(96, 165, 250, 0.48) !important;

      box-shadow:

        0 0 0 1px rgba(96, 165, 250, 0.08),

        0 10px 24px rgba(37, 99, 235, 0.16),

        inset 0 1px 0 rgba(255, 255, 255, 0.1);

    }



    .action-track:hover {

      color: #ffffff !important;

      background:

        linear-gradient(135deg, rgba(59, 130, 246, 0.34), rgba(37, 99, 235, 0.2) !important);

      border-color: rgba(147, 197, 253, 0.72) !important;

      box-shadow:

        0 0 0 1px rgba(147, 197, 253, 0.12),

        0 14px 30px rgba(37, 99, 235, 0.24),

        inset 0 1px 0 rgba(255, 255, 255, 0.14);

      transform: translateY(-1px);

    }



    .action-primary,

    .action-primary:link,

    .action-primary:visited {

      color: #ffffff !important;

      background:

        linear-gradient(135deg, #60a5fa 0%, #2563eb 48%, #1d4ed8 100%) !important;

      border: 1px solid rgba(147, 197, 253, 0.74) !important;

      box-shadow:

        0 0 0 1px rgba(147, 197, 253, 0.12),

        0 12px 28px rgba(37, 99, 235, 0.28),

        inset 0 1px 0 rgba(255, 255, 255, 0.2);

    }



    .action-primary:hover {

      color: #ffffff !important;

      background:

        linear-gradient(135deg, #93c5fd 0%, #3b82f6 46%, #1d4ed8 100%) !important;

      border-color: rgba(191, 219, 254, 0.9) !important;

      box-shadow:

        0 0 0 1px rgba(191, 219, 254, 0.18),

        0 16px 34px rgba(37, 99, 235, 0.34),

        inset 0 1px 0 rgba(255, 255, 255, 0.24);

      transform: translateY(-1px);

    }



    .auth-group {

      display: flex;

      align-items: center;

      gap: 12px;

      flex-shrink: 0;

    }



    .action-login,

    .action-outline {

      min-height: 40px;

      display: inline-flex;

      align-items: center;

      justify-content: center;

      border-radius: 999px;

      font-size: 0.82rem;

      font-weight: 800;

      line-height: 1 !important;

      white-space: nowrap !important;

      text-decoration: none !important;

      transition: all 0.2s ease;

    }



    .action-login,

    .action-login:link,

    .action-login:visited {

      color: rgba(226, 232, 240, 0.88) !important;

      font-weight: 850;

      text-decoration: none !important;

    }



    .action-login:hover {

      color: #ffffff !important;

    }



    .action-outline,

    .action-outline:link,

    .action-outline:visited {

      color: #f8fafc !important;

      background: rgba(255, 255, 255, 0.085) !important;

      border: 1px solid rgba(255, 255, 255, 0.24) !important;

      box-shadow:

        inset 0 1px 0 rgba(255, 255, 255, 0.08),

        0 8px 20px rgba(0, 0, 0, 0.12);

      text-decoration: none !important;

    }



    .action-outline:hover {

      color: #ffffff !important;

      background: rgba(255, 255, 255, 0.13) !important;

      border-color: rgba(255, 255, 255, 0.36) !important;

      transform: translateY(-1px);

    }



    .action-outline:hover {

      background: rgba(255, 255, 255, 0.08) !important;

      border-color: rgba(255, 255, 255, 0.22) !important;

    }



    .locale-shell {

      display: flex;

      align-items: center;

      margin-right: -1.5cm;

    }



    .mobile-toggle {

      display: none;

      flex-direction: column;

      gap: 5px;

      background: none;

      border: none;

      cursor: pointer;

      padding: 8px;

      z-index: 1200;

    }



    .mobile-toggle span {

      display: block;

      width: 24px;

      height: 2px;

      background: #fff;

      transition: all 0.3s ease;

    }



    .mobile-toggle.is-open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }

    .mobile-toggle.is-open span:nth-child(2) { opacity: 0; }

    .mobile-toggle.is-open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }



    .mobile-popover {

      position: fixed;

      top: 92px;

      width: min(380px, calc(100vw - 28px));

      max-height: calc(100vh - 112px);

      overflow-y: auto;

      padding: 20px;

      border-radius: 24px;

      background: linear-gradient(145deg, #0f172a, #020617);

      border: 1px solid rgba(255, 255, 255, 0.12);

      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);

      opacity: 0;

      visibility: hidden;

      transform: translateY(-10px);

      transition: all 0.2s ease;

      z-index: 1100;

    }



    .is-ltr .mobile-popover { right: 14px; }

    .is-rtl .mobile-popover { left: 14px; }



    .mobile-popover.is-open {

      opacity: 1;

      visibility: visible;

      transform: translateY(0);

    }



    .mobile-menu-head {

      display: flex;

      align-items: center;

      justify-content: space-between;

      margin-bottom: 18px;

      color: #fff;

      font-weight: 900;

    }



    .mobile-menu-head button {

      width: 32px;

      height: 32px;

      border-radius: 50%;

      border: 1px solid rgba(255, 255, 255, 0.1);

      background: rgba(255, 255, 255, 0.05);

      color: #fff;

      font-size: 1.2rem;

      cursor: pointer;

    }



    .mobile-section { display: flex; flex-direction: column; gap: 12px; }

    .mobile-title {

      color: rgba(255, 255, 255, 0.4);

      font-size: 0.7rem;

      font-weight: 900;

      text-transform: uppercase;

      letter-spacing: 0.1em;

    }



    .mobile-links-grid {

      display: grid;

      grid-template-columns: 1fr 1fr;

      gap: 10px;

    }



    .mobile-link {

      display: flex;

      align-items: center;

      min-height: 44px;

      padding: 0 14px;

      border-radius: 12px;

      background: rgba(255, 255, 255, 0.04);

      color: #fff !important;

      font-size: 0.9rem;

      font-weight: 700;

      text-decoration: none !important;

      transition: all 0.2s ease;

    }



    .mobile-link:hover {

      background: rgba(255, 255, 255, 0.08);

    }



    .mobile-link.active {

      background: rgba(212, 166, 60, 0.15);

      border: 1px solid rgba(212, 166, 60, 0.3);

      color: var(--accent) !important;

    }



    .mobile-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }



    .mobile-auth { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 16px; 
      margin-top: 4px;
    }



    .mobile-separator {

      height: 1px;

      background: rgba(255, 255, 255, 0.1);

      margin: 16px 0;

    }



    .mobile-cta-stack { display: grid; gap: 10px; }

    .mobile-primary {

      display: flex;

      align-items: center;

      justify-content: center;

      min-height: 50px;

      border-radius: 14px;

      background: linear-gradient(135deg, #ffe68a, #d4a63c);

      color: #111827 !important;

      font-weight: 900;

      text-decoration: none !important;

    }



    .mobile-secondary {

      display: flex;

      align-items: center;

      justify-content: center;

      min-height: 50px;

      border-radius: 14px;

      background: rgba(255, 255, 255, 0.06);

      border: 1px solid rgba(255, 255, 255, 0.1);

      color: #fff !important;

      font-weight: 900;

      text-decoration: none !important;

    }



    .mobile-login, .mobile-outline {

      display: flex;

      align-items: center;

      justify-content: center;

      min-height: 44px;

      border-radius: 12px;

      font-weight: 800;

      text-decoration: none !important;

    }

    .mobile-login { background: rgba(255, 255, 255, 0.04); color: #ccc !important; }

    .mobile-outline { border: 1px solid rgba(255, 255, 255, 0.15); color: #fff !important; }



    .mobile-language { display: flex; justify-content: center; margin-top: 8px; }



    @media (max-width: 1450px) {

      .nav-shell {

        display: none;

      }

      .mobile-toggle {

        display: flex;

      }

      .landing-header-inner {

        grid-template-columns: 230px 1fr auto;

      }

    }



    @media (max-width: 1180px) {

      .auth-group,

      .desktop-actions .actions-divider:last-of-type {

        display: none;

      }

      .action-deals {

        min-height: 42px;

        padding-inline: 16px;

        font-size: 0.8rem;

        gap: 8px;

      }

      .deals-gem {

        width: 22px;

        height: 22px;

        flex-basis: 22px;

        font-size: 0.95rem;

      }

    }



    @media (max-width: 760px) {

      .desktop-actions {

        display: none;

      }

    }



    @media (max-width: 640px) {

      .landing-header { height: 80px; }

      .landing-header-inner {

        padding: 0 16px;

        grid-template-columns: 150px 1fr;

        gap: 10px;

      }

      .logo-shell { width: 150px; min-width: 150px; margin-left: 0 !important; }

      .locale-shell { display: none; }

      .mobile-popover { top: 76px; width: calc(100vw - 24px); }

      .mobile-links-grid { grid-template-columns: 1fr; }

    }



    .mobile-deals-cta,
    .mobile-deals-cta:link,
    .mobile-deals-cta:visited {
      min-height: 62px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 12px 0;
      border-radius: 18px;
      background: linear-gradient(135deg, #fff9db, #d4a63c);
      color: #020617 !important;
      font-weight: 950;
      font-size: 1.15rem;
      text-decoration: none !important;
      box-shadow: 0 8px 24px rgba(212, 166, 60, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .mobile-deals-cta:active {
      transform: scale(0.98);
    }



  `}</style>

    </header>

  );
}