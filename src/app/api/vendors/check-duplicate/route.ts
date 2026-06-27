import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { findSimilarVendors } from '@/lib/dal/vendors'

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name') || ''
    if (!name.trim()) return NextResponse.json({ similar: [] })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staff = await getStaffMemberByAuthUserId(user.id)
    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageVendors && !perms.canManageDeals && !perms.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const similar = await findSimilarVendors(name)
    return NextResponse.json({ similar })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
