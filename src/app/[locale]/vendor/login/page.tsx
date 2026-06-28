import { Metadata } from 'next'
import VendorLoginClient from './VendorLoginClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  return {
    title: isAr ? 'تسجيل دخول الموردين | Findora' : 'Vendor Login | Findora',
    description: isAr ? 'سجل الدخول لحسابك لمتابعة المزادات وتقديم عروض الأسعار.' : 'Login to your vendor account to track auctions and submit quotes.',
  }
}

export default async function VendorLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <VendorLoginClient locale={locale} />
}
