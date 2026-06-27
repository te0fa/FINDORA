"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";

type Props = {
    currentLocale: Locale;
};

const labels: Record<Locale, string> = {
    en: "English",
    ar: "العربية",
};

export default function HeaderLocaleDropdown({ currentLocale }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);

    const otherLocale: Locale = currentLocale === "en" ? "ar" : "en";

    const targetPath = useMemo(() => {
        const segments = pathname.split("/");
        if (segments[1] === "en" || segments[1] === "ar") {
            segments[1] = otherLocale;
        } else {
            segments.splice(1, 0, otherLocale);
        }
        return segments.join("/") || `/${otherLocale}`;
    }, [pathname, otherLocale]);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    function handleSwitch() {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        router.push(`${targetPath}${hash}`);
        setOpen(false);
    }

    return (
        <div className="locale-dropdown" ref={wrapperRef}>
            <button
                type="button"
                className="locale-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-haspopup="menu"
                suppressHydrationWarning
            >
                <span>{labels[currentLocale]}</span>
                <span className={`locale-chevron ${open ? "open" : ""}`}>▾</span>
            </button>

            {open && (
                <div className="locale-menu" role="menu">
                    <button type="button" className="locale-option" onClick={handleSwitch}>
                        {labels[otherLocale]}
                    </button>
                </div>
            )}

            <style jsx>{`
        .locale-dropdown {
          position: relative;
        }

        .locale-trigger {
          min-width: 148px;
          height: 48px;
          padding: 0 1rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 23, 42, 0.9);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          transition: all 0.2s ease;
        }

        .locale-trigger:hover {
          border-color: rgba(212, 166, 60, 0.45);
          box-shadow: 0 12px 35px rgba(212, 166, 60, 0.12);
        }

        .locale-chevron {
          transition: transform 0.2s ease;
          opacity: 0.8;
        }

        .locale-chevron.open {
          transform: rotate(180deg);
        }

        .locale-menu {
          position: absolute;
          top: calc(100% + 0.65rem);
          left: 0;
          min-width: 148px;
          padding: 0.45rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.98);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
          z-index: 200;
        }

        .locale-option {
          width: 100%;
          height: 42px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .locale-option:hover {
          background: rgba(212, 166, 60, 0.14);
          color: #f7d46b;
        }
      `}</style>
        </div>
    );
}