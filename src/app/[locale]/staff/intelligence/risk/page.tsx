import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RiskControlClient from './RiskControlClient'

export const metadata = {
  title: 'Risk Control Engine | FINDORA OS',
}

export default async function RiskControlPage({ params }: { params: { locale: string } }) {
  const supabase = await createClient() as any

  // 1. Check Auth & Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${params.locale}/auth/login`)

  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  // Only admin, owner, or HR can modify risk controls
  if (!staff || !['admin', 'owner', 'hr_manager'].includes(staff.role)) {
    redirect(`/${params.locale}/staff/dashboard`)
  }

  // 2. Fetch Contributors and their wallets
  const { data: contributors } = await supabase
    .from('contributors')
    .select(`
      id,
      full_name,
      phone_number,
      status,
      trust_score,
      contributor_wallets (
        id,
        balance_egp,
        points_balance,
        credit_balance,
        is_frozen
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50) // Just loading the top 50 for now, would use pagination in production

  return (
    <div className="mx-auto max-w-6xl p-6 pb-20">
      <RiskControlClient 
        locale={params.locale}
        initialContributors={contributors || []}
      />
    </div>
  )
}
