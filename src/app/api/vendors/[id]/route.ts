import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getVendorById, updateVendor } from '@/lib/dal/vendors'

async function requireVendorAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff) return null
  const perms = getStaffUiPermissions(staff)
  if (!perms.canManageVendors) return null
  return { staff, perms }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireVendorAccess()
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const vendor = await getVendorById(id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    return NextResponse.json({ vendor })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireVendorAccess()
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    const vendor = await updateVendor(id, body)
    return NextResponse.json({ vendor })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
