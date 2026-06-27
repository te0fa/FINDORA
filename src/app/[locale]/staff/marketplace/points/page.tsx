import React from 'react'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { getAllPartnersWithBalances, getAllPartnerTransactions } from '@/lib/dal/points'
import PointsManagerClient from './PointsManagerClient'
import { createAdminClient } from '@/lib/dal/customers'

export const metadata = {
  title: 'Points & Payouts Management — FINDORA',
}

export default async function StaffPointsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const isAr = locale === 'ar'
  const dict = await getDictionary(locale as Locale)

  // Fetch partners and their balances
  const partners = await getAllPartnersWithBalances()
  // Fetch points transaction logs
  const transactions = await getAllPartnerTransactions()

  // Fetch pending deal hunter insights
  const adminClient = await createAdminClient()
  const { data: insights } = await adminClient
    .from('market_insights')
    .select('*, contributor:contributors(full_name)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="flex justify-between items-center bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {isAr ? 'إدارة نقاط وعمولات الشركاء' : 'Partner Points & Commissions'}
          </h1>
          <p className="text-[hsl(220,10%,60%)] text-sm">
            {isAr 
              ? 'تتبع نقاط المناديب والشركاء المستبدلة بعمولات وكاش، وتسجيل عمليات الدفع والمكافآت يدوياً.' 
              : 'Audit scout/partner points, record payouts, and manually adjust ledger credits.'}
          </p>
        </div>
      </header>

      <PointsManagerClient 
        locale={locale}
        initialPartners={partners}
        initialTransactions={transactions}
        initialInsights={insights || []}
      />
    </div>
  )
}
