import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getVendorById, getVendorSystemMessages, getVendorAuditLog } from '@/lib/dal/vendors'
import VendorDetailClient from './VendorDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params
  const vendor = await getVendorById(id).catch(() => null)
  return { title: vendor ? `${vendor.display_name} — Findora Staff` : 'مورد — Findora Staff' }
}

export default async function VendorDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canManageVendors) redirect(`/${locale}/staff/dashboard`)

  const [vendor, messages, auditLog] = await Promise.all([
    getVendorById(id),
    getVendorSystemMessages(id),
    getVendorAuditLog(id),
  ])

  if (!vendor) notFound()

  return (
    <VendorDetailClient
      vendor={vendor}
      messages={messages}
      auditLog={auditLog}
      locale={locale}
    />
  )
}
