// src/components/HeaderLogo.tsx

"use client";

import Image from "next/image";
import Link from "next/link";

type HeaderLogoProps = {
  locale: string;
  href?: string;
  ariaLabel?: string;
  onClick?: () => void;
};

export default function HeaderLogo({
  locale,
  href,
  ariaLabel = "Findora Home",
  onClick,
}: HeaderLogoProps) {
  const finalHref = href || `/${locale}#home`;

  return (
    <>
      <Link
        href={finalHref}
        className="logo-link"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <Image
          src="/logo-2-processed.png"
          alt="Findora"
          width={300}
          height={200}
          priority
          className="logo-img"
        />
      </Link>

      <style jsx>{`
        .logo-link {
          width: 160px;
          min-width: 160px;
          max-width: 160px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          flex-shrink: 0;
          overflow: visible;
          text-decoration: none !important;
        }

        .logo-img {
          display: block;
          width: auto;
          height: auto;
          max-width: 160px;
          max-height: 44px;
          object-fit: contain;
          object-position: left center;
          filter: drop-shadow(0 0 14px rgba(212, 166, 60, 0.28));
        }

        @media (max-width: 1080px) {
          .logo-link {
            width: 140px;
            min-width: 140px;
            max-width: 140px;
            height: 44px;
          }

          .logo-img {
            max-width: 140px;
            max-height: 40px;
          }
        }

        @media (max-width: 760px) {
          .logo-link {
            width: 120px;
            min-width: 120px;
            max-width: 120px;
            height: 40px;
          }

          .logo-img {
            max-width: 120px;
            max-height: 36px;
          }
        }

        @media (max-width: 420px) {
          .logo-link {
            width: 100px;
            min-width: 100px;
            max-width: 100px;
          }

          .logo-img {
            max-width: 100px;
            max-height: 32px;
          }
        }
      `}</style>
    </>
  );
}