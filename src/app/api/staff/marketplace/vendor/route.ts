import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createVendor } from '@/lib/dal/marketplace'

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
    if (!perms.canManageVendors) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const business_name_en = formData.get('business_name_en') as string
    const business_name_ar = formData.get('business_name_ar') as string
    const contact_phone = formData.get('contact_phone') as string

    if (!business_name_en || !business_name_ar || !contact_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await createVendor({
      business_name_en,
      business_name_ar,
      contact_phone,
      status: 'active'
    })

    // Redirect back to the marketplace page (using the referer or hardcoded for now)
    return NextResponse.redirect(new URL('/en/staff/marketplace', request.url), 303)

  } catch (error: any) {
    // log.error('Error creating vendor:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
