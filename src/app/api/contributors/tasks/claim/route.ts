import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const { taskId } = body || {}
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
  }

  // 3. Fetch authenticated contributor profile
  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .single()

  if (contributorError || !contributor || contributor.status !== 'approved') {
    return NextResponse.json({ error: 'Contributor not approved' }, { status: 403 })
  }

  // 4. Atomic Task Claim via PostgreSQL RPC
  // Enforces hierarchical row locking (contributor -> platform_tasks),
  // stale claim expiration, atomic state transition, and unique constraint defense.
  // Eliminates client-side TOCTOU race conditions and manual rollback failure modes.
  const { data: rpcRes, error: rpcError } = await (supabase as any).rpc('fn_claim_platform_task', {
    p_task_id: taskId,
    p_contributor_id: contributor.id,
  })

  if (rpcError) {
    return NextResponse.json({ error: 'Failed to claim task' }, { status: 500 })
  }

  if (!rpcRes?.success) {
    const code = rpcRes?.code
    const errorMsg = rpcRes?.error || 'Failed to claim task'

    switch (code) {
      case 'INVALID_INPUT':
        return NextResponse.json({ error: errorMsg, code }, { status: 400 })
      case 'CONTRIBUTOR_NOT_FOUND':
        return NextResponse.json({ error: errorMsg, code }, { status: 404 })
      case 'CONTRIBUTOR_NOT_APPROVED':
      case 'CONTRIBUTOR_IDENTITY_MISMATCH':
        return NextResponse.json({ error: errorMsg, code }, { status: 403 })
      case 'ALREADY_HAVE_ACTIVE_TASK':
        return NextResponse.json({ error: errorMsg, code }, { status: 400 })
      case 'TASK_NOT_FOUND':
        return NextResponse.json({ error: errorMsg, code }, { status: 404 })
      case 'TASK_NOT_AVAILABLE':
        return NextResponse.json({ error: errorMsg, code }, { status: 409 })
      default:
        return NextResponse.json({ error: errorMsg, code }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, claim: rpcRes.claim })
}
