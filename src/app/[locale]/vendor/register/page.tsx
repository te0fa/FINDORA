import { Metadata } from 'next'
import VendorRegistrationClient from './VendorRegistrationClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  return {
    title: isAr
      ? 'سجّل كمورد | Findora'
      : 'Register as a Vendor | Findora',
    description: isAr
      ? 'انضم إلى شبكة موردي Findora وابدأ في استقبال طلبات التسعير من آلاف العملاء.'
      : 'Join the Findora vendor network and start receiving sourcing requests from thousands of customers.',
  }
}

export default async function VendorRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'

  return (
    <main className="vendor-portal-page" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero Header */}
      <div className="vendor-portal-hero">
        <div className="vendor-portal-hero__inner">
          <div className="vendor-portal-hero__badge">
            {isAr ? '🤝 شبكة الموردين' : '🤝 Vendor Network'}
          </div>
          <h1 className="vendor-portal-hero__title">
            {isAr
              ? 'انضم إلى شبكة موردي Findora'
              : 'Join the Findora Vendor Network'}
          </h1>
          <p className="vendor-portal-hero__subtitle">
            {isAr
              ? 'نربطك بآلاف العملاء الباحثين عن منتجاتك وخدماتك. سجّل مجاناً واستقبل طلبات التسعير مباشرة.'
              : 'We connect you with thousands of customers looking for your products and services. Register for free and start receiving pricing requests directly.'}
          </p>

          {/* Benefits */}
          <div className="vendor-portal-benefits">
            {[
              {
                icon: '📈',
                ar: 'زيادة المبيعات',
                en: 'Increase Sales',
                descAr: 'احصل على طلبات تسعير من عملاء مؤهلين',
                descEn: 'Receive quotes from qualified buyers',
              },
              {
                icon: '🆓',
                ar: 'تسجيل مجاني',
                en: 'Free Registration',
                descAr: 'لا رسوم للانضمام لشبكة الموردين',
                descEn: 'No fees to join the vendor network',
              },
              {
                icon: '⭐',
                ar: 'نظام تقييم',
                en: 'Rating System',
                descAr: 'بنِ سمعتك عبر تقييمات العملاء',
                descEn: 'Build your reputation through reviews',
              },
              {
                icon: '🔔',
                ar: 'إشعارات فورية',
                en: 'Instant Alerts',
                descAr: 'استقبل طلبات التسعير فور وصولها',
                descEn: 'Get notified the moment a request arrives',
              },
            ].map((b) => (
              <div key={b.ar} className="vendor-portal-benefit">
                <span className="vendor-portal-benefit__icon">{b.icon}</span>
                <div>
                  <strong>{isAr ? b.ar : b.en}</strong>
                  <p>{isAr ? b.descAr : b.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="vendor-portal-form-wrapper">
        <VendorRegistrationClient locale={locale} dictionary={{}} />
      </div>

      {/* Already registered? */}
      <div className="vendor-portal-login-hint">
        <p>
          {isAr ? 'لديك حساب بالفعل؟ ' : 'Already registered? '}
          <a href={`/${locale}/vendor/login`}>
            {isAr ? 'تسجيل الدخول' : 'Login'}
          </a>
        </p>
      </div>
    </main>
  )
}
