"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";
import { Locale } from "@/lib/i18n/config";

type Props = {
  locale: string;
};

export default function RequestHeader({ locale }: Props) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`request-header ${isScrolled ? "scrolled" : ""}`}>
      <div className="header-inner">
        <HeaderLogo locale={locale} href={`/${locale}`} />

        <div className="right-side">
          <HeaderLocaleDropdown currentLocale={locale as Locale} />
        </div>
      </div>

      <style jsx>{`
        .request-header {
          position: fixed;
          top: 20px;
          inset-inline-start: 20px;
          inset-inline-end: 20px;
          width: auto;
          max-width: calc(100vw - 40px);
          z-index: 1000;
          height: 100px;
          display: flex;
          align-items: center;
          background: rgba(2, 6, 23, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 24px;
          transition: all 0.25s ease;
        }

        .request-header.scrolled {
          background: rgba(2, 6, 23, 0.96);
          border-color: rgba(212, 166, 60, 0.3);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
          top: 12px;
        }

        .header-inner {
          width: 100%;
          max-width: calc(100vw - 40px);
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          direction: ltr;
          box-sizing: border-box;
          overflow: visible;
        }

        .right-side {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          max-width: max-content;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .request-header {
            top: 10px;
            inset-inline-start: 10px;
            inset-inline-end: 10px;
            max-width: calc(100vw - 20px);
            height: 80px;
          }
          .header-inner {
            padding: 0 16px;
            max-width: calc(100vw - 20px);
          }
        }
      `}</style>
    </header>
  );
}
