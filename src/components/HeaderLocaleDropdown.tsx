"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import './HeaderLocaleDropdown.css';

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
        </div>
    );
}