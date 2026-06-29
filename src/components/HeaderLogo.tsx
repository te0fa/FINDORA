// src/components/HeaderLogo.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import './HeaderLogo.css';

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
  );
}