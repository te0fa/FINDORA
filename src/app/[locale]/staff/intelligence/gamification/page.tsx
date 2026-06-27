import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GamificationSettingsClient from './GamificationSettingsClient'

export const metadata = {
  title: 'Gamification Settings — Staff',
}

export default async function GamificationSettingsPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Authorize
  const { data: staffData } = await (supabase
    .from('staff_members') as any)
    .select('id, staff_role')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffData || (staffData.staff_role !== 'admin' && staffData.staff_role !== 'owner' && staffData.staff_role !== 'economy_architect')) {
    redirect(`/${locale}/staff/hub`)
  }

  // Fetch all related economy configs
  const { data: configs } = await supabase
    .from('economy_config')
    .select('config_key, value')
    .in('config_key', ['referral_settings', 'role_multipliers', 'revenue_split'])

  const configMap = configs?.reduce((acc: any, row: any) => {
    acc[row.config_key] = row.value
    return acc
  }, {}) || {}

  const initialConfig = configMap['referral_settings'] || {
    task_completion_egp: 25,
    approval_points: 50,
    l2_passive_percentage: 0.05
  }

  const initialRoleMultipliers = configMap['role_multipliers'] || {
    field_scout: 1.2,
    store_insider: 1.0,
    casual: 0.8
  }

  const initialRevenueSplit = configMap['revenue_split'] || {
    contributor_pool_pct: 0.70,
    platform_pct: 0.20,
    reserve_pct: 0.10
  }

  return (
    <div className="mx-auto max-w-6xl p-6 pb-20">
      <GamificationSettingsClient 
        locale={locale} 
        initialConfig={initialConfig} 
        initialRoleMultipliers={initialRoleMultipliers}
        initialRevenueSplit={initialRevenueSplit}
      />
    </div>
  )
}
