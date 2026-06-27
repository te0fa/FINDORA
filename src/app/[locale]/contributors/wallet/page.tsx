import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WalletDashboardClient from '@/components/contributors/WalletDashboardClient'

export const metadata = {
  title: 'My Wallet — FINDORA',
}

export default async function ContributorWalletPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch contributor profile
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('id, role, trust_score, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!contributor || contributor.status !== 'active') {
    redirect(`/${locale}/contributors/apply`)
  }

  // Fetch wallet
  const { data: wallet } = await (supabase
    .from('contributor_wallets') as any)
    .select('*')
    .eq('contributor_id', contributor.id)
    .single()

  // Fetch recent transactions
  const { data: transactions } = await (supabase
    .from('wallet_transactions') as any)
    .select('*')
    .eq('wallet_id', wallet?.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Mock data fallback if wallet not found (for UI preview during dev)
  const safeWallet = wallet || {
    balance_egp: 150.00,
    points_balance: 450,
    lifetime_earned_egp: 300.00,
    pending_withdrawal_egp: 0
  }

  const safeTransactions = transactions || []

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {locale === 'ar' ? 'محفظتي' : 'My Wallet'}
        </h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' 
            ? 'تابع أرباحك، نقاطك، وسجل المعاملات الخاص بك بناءً على دورك.' 
            : 'Track your earnings, points, and transaction history based on your role.'}
        </p>
      </div>

      <WalletDashboardClient 
        locale={locale}
        contributor={contributor}
        wallet={safeWallet}
        transactions={safeTransactions}
      />
    </div>
  )
}
