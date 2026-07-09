import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getSiteContactSettingsAction } from './actions'
import SiteSettingsClient from './SiteSettingsClient'

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) {
    redirect(`/${locale}`)
  }

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageCommunications) {
    redirect(`/${locale}/staff/hub`)
  }

  const initialSettings = await getSiteContactSettingsAction()

  return (
    <div className="container mx-auto px-4 py-8">
      <SiteSettingsClient locale={locale} initialSettings={initialSettings} />
    </div>
  )
}
