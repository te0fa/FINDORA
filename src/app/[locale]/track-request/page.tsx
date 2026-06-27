import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import TrackRequestForm from "./TrackRequestForm"

export default async function TrackRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ code?: string; phone?: string }>
}) {
  const { locale } = await params
  const { code, phone } = await searchParams
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  return (
    <TrackRequestForm 
      dict={dict} 
      locale={locale} 
      isRTL={isRTL} 
      initialCode={code}
      initialPhone={phone}
    />
  )
}
