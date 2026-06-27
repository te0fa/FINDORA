import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createSpecialization, getAllSpecializations } from '@/lib/dal/specializations'

async function guard(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = getStaffUiPermissions(staff)
  if (!perms.isAdmin && !perms.canManageVendors) return { error: 'Forbidden', status: 403 }
  return { perms, staff }
}

export async function GET(req: NextRequest) {
  const g = await guard(req)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  try {
    const data = await getAllSpecializations()
    return NextResponse.json({ specializations: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(req)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  try {
    const body = await req.json()
    const { name_en, name_ar, parent_id, display_order, slug } = body
    if (!name_en || !name_ar) return NextResponse.json({ error: 'name_en and name_ar are required' }, { status: 400 })
    // Auto-generate slug if not provided
    const finalSlug = slug || name_en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
    const result = await createSpecialization({ slug: finalSlug, name_en, name_ar, parent_id: parent_id || null, display_order: display_order ?? 0 })
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
