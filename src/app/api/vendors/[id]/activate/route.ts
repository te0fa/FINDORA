import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { activateVendor } from '@/lib/dal/vendors'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const staff = await getStaffMemberByAuthUserId(user.id)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageVendors) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    await activateVendor(id, staff.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
