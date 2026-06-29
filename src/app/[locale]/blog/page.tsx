"use client";

import React, { use } from "react";
import Link from "next/link";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function BlogComingSoon({ params }: PageProps) {
  const { locale } = use(params);
  const isRTL = locale === "ar";

  const content = {
    title: isRTL ? "مدونة فايندورا ✍️" : "Findora Blog ✍️",
    badge: isRTL ? "قريباً جداً" : "Coming Soon",
    desc: isRTL
      ? "نعمل حالياً على تطوير المدونة لمشاركتكم أحدث تحليلات السوق، ومؤشرات الأسعار، ونصائح التوريد والبحث الذكي لمساعدتكم في الحصول على أفضل الصفقات وعروض الأسعار في مصر."
      : "We are currently developing our blog to share the latest market insights, pricing trends, and smart sourcing tips to help you secure the best deals and quotes in Egypt.",
    backBtn: isRTL ? "العودة للرئيسية" : "Back to Home",
    meta: isRTL ? "فايندورا — طريقك الأسهل للتوريد الذكي." : "Findora — Your easiest path to smart sourcing.",
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-end relative overflow-hidden bg-[#020617] text-white px-6 pt-32 pb-16"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Scope-restricted styles to enlarge the language dropdown button ONLY on this page */}
      <style>{`
        .blog-locale-wrapper .locale-trigger {
          min-width: 104px;
          height: 38px;
          padding: 0 14px;
          font-size: 0.82rem;
        }
        .blog-locale-wrapper .locale-menu {
          min-width: 104px;
          top: calc(100% + 0.5rem);
        }
        .blog-locale-wrapper .locale-option {
          font-size: 0.82rem;
          height: 32px;
        }
      `}</style>

      {/* Ambient Background Glows */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-amber-500/10 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none z-0" />

      {/* Mini Top Header with Logo & Language Switcher */}
      <header className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-6 md:px-12 max-w-6xl mx-auto w-full z-20 pt-4" style={{ direction: "ltr" }}>
        {/* Styled Logo Component */}
        <div className="flex items-center mt-2">
          <HeaderLogo locale={locale} />
        </div>
        {/* Enlargeable Language Switcher Wrapper */}
        <div className="flex items-center blog-locale-wrapper">
          <HeaderLocaleDropdown currentLocale={locale as any} />
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-xl text-center relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Coming Soon Glass Card */}
        <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          {/* Inner ambient card border glow on hover */}
          <div className="absolute inset-0 border border-amber-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 uppercase tracking-wider">
            ✨ {content.badge}
          </span>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
            {content.title}
          </h1>

          {/* Description */}
          <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
            {content.desc}
          </p>

          {/* Back Action button */}
          <div className="flex justify-center">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center px-8 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
            >
              {content.backBtn}
            </Link>
          </div>
        </div>

        {/* Footer Meta Text */}
        <p className="text-xs text-slate-600 font-medium">
          {content.meta}
        </p>
      </div>
    </div>
  );
}
