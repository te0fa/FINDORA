import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

// CRON JOB: /api/cron/task-recycler
// Runs periodically (e.g. every hour) to find stale tasks and boost them
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

  // Find tasks older than 24 hours that are still 'open'
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { data: staleTasks, error } = await supabase
    .from('platform_tasks')
    .select('*')
    .eq('status', 'open')
    .lte('created_at', twentyFourHoursAgo)

  if (error || !staleTasks || staleTasks.length === 0) {
    return NextResponse.json({ message: 'No stale tasks found', recycledCount: 0 })
  }

  let recycledCount = 0

  // ♻️ The Recycling Loop
  for (const task of staleTasks) {
    // 1. Mark old task as expired
    await supabase.from('platform_tasks').update({ status: 'expired' }).eq('id', task.id)

    // 2. We don't recycle infinitely. If base reward > 100, we stop.
    if (task.base_reward_egp >= 100) continue

    // 3. Create boosted clone
    const boostedEgp = Math.ceil(Number(task.base_reward_egp) * 1.2) // +20%
    const boostedPts = Math.ceil(Number(task.base_reward_points) * 1.2)

    await supabase.from('platform_tasks').insert({
      task_type: task.task_type,
      title_en: `[BOOSTED] ${task.title_en}`,
      title_ar: `[فرصة مضاعفة] ${task.title_ar}`,
      description_en: task.description_en,
      description_ar: task.description_ar,
      required_role: task.required_role, // Could also remove role restriction to expand audience
      min_level: Math.max(1, task.min_level - 1), // Lower the level requirement to get more eyes
      min_trust_score: Math.max(0, task.min_trust_score - 10),
      base_reward_egp: boostedEgp,
      base_reward_points: boostedPts,
      time_limit_minutes: task.time_limit_minutes,
      priority: task.priority + 5, // Bump priority
      location_data: task.location_data,
      status: 'open',
      created_by_staff_id: task.created_by_staff_id,
      parent_request_id: task.parent_request_id,
      is_recycled: true
    })

    recycledCount++
  }

  return NextResponse.json({ success: true, message: 'Recycling complete', recycledCount })
}
