import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { AiAgentControlPanel } from '@/components/staff/AiAgentControlPanel'

export default async function AgentControlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

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

  // Only admins or those with specific intelligence permissions should access this
  if (!permissions.isAdmin && !permissions.canViewIntelligence) {
    redirect(`/${locale}/staff/dashboard`)
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '24px' }}>
        {locale === 'ar' ? 'تحكم الذكاء الاصطناعي (AI Agent)' : 'AI Agent Control Center'}
      </h1>
      <AiAgentControlPanel isRTL={isRTL} />
    </div>
  )
}
