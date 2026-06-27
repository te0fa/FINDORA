import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { searchVendors } from '@/lib/dal/vendors'

export async function GET(req: NextRequest) {
  try {
    const q    = req.nextUrl.searchParams.get('q') || ''
    const spec = req.nextUrl.searchParams.get('spec') || undefined

    if (!q.trim()) return NextResponse.json({ vendors: [] })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staff = await getStaffMemberByAuthUserId(user.id)
    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageVendors && !perms.canManageDeals && !perms.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const vendors = await searchVendors(q, spec, 20)
    return NextResponse.json({ vendors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
