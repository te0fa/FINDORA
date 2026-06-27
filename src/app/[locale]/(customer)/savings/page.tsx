import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { getCustomerRequests } from '@/lib/dal/requests'
import { getCustomerPointsBalance, getCustomerPointsLedger, getCustomerWaitlist } from '@/lib/dal/points'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { redirect } from 'next/navigation'
import SavingsClient from './SavingsClient'

export const metadata = {
  title: 'Savings & VIP Hub — FINDORA',
}

export default async function SavingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const isAr = locale === 'ar'
  const dict = await getDictionary(locale as Locale)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const customer = await getCustomerByAuthId(user.id)
  if (!customer) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch all DAL metrics for this customer
  const pointBalance = await getCustomerPointsBalance(customer.id)
  const ledger = await getCustomerPointsLedger(customer.id)
  const waitlist = await getCustomerWaitlist(customer.id)
  const requests = await getCustomerRequests(customer.id)

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen text-slate-100 p-2 md:p-6">
      <SavingsClient 
        locale={locale}
        pointBalance={pointBalance}
        requests={requests}
        ledger={ledger}
        waitlist={waitlist}
        customerId={customer.id}
      />
    </div>
  )
}
