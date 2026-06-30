import Link from 'next/link'
import Image from 'next/image'
import { signOut } from '../auth/actions'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeaderLogo from "@/components/HeaderLogo";

export default async function CustomerLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617', color: '#f8fafc' }}>
      <header style={{ 
        background: 'rgba(2, 6, 23, 0.8)', 
        backdropFilter: 'blur(12px)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)' 
      }}>
        <div className="container flex justify-between items-center py-4" dir="ltr">
          <HeaderLogo locale={locale} href={`/${locale}/dashboard`} />
          <nav className="flex gap-4 items-center" dir="ltr">
            <Link href={`/${locale}/dashboard`} className="link">{dict.navigation.dashboard}</Link>
            <Link href={`/${locale}/savings`} className="link">{isRTL ? 'سجل التوفير & VIP' : 'Savings & VIP'}</Link>
            <Link href={`/${locale}/settings`} className="link">{dict.navigation.settings || 'Settings'}</Link>
            <Link href={`/${locale}/start-request`} className="link">{dict.customer_dashboard.new_request}</Link>
            <LanguageSwitcher currentLocale={locale as Locale} />
            <form action={signOut}>
              <button type="submit" className="btn-secondary" style={{ marginTop: 0, padding: '0.5rem 1rem', width: 'auto' }}>
                {dict.navigation.logout}
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  )
}
