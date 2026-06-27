import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { 
  getAIFeaturesConfig, 
  getAIFeatureLogs, 
  getAIFeatureUsageSummary, 
  getStaffListWithRoles 
} from '@/lib/dal/ai-control'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import AIControlPanel from '@/components/staff/ai/AIControlPanel'

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AIControlPage({ params }: PageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)

  // 1. Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // 2. Resolve staff profile & permissions
  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.canManageAI) {
    // Standard access denial (Staff but not Admin/AI Manager)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {locale === 'ar' ? 'غير مصرح لك بالدخول' : 'Access Denied'}
        </h2>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
          {locale === 'ar' 
            ? 'هذه الصفحة مخصصة لمدراء الذكاء الاصطناعي والمسؤولين فقط.' 
            : 'This page is restricted to AI Managers and Administrators.'}
        </p>
      </div>
    )
  }

  // 3. Fetch data
  const features = await getAIFeaturesConfig()
  const summary = await getAIFeatureUsageSummary()
  const logs = await getAIFeatureLogs(50)
  const staffList = await getStaffListWithRoles()
  const isAdmin = staffMember.staff_role === 'admin'

  return (
    <AIControlPanel 
      features={features}
      logs={logs}
      summary={summary}
      staffList={staffList}
      isAdmin={isAdmin}
      dict={dict.ai_control_panel}
      locale={locale}
    />
  )
}
