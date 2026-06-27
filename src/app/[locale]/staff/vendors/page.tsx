import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getAllVendors } from '@/lib/dal/vendors'
import VendorDashboardClient from './VendorDashboardClient'

export const metadata = { title: 'إدارة الموردين | Vendor Management — Findora Staff' }

export default async function VendorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canManageVendors) redirect(`/${locale}/staff/dashboard`)

  const vendors = await getAllVendors()

  return <VendorDashboardClient vendors={vendors} locale={locale} isAdmin={perms?.isAdmin} />
}
