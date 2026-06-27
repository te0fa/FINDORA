import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getRequestDeleteBackupAdmin } from '@/lib/dal/archive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; backup_id: string }> }
) {
  const { locale, backup_id } = await params

  // 1. Authenticate and check permissions
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin) {
    return new NextResponse('Forbidden: Admin access required', { status: 403 })
  }

  try {
    // 2. Fetch backup
    const backup = await getRequestDeleteBackupAdmin(backup_id)
    if (!backup) {
      return new NextResponse('Backup not found', { status: 404 })
    }

    // 3. Return as JSON attachment
    const filename = `backup_${backup.request_code}_${new Date(backup.created_at).toISOString().split('T')[0]}.json`
    
    return new NextResponse(JSON.stringify(backup.backup_json, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[BACKUP_DOWNLOAD_ERROR]', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
