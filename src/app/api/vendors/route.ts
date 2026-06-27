import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getAllVendors, createVendor } from '@/lib/dal/vendors'

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

export async function GET() {
  try {
    const access = await requireVendorAccess()
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendors = await getAllVendors()
    return NextResponse.json({ vendors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireVendorAccess()
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { display_name, commercial_reg_number, tax_card_number, whatsapp_number,
            governorate, area, notes, portal_enabled, portal_email, specialization_ids } = body

    if (!display_name) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    const vendor = await createVendor({
      display_name,
      commercial_reg_number,
      tax_card_number,
      whatsapp_number,
      governorate,
      area,
      notes,
      portal_enabled,
      portal_email,
      specialization_ids: specialization_ids || []
    })

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
