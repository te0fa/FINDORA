import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getSpecializationsTree } from '@/lib/dal/specializations'
import VendorOnboardingForm from './VendorOnboardingForm'

export const metadata = { title: 'Register Vendor | تسجيل مورد — Findora Staff' }

export default async function NewVendorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canManageVendors) redirect(`/${locale}/staff/dashboard`)

  const specializationsTree = await getSpecializationsTree()

  return <VendorOnboardingForm locale={locale} specializationsTree={specializationsTree} />
}
