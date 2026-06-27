import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoutsWalletsClient from '@/components/staff/ScoutsWalletsClient'
import { fetchWalletsAndWithdrawals } from '@/lib/staff/finance'

export const metadata = {
  title: 'Scouts Wallets & Withdrawals — FINDORA',
}

export default async function ScoutsWalletsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Check Staff role and permissions (Admin or Financial)
  const { data: staffData } = await supabase
    .from('staff_members')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  const staff = staffData as any
  if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
    redirect(`/${locale}/staff/dashboard`)
  }

  const { wallets, pendingWithdrawals } = await fetchWalletsAndWithdrawals()

  return (
    <div className="mx-auto max-w-6xl p-6 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">
          {isRTL ? 'إدارة المناديب والمحافظ' : 'Scouts & Wallets Management'}
        </h1>
        <p className="mt-4 text-lg text-[hsl(220,10%,60%)]">
          {isRTL 
            ? 'لوحة التحكم المركزية لأرصدة المناديب (Field Scouts) ومراجعة واعتماد طلبات السحب.' 
            : 'Central control panel for Field Scouts balances and approving withdrawal requests.'}
        </p>
      </header>

      <ScoutsWalletsClient 
        wallets={wallets || []} 
        pendingWithdrawals={pendingWithdrawals || []} 
        staffId={staff.id}
        isRTL={isRTL} 
      />
    </div>
  )
}
