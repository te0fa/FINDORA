import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staffData } = await supabase
    .from('staff_members')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const staff = staffData as { id: string; role: string } | null

  if (!staff || !['admin', 'owner'].includes(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse request
  const body = await request.json()
  const { 
    taskType, titleEn, titleAr, descriptionEn, descriptionAr, 
    requiredRole, minLevel, minTrustScore, 
    baseRewardEgp, baseRewardPoints, timeLimitMinutes, priority, locationData 
  } = body

  // 3. Insert task
  const { data: task, error } = await (supabase
    .from('platform_tasks') as any)
    .insert({
      task_type: taskType || 'market_intel',
      title_en: titleEn,
      title_ar: titleAr,
      description_en: descriptionEn,
      description_ar: descriptionAr,
      required_role: requiredRole || null,
      min_level: minLevel || 1,
      min_trust_score: minTrustScore || 0,
      base_reward_egp: baseRewardEgp || 0,
      base_reward_points: baseRewardPoints || 0,
      time_limit_minutes: timeLimitMinutes || 60,
      priority: priority || 0,
      location_data: locationData || {},
      status: 'open',
      created_by_staff_id: staff.id
    })
    .select()
    .single()

  if (error) {
    // log.error('Task creation error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  return NextResponse.json({ success: true, task })
}
