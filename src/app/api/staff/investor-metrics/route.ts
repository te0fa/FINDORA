import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Strict Access Control (Owner ONLY as per user request)
  const { data: staffData } = await supabase
    .from('staff_members')
    .select('staff_role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const role = (staffData as { staff_role: string } | null)?.staff_role
  if (!staffData || role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden. Owner access required for financial data.' }, { status: 403 })
  }

  // 3. Aggregate Unit Economics from platform_tasks
  const { data: rawTasks } = await supabase
    .from('platform_tasks')
    .select('customer_price_egp, platform_profit_egp, margin_percentage')
    .eq('status', 'completed')

  const completedTasks = (rawTasks as { customer_price_egp: number | null; platform_profit_egp: number | null; margin_percentage: number | null }[] | null)

  let totalRevenue = 0
  let totalProfit = 0
  let totalMargin = 0

  if (completedTasks && completedTasks.length > 0) {
    completedTasks.forEach(t => {
      totalRevenue += Number(t.customer_price_egp || 0)
      totalProfit += Number(t.platform_profit_egp || 0)
      totalMargin += Number(t.margin_percentage || 0)
    })
  }

  const avgMargin = completedTasks && completedTasks.length > 0 ? (totalMargin / completedTasks.length) : 0

  // 4. Fetch Contributor Metrics (Growth)
  const { count: activeContributors } = await supabase
    .from('contributors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: totalRequests } = await supabase
    .from('customer_requests')
    .select('id', { count: 'exact', head: true })

  // Note: Since this is a new platform and the user explicitly requested NO mock data,
  // these metrics will naturally be mostly zero or based on exactly what exists in the DB right now.
  const cac = 0.0 // Customer Acquisition Cost (Requires marketing spend data, hardcoded 0 for now)
  const ltv = totalRevenue / (totalRequests || 1) // Rough LTV based on current requests

  return NextResponse.json({
    metrics: {
      revenueEgp: totalRevenue,
      netProfitEgp: totalProfit,
      averageMarginPct: avgMargin,
      cacEgp: cac,
      ltvEgp: ltv,
      activeContributors: activeContributors || 0,
      totalRequests: totalRequests || 0
    }
  })
}
