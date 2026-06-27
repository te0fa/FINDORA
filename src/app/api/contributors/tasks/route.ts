import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEconomyConfig } from '@/lib/contributors/config'

export async function GET(request: Request) {
  const supabase = await createClient() as any

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Fetch contributor state (role, level, trust_score)
  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select(`
      id, role, trust_score, status,
      contributor_levels!inner(level_number)
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (contributorError || !contributor) {
    return NextResponse.json({ error: 'Contributor not found' }, { status: 404 })
  }

  if (contributor.status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
  }

  const levelNumber = Array.isArray(contributor.contributor_levels) 
    ? contributor.contributor_levels[0]?.level_number 
    : (contributor.contributor_levels as any)?.level_number || 1

  // 3. Fetch active campaigns to calculate dynamic multiplier for UI
  const { data: campaigns } = await supabase
    .from('bonus_campaigns')
    .select('multiplier_boost')
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .or(`target_role.is.null,target_role.eq.${contributor.role}`)

  const campaignBoost = campaigns?.reduce((sum: number, c: any) => sum + Number(c.multiplier_boost), 0) || 0

  // Base Multiplier Math for UI display
  const roleMultipliers = (await getEconomyConfig('role_multipliers')) || { field_scout: 1.2, store_insider: 1.0, casual: 0.8 }
  const roleMultiplier = roleMultipliers[contributor.role] || 1.0
  const trustScoreBonus = 1.0 + ((contributor.trust_score - 50) / 100)
  
  // Note: For simplicity in the feed, we might not factor in stabilizers or streaks here, 
  // or we can pass a 'base_effective_multiplier' to the frontend.
  const baseEffectiveMultiplier = (roleMultiplier * trustScoreBonus) + campaignBoost

  // 4. Fetch Available Tasks (The Discovery Engine)
  const { data: tasks, error: tasksError } = await supabase
    .from('platform_tasks')
    .select(`*`)
    .eq('status', 'open')
    .lte('min_level', levelNumber)
    .lte('min_trust_score', contributor.trust_score)
    .or(`required_role.is.null,required_role.eq.${contributor.role}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (tasksError) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }

  // 5. Check if the user already has an active claim
  const { data: activeClaim } = await supabase
    .from('task_claims')
    .select(`*, platform_tasks(*)`)
    .eq('contributor_id', contributor.id)
    .eq('status', 'in_progress')
    .single()

  return NextResponse.json({
    tasks,
    activeClaim,
    baseEffectiveMultiplier
  })
}
