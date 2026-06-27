import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processReward } from '@/lib/contributors/wallet'
import { handleFirstTaskWin, updateDailyStreak } from '@/lib/contributors/gamification'

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

  // For this MVP, let admin or owner or specific reviewers do this
  if (!staff || !['admin', 'owner', 'reviewer'].includes(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse request
  const body = await request.json()
  const { claimId, action, notes } = body // action = 'approve' | 'reject'

  if (!claimId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  // 3. Fetch claim and associated task details
  type ClaimRow = {
    id: string
    task_id: string
    contributor_id: string
    status: string
    platform_tasks: {
      base_reward_egp: number
      base_reward_points: number
      title_en: string
      title_ar: string
    }
    [key: string]: unknown
  }
  const { data: claimData, error: claimError } = await supabase
    .from('task_claims')
    .select('*, platform_tasks(*)')
    .eq('id', claimId)
    .maybeSingle()
  const claim = claimData as ClaimRow | null

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  if (claim.status !== 'submitted') {
    return NextResponse.json({ error: `Cannot review claim in status: ${claim.status}` }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // 4. Update the claim status
  const { error: updateError } = await (supabase
    .from('task_claims') as any)
    .update({
      status: newStatus,
      staff_notes: notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by_staff_id: staff.id
    })
    .eq('id', claimId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
  }

  // Also update the underlying platform_task
  if (action === 'approve') {
    await (supabase.from('platform_tasks') as any).update({ status: 'completed' }).eq('id', claim.task_id)
  } else {
    // If rejected, the task becomes open again for someone else
    await (supabase.from('platform_tasks') as any).update({ status: 'open' }).eq('id', claim.task_id)
  }

  // 5. Close the GAME LOOP if approved
  if (action === 'approve') {
    const task = claim.platform_tasks

    // A. Trigger Wallet Reward Processing
    try {
      await processReward({
        contributorId: claim.contributor_id,
        actionType: 'task_reward',
        baseAmountEgp: Number(task.base_reward_egp || 0),
        baseAmountPoints: Number(task.base_reward_points || 0),
        referenceType: 'task_claim' as any,
        referenceId: claim.id,
        descriptionEn: `Task Completed: ${task.title_en}`,
        descriptionAr: `إكمال مهمة: ${task.title_ar}`
      })
    } catch (e) {
      // log.error('Reward processing failed:', e)
      // Note: We don't fail the API call if reward fails, but we should log it
    }

    // B. Trigger Streaks
    await updateDailyStreak(claim.contributor_id)

    // C. Check for First Win
    await handleFirstTaskWin(claim.contributor_id)

    // D. Trust Score Bonus (e.g., +2 points for good task)
    // Could build a more dynamic system later
  }

  return NextResponse.json({ success: true, newStatus })
}
