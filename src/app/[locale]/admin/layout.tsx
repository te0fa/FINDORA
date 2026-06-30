/**
 * src/app/[locale]/admin/layout.tsx
 * 
 * Server-side layout that guards the entire /admin route segment.
 * Only staff members with canManageFeatureFlags permission may access
 * (covers admin, owner, and ai_manager roles).
 *
 * Pattern mirrors src/app/[locale]/staff/layout.tsx
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Not staff or doesn't have the right role → redirect to home
  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember) {
    redirect(`/${locale}`)
  }

  const permissions = getStaffUiPermissions(staffMember)

  // Only admin, owner, and ai_manager can manage feature flags
  if (!permissions.canManageAI && !permissions.isAdmin) {
    redirect(`/${locale}/staff/hub`)
  }

  return <>{children}</>
}
