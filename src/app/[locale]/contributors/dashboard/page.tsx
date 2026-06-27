import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/contributors/DashboardClient'

export const metadata = {
  title: 'Dashboard — FINDORA',
}

export default async function ContributorDashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // 1. Fetch contributor
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!contributor || contributor.status !== 'active') {
    redirect(`/${locale}/contributors/apply`)
  }

  // 2. Fetch Wallet for Earnings Breakdown & Points
  let { data: wallet } = await (supabase
    .from('contributor_wallets') as any)
    .select('lifetime_earned_egp, balance_egp, points_balance')
    .eq('contributor_id', contributor.id)
    .single()

  // 3. Determine Level Data
  // Based on active_referrals, trust_score, and points_balance
  const activeReferrals = contributor.active_referrals || 0
  const trustScore = contributor.trust_score || 50
  const points = wallet?.points_balance || 0
  
  const { data: allLevels } = await (supabase
    .from('contributor_levels') as any)
    .select('*')
    .order('required_active_referrals', { ascending: true })

  let currentLevelData = allLevels?.[0]
  let nextLevelData = null

  if (allLevels) {
    for (let i = 0; i < allLevels.length; i++) {
      const level = allLevels[i]
      const meetsReferrals = activeReferrals >= level.required_active_referrals
      const meetsTrust = trustScore >= (level.required_trust_score || 0)
      const meetsPoints = points >= (level.required_lifetime_points || 0)

      if (meetsReferrals && meetsTrust && meetsPoints) {
        currentLevelData = level
        nextLevelData = allLevels[i + 1] || null
      }
    }
  }

  // 4. Fetch Streaks
  let { data: streaks } = await (supabase
    .from('contributor_streaks') as any)
    .select('*')
    .eq('contributor_id', contributor.id)
    .single()

  // 5. Fetch Network Earnings (from wallet_transactions where tx_type = 'network_revenue_share' or 'referral_reward')
  const { data: networkTx } = await (supabase
    .from('wallet_transactions') as any)
    .select('amount_egp')
    .eq('contributor_id', contributor.id)
    .in('tx_type', ['network_revenue_share', 'referral_reward'])

  const networkEarnings = networkTx?.reduce((sum: number, tx: any) => sum + Number(tx.amount_egp), 0) || 0

  // 6. Fetch Badges
  const { data: badges } = await (supabase
    .from('contributor_badges') as any)
    .select('*')
    .eq('contributor_id', contributor.id)
    .order('earned_at', { ascending: false })

  // 7. Fetch Notifications (Survival Alerts)
  const { data: notifications } = await (supabase
    .from('contributor_notifications') as any)
    .select('*')
    .eq('contributor_id', contributor.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="mx-auto max-w-6xl p-6 pb-20">
      <DashboardClient 
        locale={locale}
        contributor={contributor}
        levelData={currentLevelData || { level_number: 1, name_en: 'Novice', name_ar: 'مبتدئ', badge_icon: '🌱', badge_color: 'hsl(220, 10%, 60%)' }}
        nextLevelData={nextLevelData}
        streaks={streaks}
        badges={badges || []}
        wallet={wallet || { lifetime_earned_egp: 0, balance_egp: 0, points_balance: 0 }}
        networkEarnings={networkEarnings}
        notifications={notifications || []}
      />
    </div>
  )
}
