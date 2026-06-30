import { signOut } from "../auth/actions";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/i18n/config";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";

import { createClient } from "@/lib/supabase/server";
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from "@/lib/dal/staff";
import StaffNavClient from "./StaffNavClient";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const staffMember = user ? await getStaffMemberByAuthUserId(user.id) : null;
  const permissions = staffMember ? getStaffUiPermissions(staffMember) : null;

  const categories = [
    {
      id: "hub",
      label: locale === "ar" ? "🏠 الرئيسية" : "🏠 Master Hub",
      href: `/${locale}/staff/hub`,
      visible: true,
    },
    {
      id: "operations",
      label: locale === "ar" ? "⚡ العمليات" : "⚡ Operations",
      href: `/${locale}/staff/dashboard`,
      visible: true,
      subLinks: [
        { href: `/${locale}/staff/dashboard`, label: locale === "ar" ? "لوحة القياس" : "Dashboard", visible: true },
        { href: `/${locale}/staff/queue`, label: locale === "ar" ? "طابور الطلبات" : "Intake Queue", visible: true },
        { href: `/${locale}/staff/workspace`, label: locale === "ar" ? "مساحات العمل" : "Workspaces", visible: true },
        { href: `/${locale}/staff/archive`, label: locale === "ar" ? "الأرشيف" : "Archive", visible: true },
      ]
    },
    {
      id: "contributors",
      label: locale === "ar" ? "🌍 المناديب" : "🌍 Scouts",
      href: `/${locale}/staff/contributors`,
      visible: permissions?.canAccessQueue ?? true,
      subLinks: [
        { href: `/${locale}/staff/contributors`, label: locale === "ar" ? "قاعدة البيانات" : "Scout Database", visible: true },
        { href: `/${locale}/staff/contributors/wallets`, label: locale === "ar" ? "المحافظ والأرباح" : "Wallets & Rewards", visible: true },
        { href: `/${locale}/staff/contributors/submissions`, label: locale === "ar" ? "مراجعة التقديمات" : "Submissions Review", visible: true },
        { href: `/${locale}/staff/contributors/economy`, label: locale === "ar" ? "موازن الاقتصاد" : "Economy Stabilizer", visible: true },
      ]
    },
    {
      id: "marketplace",
      label: locale === "ar" ? "🏪 السوق" : "🏪 Marketplace",
      href: `/${locale}/staff/marketplace`,
      visible: true,
      subLinks: [
        { href: `/${locale}/staff/marketplace`, label: locale === "ar" ? "إدارة العروض" : "Deals Dashboard", visible: true },
        { href: `/${locale}/staff/marketplace/auctions`, label: locale === "ar" ? "مناقصات ومزادات السوق" : "Marketplace Auctions", visible: true },
        { href: `/${locale}/staff/marketplace/points`, label: locale === "ar" ? "نقاط وعمولات الشركاء" : "Partner Points", visible: true },
        { href: `/${locale}/staff/products`, label: locale === "ar" ? "كتالوج المنتجات" : "Products Catalog", visible: true },
        { href: `/${locale}/staff/vendors`, label: locale === "ar" ? "الموردين" : "Vendors Hub", visible: true },
        { href: `/${locale}/staff/vendors/new`, label: locale === "ar" ? "مورد جديد" : "New Vendor", visible: true },
        { href: `/${locale}/staff/marketing/deals`, label: locale === "ar" ? "العروض الترويجية" : "Promo Deals", visible: true },
      ]
    },
    {
      id: "intelligence",
      label: locale === "ar" ? "🧠 الذكاء" : "🧠 Intelligence",
      href: `/${locale}/staff/intelligence`,
      visible: permissions?.canAccessDashboard ?? true,
      subLinks: [
        { href: `/${locale}/staff/intelligence`, label: locale === "ar" ? "نظرة عامة" : "Overview", visible: true },
        { href: `/${locale}/staff/intelligence/beachhead`, label: locale === "ar" ? "سوق Beachhead" : "Beachhead Market", visible: true },
        { href: `/${locale}/staff/intelligence/moat`, label: locale === "ar" ? "🏯 الخندق الدفاعي MOAT" : "🏯 Defensive Moat", visible: true },
        { href: `/${locale}/staff/intelligence/vision`, label: locale === "ar" ? "🌐 رؤية المشروع Vision" : "🌐 Project Vision", visible: true },
        { href: `/${locale}/staff/intelligence/north-star`, label: locale === "ar" ? "⭐️ مؤشر الشمال North Star" : "⭐️ North Star Goal", visible: true },
        { href: `/${locale}/staff/intelligence/competitors`, label: locale === "ar" ? "⚔️ مقارنة المنافسين" : "⚔️ Competitors Intel", visible: true },
        { href: `/${locale}/staff/intelligence/kill-list`, label: locale === "ar" ? "☠️ قائمة المحظورات" : "☠️ Kill List", visible: true },
        { href: `/${locale}/staff/intelligence/crm`, label: locale === "ar" ? "🤝 لوحة تحكم CRM" : "🤝 CRM Dashboard", visible: true },
        { href: `/${locale}/staff/intelligence/flywheel`, label: locale === "ar" ? "عجلة النمو Flywheel" : "Flywheel Engine", visible: true },
        { href: `/${locale}/staff/intelligence/growth`, label: locale === "ar" ? "📢 قنوات النمو والإعلانات" : "📢 Growth & CRM Ads", visible: true },
        { href: `/${locale}/staff/intelligence/actions`, label: locale === "ar" ? "🎯 خطوات التشغيل" : "🎯 Operational Actions", visible: true },
        { href: `/${locale}/staff/intelligence/roadmap`, label: locale === "ar" ? "✈️ مراحل المشروع" : "✈️ Project Roadmap", visible: true },
        { href: `/${locale}/staff/intelligence/founder`, label: locale === "ar" ? "👤 تقييم المؤسس" : "👤 Founder Rating", visible: true },
        { href: `/${locale}/staff/intelligence/hr`, label: locale === "ar" ? "🛡️ نظام إدارة الموظفين HR" : "🛡️ Staff HR & Review", visible: true },
        { href: `/${locale}/staff/intelligence/network`, label: locale === "ar" ? "📈 مؤشرات صحة الشبكة" : "📈 Network Tracker", visible: true },
        { href: `/${locale}/staff/intelligence/economy-config`, label: locale === "ar" ? "إعدادات الاقتصاد" : "Economy Config", visible: true },
        { href: `/${locale}/staff/intelligence/risk`, label: locale === "ar" ? "كشف الاحتيال" : "Fraud & Risk", visible: true },
        { href: `/${locale}/staff/intelligence/gamification`, label: locale === "ar" ? "محرك الألعاب" : "Gamification", visible: true },
        { href: `/${locale}/staff/intelligence/pricing`, label: locale === "ar" ? "التسعير AI" : "AI Pricing", visible: true },
        { href: `/${locale}/staff/intelligence/investor`, label: locale === "ar" ? "مقاييس المستثمرين" : "Investor Metrics", visible: true },
        { href: `/${locale}/staff/intelligence/merchants`, label: locale === "ar" ? "ذكاء التجار" : "Merchants Intel", visible: true },
        { href: `/${locale}/staff/intelligence/customers`, label: locale === "ar" ? "قاعدة العملاء" : "Customer DB", visible: true },
        { href: `/${locale}/staff/intelligence/experiments`, label: locale === "ar" ? "🧪 تجارب وقرارات الشركة" : "🧪 Company Experiments", visible: true },
        { href: `/${locale}/staff/intelligence/fraud`, label: locale === "ar" ? "التحقيق بالاحتيال" : "Fraud Investigation", visible: true },
        { href: `/${locale}/staff/intelligence/ai`, label: locale === "ar" ? "إعدادات AI" : "AI Settings", visible: true },
        { href: `/${locale}/staff/ai-control`, label: locale === "ar" ? "إدارة ميزات AI" : "AI Feature Control", visible: permissions?.canManageAI ?? true },
        { href: `/${locale}/admin/link-domains`, label: locale === "ar" ? "🔗 دومينات الروابط" : "🔗 Link Domains", visible: permissions?.canManageAI ?? false },
        { href: `/${locale}/admin/link-analytics`, label: locale === "ar" ? "📊 تحليل الروابط" : "📊 Link Analytics", visible: permissions?.canManageAI ?? false },
        { href: `/${locale}/staff/intelligence/agent-control`, label: locale === "ar" ? "التحكم بالوكلاء" : "Agent Control", visible: true },
        { href: `/${locale}/staff/intelligence/tasks`, label: locale === "ar" ? "ذكاء المهام" : "Tasks Intel", visible: true },
        { href: `/${locale}/staff/intelligence/communications`, label: locale === "ar" ? "سجل الاتصالات" : "Comms Log", visible: true },
      ]
    },
    {
      id: "finance",
      label: locale === "ar" ? "💰 الماليات" : "💰 Finance",
      href: `/${locale}/staff/finance/transactions`,
      visible: permissions?.canAccessDashboard ?? true,
      subLinks: [
        { href: `/${locale}/staff/finance/transactions`, label: locale === "ar" ? "سجل المعاملات" : "Transactions", visible: true },
        { href: `/${locale}/staff/payments`, label: locale === "ar" ? "بوابات الدفع" : "Payment Gateway", visible: true },
      ]
    },
    {
      id: "marketing",
      label: locale === "ar" ? "📢 التسويق" : "📢 Marketing",
      href: `/${locale}/staff/marketing/pricing`,
      visible: true,
      subLinks: [
        { href: `/${locale}/staff/marketing/pricing`, label: locale === "ar" ? "خطط الأسعار" : "Pricing Plans", visible: true },
        { href: `/${locale}/staff/marketing/news`, label: locale === "ar" ? "الأخبار" : "News", visible: true },
        { href: `/${locale}/staff/marketing/content`, label: locale === "ar" ? "المحتوى" : "Content", visible: true },
        { href: `/${locale}/staff/marketing/verification-settings`, label: locale === "ar" ? "التحقق" : "Verification", visible: true },
      ]
    },
    {
      id: "settings",
      label: locale === "ar" ? "⚙️ الإعدادات" : "⚙️ Settings",
      href: `/${locale}/staff/settings/specializations`,
      visible: true,
      subLinks: [
        { href: `/${locale}/staff/users`, label: locale === "ar" ? "الموظفين" : "Staff Members", visible: true },
        { href: `/${locale}/staff/settings/payments`, label: locale === "ar" ? "بوابات الدفع" : "Payment Config", visible: true },
        { href: `/${locale}/staff/settings/specializations`, label: locale === "ar" ? "التخصصات" : "Specializations", visible: true },
      ]
    },
    {
      id: "website",
      label: locale === "ar" ? "🌐 الموقع" : "🌐 Website",
      href: `/${locale}`,
      visible: true,
      subLinks: [
        { href: `/${locale}`, label: locale === "ar" ? "الصفحة الرئيسية" : "Home Page", visible: true },
        { href: `/${locale}/deals`, label: locale === "ar" ? "عروض المنتجات" : "Products Deals", visible: true },
        { href: `/${locale}/pricing`, label: locale === "ar" ? "أسعار الخدمات" : "Services Pricing", visible: true },
        { href: `/${locale}/contributors`, label: locale === "ar" ? "صفحة المناديب" : "Scouts Page", visible: true },
      ]
    }
  ];

  const navCategories = categories
    .filter(cat => cat.visible)
    .map(cat => ({
      id: cat.id,
      label: cat.label,
      href: cat.href,
      subLinks: cat.subLinks ? cat.subLinks.filter(sub => sub.visible) : undefined
    }));
  return (
    <div className="staff-shell">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .staff-shell {
              min-height: 100vh;
              background: #020617;
              color: #f8fafc;
            }

            .staff-header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 1000;
              height: 96px;
              display: flex;
              align-items: center;
              background: rgba(2, 6, 23, 0.88);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border-bottom: 1px solid rgba(255, 255, 255, 0.07);
              box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
              transition: all 0.25s ease;
            }

            .staff-header-inner {
              width: 100%;
              max-width: 1440px;
              margin: 0 auto;
              padding: 0 16px;
              display: grid;
              grid-template-columns: auto 1fr auto;
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
            }

            .right-side {
              justify-self: end;
              display: flex;
              align-items: center;
              gap: 14px;
              direction: ltr;
              flex-shrink: 0;
            }

            .logout-form {
              margin: 0;
            }

            .logout-btn {
              min-width: 90px;
              height: 38px;
              padding: 0 1rem;
              border-radius: 10px;
              border: 1px solid rgba(59, 130, 246, 0.3);
              background: rgba(59, 130, 246, 0.04);
              color: #60a5fa;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              font-size: 0.8rem;
              font-weight: 800;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .logout-btn:hover {
              color: #ffffff;
              background: rgba(59, 130, 246, 0.1);
              border-color: rgba(59, 130, 246, 0.5);
            }

            .staff-main {
              width: 100%;
              max-width: 1440px;
              margin: 0 auto;
              padding: 136px 24px 48px;
              box-sizing: border-box;
            }

            @media (max-width: 1200px) {
              .staff-header-inner { grid-template-columns: 200px 1fr 180px; gap: 12px; }
            }

            @media (max-width: 900px) {
              .staff-header { height: 80px; }
              .staff-header-inner { grid-template-columns: auto 1fr auto; padding: 0 20px; }
              .staff-main { padding-top: 120px; padding-left: 20px; padding-right: 20px; }
            }

            @media (max-width: 640px) {
              .staff-header-inner { padding: 0 16px; gap: 8px; }
              .staff-main { padding-top: 110px; padding-left: 16px; padding-right: 16px; }
              .logout-btn { min-width: auto; padding: 0 12px; }
              .logout-btn span { display: none; }
            }
          `,
        }}
      />

      <header className="staff-header">
        <div className="staff-header-inner">
          <HeaderLogo
            locale={locale}
            href={`/${locale}/staff/queue`}
            ariaLabel="Findora Staff"
          />

          <div className="nav-slot">
            <StaffNavClient locale={locale} categories={navCategories} />
          </div>

          <div className="right-side">
            <HeaderLocaleDropdown currentLocale={locale as Locale} />

            <form action={signOut} className="logout-form">
              <button type="submit" className="logout-btn">
                {dict?.navigation?.logout || (locale === "ar" ? "خروج" : "Logout")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="staff-main">{children}</main>
    </div>
  );
}