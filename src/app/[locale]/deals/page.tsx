import { getPublishedDeals } from '@/lib/dal/marketplace'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import LandingHeader from '@/components/LandingHeader'
import DealsList from './DealsList'

export default async function PublicDealsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const rawDeals = await getPublishedDeals() as any[]
  const deals = rawDeals.map(d => ({
    id: d.id,
    slug: d.id, // using id as slug for now
    title_en: d.deal_title_en,
    title_ar: d.deal_title_ar,
    description_en: d.product?.title_en,
    description_ar: d.product?.title_ar,
    original_price: d.product?.base_price_egp, // Using vendor price as original to show "markup" or discount
    deal_price: d.final_customer_price_egp,
    currency_code: 'EGP',
    category: d.product?.category || 'General',
    featured_on_homepage: d.is_featured
  }))

  const headerLabels = {
    home: isRTL ? "الرئيسية" : "Home",
    how: isRTL ? "كيف نعمل" : "How it Works",
    why: isRTL ? "لماذا فايندورا" : "Why Findora",
    categories: isRTL ? "الفئات" : "Categories",
    flow: isRTL ? "خطواتنا" : "Our Flow",
    pricing: isRTL ? "الأسعار" : "Pricing",
    faq: isRTL ? "الأسئلة الشائعة" : "FAQ",
    deals: isRTL ? "عروض فايندورا" : "Findora Deals",
    start: isRTL ? "ابدأ طلبك" : "Start Your Request",
    track: isRTL ? "تتبع طلبك" : "Track Your Request",
    login: isRTL ? "تسجيل الدخول" : "Login",
    signup: isRTL ? "إنشاء حساب" : "Sign Up",
  }

  return (
    <div className="landing-page" dir={isRTL ? "rtl" : "ltr"} data-testid="public-deals-page">
      <LandingHeader locale={locale} isRTL={isRTL} labels={headerLabels} />

      <main className="pb-20">
        <div className="section-shell">
          <header className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
               {isRTL ? 'عروض حصرية' : 'Exclusive Deals'}
            </h1>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              {dict.staff_dashboard.deals_subtitle}
            </p>
          </header>

          <DealsList deals={deals || []} locale={locale} isRTL={isRTL} dict={dict} />
        </div>
      </main>

      <style>{`
        .landing-page {
          --header-height: 140px;
          background: #020617;
          color: #f8fafc;
          min-height: 100vh;
          font-family: inherit;
        }
        .landing-page main {
          padding-top: var(--header-height);
        }
        .section-shell {
          width: min(1200px, calc(100% - 40px));
          margin: 0 auto;
        }
        .glass-card {
          background: linear-gradient(
            145deg,
            rgba(15, 23, 42, 0.8),
            rgba(15, 23, 42, 0.4)
          );
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          border-radius: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(212, 166, 60, 0.2);
          transform: translateY(-8px);
        }
        [dir="rtl"] .landing-page {
          text-align: right;
        }
      `}</style>
    </div>
  )
}
