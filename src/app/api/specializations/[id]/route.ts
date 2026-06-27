import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { updateSpecialization, archiveSpecialization, hardDeleteSpecialization } from '@/lib/dal/specializations'

async function guard(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = getStaffUiPermissions(staff)
  if (!perms.isAdmin && !perms.canManageVendors) return { error: 'Forbidden', status: 403 }
  return { perms, staff }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: (g as any).status })
  try {
    const { id } = await params
    const body = await req.json()
    const result = await updateSpecialization(id, body)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: (g as any).status })
  // Hard delete — admin only
  if (!(g as any).perms.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const { id } = await params
    await hardDeleteSpecialization(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
