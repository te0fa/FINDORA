import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentSettingsClient from './PaymentSettingsClient'

export default async function PaymentSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.isAdmin) {
    redirect(`/${locale}/staff/dashboard`)
  }

  return (
    <main className="page-container pb-20">
      <PaymentSettingsClient locale={locale} dict={dict} />
    </main>
  )
}
