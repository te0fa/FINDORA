import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient() as any

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse request
  const body = await request.json()
  const { claimId, submissionData } = body
  if (!claimId || !submissionData) {
    return NextResponse.json({ error: 'Missing claimId or submissionData' }, { status: 400 })
  }

  // 3. Fetch contributor
  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .single()

  if (contributorError || !contributor || contributor.status !== 'approved') {
    return NextResponse.json({ error: 'Contributor not approved' }, { status: 403 })
  }

  // 4. Verify claim ownership and status
  const { data: claim, error: claimError } = await supabase
    .from('task_claims')
    .select('id, status, expires_at, task_id')
    .eq('id', claimId)
    .eq('contributor_id', contributor.id)
    .single()

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  if (claim.status !== 'in_progress') {
    return NextResponse.json({ error: `Cannot submit. Status is ${claim.status}` }, { status: 400 })
  }

  // 5. Expiration Check
  if (new Date() > new Date(claim.expires_at)) {
    // Automatically fail it
    await supabase.from('task_claims').update({ status: 'expired' }).eq('id', claimId)
    await supabase.from('platform_tasks').update({ status: 'open' }).eq('id', claim.task_id)
    return NextResponse.json({ error: 'Task time limit expired' }, { status: 400 })
  }

  // 6. Submit the task
  const { error: updateError } = await supabase
    .from('task_claims')
    .update({
      status: 'submitted',
      submission_data: submissionData,
      submitted_at: new Date().toISOString()
    })
    .eq('id', claimId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
