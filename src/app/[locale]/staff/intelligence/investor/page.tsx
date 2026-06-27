import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvestorDashboardClient from '@/components/admin/InvestorDashboardClient'

export const metadata = {
  title: 'Investor Mode — FINDORA',
}

export default async function InvestorDashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Strict Authorization: ONLY Owners
  const { data: staffData } = await (supabase
    .from('staff_members') as any)
    .select('id, staff_role')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffData || staffData.staff_role !== 'owner') {
    // Redirect non-owners back to hub with a clean message (or just unauthorized)
    redirect(`/${locale}/staff/hub?error=unauthorized_investor_mode`)
  }

  // Fetch initial metrics (server-side for instant load)
  const { data: completedTasks } = await supabase
    .from('platform_tasks')
    .select('customer_price_egp, platform_profit_egp, margin_percentage')
    .eq('status', 'completed')

  let totalRevenue = 0
  let totalProfit = 0
  let totalMargin = 0

  if (completedTasks && completedTasks.length > 0) {
    completedTasks.forEach((t: any) => {
      totalRevenue += Number(t.customer_price_egp || 0)
      totalProfit += Number(t.platform_profit_egp || 0)
      totalMargin += Number(t.margin_percentage || 0)
    })
  }

  const avgMargin = completedTasks && completedTasks.length > 0 ? (totalMargin / completedTasks.length) : 0

  const { count: activeContributors } = await supabase
    .from('contributors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: totalRequests } = await supabase
    .from('customer_requests')
    .select('id', { count: 'exact', head: true })

  const initialMetrics = {
    revenueEgp: totalRevenue,
    netProfitEgp: totalProfit,
    averageMarginPct: avgMargin,
    cacEgp: 0.0,
    ltvEgp: totalRevenue / (totalRequests || 1),
    activeContributors: activeContributors || 0,
    totalRequests: totalRequests || 0
  }

  return (
    <div className="mx-auto max-w-7xl p-6 pb-20 space-y-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 mb-4">
          🔒 OWNER EXCLUSIVE ACCESS
        </div>
        <h1 className="text-4xl font-extrabold text-white">{locale === 'ar' ? 'أداء المنصة (وضع المستثمر) 📈' : 'Platform Performance (Investor Mode) 📈'}</h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' ? 'عرض المؤشرات المالية، هوامش الربح، واقتصاديات الوحدة (Unit Economics).' : 'View financial indicators, profit margins, and unit economics.'}
        </p>
      </div>

      <InvestorDashboardClient locale={locale} initialMetrics={initialMetrics} />
    </div>
  )
}
