import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient() as any

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse request
  const body = await request.json()
  const { taskId } = body
  if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })

  // 3. Fetch contributor
  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .single()

  if (contributorError || !contributor || contributor.status !== 'approved') {
    return NextResponse.json({ error: 'Contributor not approved' }, { status: 403 })
  }

  // 4. Concurrency Check: Ensure no active task
  const { data: activeClaim } = await supabase
    .from('task_claims')
    .select('id')
    .eq('contributor_id', contributor.id)
    .eq('status', 'in_progress')
    .single()

  if (activeClaim) {
    return NextResponse.json({ error: 'You already have an active task' }, { status: 400 })
  }

  // 5. Task Availability Check & Lock
  const { data: task, error: taskError } = await supabase
    .from('platform_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('status', 'open')
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task is no longer available' }, { status: 404 })
  }

  // Calculate expiration
  const expiresAt = new Date(Date.now() + (task.time_limit_minutes * 60000)).toISOString()

  // 6. Transaction: Claim the task
  // Since we don't have RPC for transaction here, we update the task and insert the claim.
  // Using an Rpc would be safer against race conditions, but this is okay for MVP.
  
  const { error: updateError } = await supabase
    .from('platform_tasks')
    .update({ status: 'claimed' })
    .eq('id', taskId)
    .eq('status', 'open') // Optimistic locking

  if (updateError) {
    return NextResponse.json({ error: 'Task was claimed by someone else' }, { status: 409 })
  }

  const { data: claimData, error: claimError } = await supabase
    .from('task_claims')
    .insert({
      task_id: taskId,
      contributor_id: contributor.id,
      status: 'in_progress',
      expires_at: expiresAt
    })
    .select()
    .single()

  if (claimError) {
    // Rollback task status if claim fails (rare)
    await supabase.from('platform_tasks').update({ status: 'open' }).eq('id', taskId)
    return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 })
  }

  return NextResponse.json({ success: true, claim: claimData })
}
