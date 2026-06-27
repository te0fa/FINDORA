import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getSpecializationsTreeAdmin } from '@/lib/dal/specializations'
import SpecializationsManagerClient from './SpecializationsManagerClient'

export const metadata = { title: 'Specializations | التخصصات — Findora Staff' }

export default async function SpecializationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  // Accessible by admins and vendor_relations staff
  if (!perms?.isAdmin && !perms?.canManageVendors) redirect(`/${locale}/staff/dashboard`)

  const tree = await getSpecializationsTreeAdmin()

  return (
    <SpecializationsManagerClient
      locale={locale}
      isAdmin={perms?.isAdmin ?? false}
      initialTree={tree}
    />
  )
}
