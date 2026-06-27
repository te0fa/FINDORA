import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

// CRON JOB: /api/cron/trend-detector
// Detects demand clusters and generates proactive tasks
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const CRON_SECRET = process.env.CRON_SECRET
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stabilizerStatus = await getAIFeatureStatus('flag_economy_stabilizer_active')
  if (!stabilizerStatus.enabled) {
    return NextResponse.json({ success: false, message: 'Stabilizer is currently disabled' })
  }

  const supabase = createAdminClient() as any

  // Find requests in the last 48 hours
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  
  const { data: recentRequests, error } = await supabase
    .from('customer_requests')
    .select('category, target_location')
    .gte('created_at', fortyEightHoursAgo)

  if (error || !recentRequests || recentRequests.length === 0) {
    return NextResponse.json({ message: 'No recent data for trends', newTasksGenerated: 0 })
  }

  // Find Admin User for attribution
  const { data: admin } = await supabase.from('staff_members').select('id').limit(1).single()
  if (!admin) return NextResponse.json({ error: 'No admin found' }, { status: 500 })

  // Aggregate by [location]-[category]
  const heatMap: Record<string, number> = {}
  recentRequests.forEach((req: any) => {
    const key = `${req.target_location}|${req.category}`
    heatMap[key] = (heatMap[key] || 0) + 1
  })

  let newTasksGenerated = 0

  // If a location+category has 3 or more requests, it's a trend!
  for (const [key, count] of Object.entries(heatMap)) {
    if (count >= 3) {
      const [location, category] = key.split('|')
      
      // Check if we already created a trending task for this recently to avoid spam
      const { data: existing } = await supabase
        .from('platform_tasks')
        .select('id')
        .eq('task_type', 'market_intel')
        .contains('location_data', { zone: location })
        .like('title_en', `%${category}%`)
        .gte('created_at', fortyEightHoursAgo)
        .limit(1)

      if (existing && existing.length > 0) continue // Already handled

      // Create a proactive "Market Intel" task
      await supabase.from('platform_tasks').insert({
        task_type: 'market_intel',
        title_en: `High Demand: Prices for ${category}`,
        title_ar: `طلب متزايد: أسعار لـ ${category}`,
        description_en: `We are seeing high demand for ${category} in ${location}. Find the best current prices or offers in local stores.`,
        description_ar: `هناك طلب متزايد على ${category} في ${location}. ابحث عن أفضل الأسعار والعروض الحالية في المحلات.`,
        required_role: 'store_insider', // Prefer insiders for mass intel
        min_level: 2, // Active contributors only
        min_trust_score: 50,
        base_reward_egp: 30, // Good reward for bulk intel
        base_reward_points: 150,
        time_limit_minutes: 120,
        priority: 20, // Very high priority
        location_data: { zone: location, is_trend: true },
        status: 'open',
        created_by_staff_id: admin.id
      })

      newTasksGenerated++
    }
  }

  return NextResponse.json({ success: true, message: 'Trend detection complete', heatMap, newTasksGenerated })
}
