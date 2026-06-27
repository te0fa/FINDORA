import React from 'react'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { getActiveVendors, getPublishedDeals } from '@/lib/dal/marketplace'
import MarketplaceManagerClient from './MarketplaceManagerClient'

export const metadata = {
  title: 'Marketplace Management — FINDORA',
}

export default async function MarketplaceAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isAr = locale === 'ar'

  // Fetch initial data
  const vendors = await getActiveVendors()
  const deals = await getPublishedDeals()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="flex justify-between items-center bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {isAr ? 'إدارة السوق والعروض' : 'Marketplace & Deals'}
          </h1>
          <p className="text-[hsl(220,10%,60%)]">
            {isAr ? 'إضافة الموردين، إنشاء المنتجات، ونشر العروض الحصرية.' : 'Manage vendors, create products, and publish exclusive deals.'}
          </p>
        </div>
      </header>

      <MarketplaceManagerClient 
        locale={locale} 
        initialVendors={vendors} 
        initialDeals={deals} 
      />
    </div>
  )
}
