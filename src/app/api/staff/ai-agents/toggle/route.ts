import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { updateAIAgentConfigAdmin } from '@/lib/dal/ai-control'

export async function POST(request: Request) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const staff = await getStaffMemberByAuthUserId(user.id)
    if (!staff || !staff.is_active) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageAI) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { agent_code, enabled } = await request.json()

    if (!agent_code || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await updateAIAgentConfigAdmin({ agent_code, enabled })

    return NextResponse.json({ success: true, agent_code, enabled })
  } catch (err: any) {
    // log.error('[AGENT_TOGGLE]', err)
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
