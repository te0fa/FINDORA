'use client'

import { usePathname, useRouter } from 'next/navigation'
import { locales, type Locale } from '@/lib/i18n/config'

export default function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname()
  const router = useRouter()

  const redirectedPathname = (locale: Locale) => {
    if (!pathname) return '/'
    const segments = pathname.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  const handleLocaleChange = (locale: Locale) => {
    // Set cookie for persistence (middleware uses this)
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`
    router.push(redirectedPathname(locale))
  }

  return (
    <div className="language-switcher">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => handleLocaleChange(locale)}
          className={`lang-btn ${
            currentLocale === locale 
              ? 'lang-btn-active' 
              : 'lang-btn-inactive'
          }`}
        >
          {locale === 'en' ? 'English' : 'عربي'}
        </button>
      ))}
    </div>
  )
}
