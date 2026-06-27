"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";
import { Locale } from "@/lib/i18n/config";
import { signOut } from "@/app/[locale]/auth/actions";

type Props = {
    locale: string;
    isRTL: boolean;
};

export default function StaffHeader({ locale, isRTL }: Props) {
    const pathname = usePathname();

    const isDashboard = pathname.includes("/staff/dashboard");
    const isQueue = pathname.includes("/staff/queue");
    const isWorkspace = pathname.includes("/staff/workspace");

    return (
        <header className="staff-header">
            <div className="staff-header-inner">
                <HeaderLogo locale={locale} href={`/${locale}/staff/queue`} ariaLabel="Findora Staff Home" />

                <div className="nav-slot">
                    <nav className="staff-nav" dir={isRTL ? "rtl" : "ltr"}>
                        <span className="brand-pill">
                            {isRTL ? "لوحة الموظفين" : "Staff Panel"}
                        </span>

                        <Link
                            href={`/${locale}/staff/queue`}
                            className={`nav-pill ${isQueue ? "active" : ""}`}
                        >
                            {isRTL ? "قائمة المهام" : "Queue"}
                        </Link>

                        <Link
                            href={`/${locale}/staff/dashboard`}
                            className={`nav-pill ${isDashboard ? "active" : ""}`}
                        >
                            {isRTL ? "لوحة التحكم" : "Dashboard"}
                        </Link>

                        {isWorkspace && (
                            <span className="nav-pill active">
                                {isRTL ? "مساحة الطلب" : "Workspace"}
                            </span>
                        )}
                    </nav>
                </div>

                <div className="right-side">
                    <div className="language-wrap">
                        <HeaderLocaleDropdown currentLocale={locale as Locale} />
                    </div>

                    <form action={signOut}>
                        <button type="submit" className="logout-btn">
                            {isRTL ? "تسجيل الخروج" : "Logout"}
                        </button>
                    </form>
                </div>
            </div>

            <style jsx>{`
        .staff-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: 132px;
          display: flex;
          align-items: center;
          background: rgba(2, 6, 23, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
        }

        .staff-header-inner {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 260px 1fr auto;
          align-items: center;
          gap: 12px;
          direction: ltr;
          box-sizing: border-box;
        }


        .nav-slot {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .staff-nav {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          flex-shrink: 0;
          max-width: 100%;
        }

        .brand-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: rgba(212, 166, 60, 0.08);
          border: 1px solid rgba(212, 166, 60, 0.28);
          color: #f7d46b;
          font-weight: 900;
          font-size: 0.92rem;
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .nav-pill,
        .nav-pill:link,
        .nav-pill:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: transparent;
          color: #eef4ff;
          font-weight: 800;
          font-size: 0.92rem;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex: 0 0 auto;
        }

        .nav-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .nav-pill.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .right-side {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 14px;
          direction: ltr;
          flex-shrink: 0;
        }

        .language-wrap {
          display: flex;
          align-items: center;
        }

        .logout-btn {
          min-width: 110px;
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.34);
          background: rgba(59, 130, 246, 0.06);
          color: #60a5fa;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(59, 130, 246, 0.14);
          color: #ffffff;
          border-color: rgba(59, 130, 246, 0.55);
        }

        @media (max-width: 1450px) {
          .staff-header-inner {
            padding: 0 20px;
            gap: 16px;
            grid-template-columns: minmax(170px, 240px) minmax(0, 1fr) auto;
          }


          .staff-nav {
            gap: 8px;
            padding: 8px 14px;
          }

          .brand-pill,
          .nav-pill,
          .nav-pill:link,
          .nav-pill:visited {
            font-size: 0.88rem;
            padding: 0 16px;
          }
        }

        @media (max-width: 1100px) {
          .staff-nav {
            gap: 6px;
          }

          .brand-pill {
            display: none;
          }
        }

        @media (max-width: 860px) {
          .staff-header {
            height: 100px;
          }

          .staff-header-inner {
            grid-template-columns: minmax(150px, 180px) 1fr auto;
            padding: 0 16px;
            gap: 10px;
          }


          .nav-pill,
          .nav-pill:link,
          .nav-pill:visited {
            min-height: 40px;
            padding: 0 14px;
            font-size: 0.82rem;
          }

          .logout-btn {
            min-width: 92px;
            height: 42px;
            font-size: 0.82rem;
          }
        }
      `}</style>
        </header>
    );
}