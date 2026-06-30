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

  if (!staff || !['admin', 'owner', 'hr_manager'].includes(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse request
  const body = await request.json()
  const { walletId, isFrozen } = body

  if (!walletId || typeof isFrozen !== 'boolean') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  // 3. Execute
  const { error } = await (supabase
    .from('contributor_wallets') as any)
    .update({ is_frozen: isFrozen })
    .eq('id', walletId)

  if (error) {
    // log.error('[RiskEngine API] Freeze error:', error.message)
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
