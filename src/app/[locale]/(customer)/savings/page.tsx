import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function SavingsPage({
  params,
  searchParams
}: PageProps) {
  const { locale } = await params;
  const { tab } = await searchParams;
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

  // Fetch global requests and bids to compute genuine price trends
  const adminClient = await createAdminClient()
  const { data: globalRequests = [] } = await adminClient
    .from('customer_requests')
    .select('id, category, max_price')

  const { data: globalBids = [] } = await adminClient
    .from('vendor_bids')
    .select('request_id, price_amount')

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="text-slate-100 p-2 md:p-6" style={{ overflowY: 'visible', display: 'block', width: '100%' }}>
      <SavingsClient 
        locale={locale}
        pointBalance={pointBalance}
        requests={requests}
        ledger={ledger}
        waitlist={waitlist}
        customerId={customer.id}
        initialTab={tab}
        globalRequests={globalRequests || []}
        globalBids={globalBids || []}
      />
    </div>
  )
}
