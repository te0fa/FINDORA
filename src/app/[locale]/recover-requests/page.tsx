import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import RecoverRequestsForm from './RecoverRequestsForm'

export default async function RecoverRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  return <RecoverRequestsForm dict={dict} locale={locale} isRTL={isRTL} />
}
