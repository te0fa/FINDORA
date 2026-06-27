// src/app/[locale]/staff/intelligence/ai/page.tsx
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { getAIAgentConfigsAdmin, getAICopilotRunsAdmin, getAIUsageSummaryAdmin } from '@/lib/dal/ai-control'
import { AIControlCenter } from '@/components/staff/ai/AIControlCenter'

export default async function AIControlCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`)

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.isAdmin) {
    return (
      <div className="staff-error-page">
         <h1>{isRTL ? 'غير مسموح' : 'Access Denied'}</h1>
         <p>{isRTL ? 'هذه الصفحة متاحة للمديرين فقط.' : 'This page is only available for administrators.'}</p>
      </div>
    )
  }

  const [configs, runs, summary] = await Promise.all([
    getAIAgentConfigsAdmin(),
    getAICopilotRunsAdmin(30),
    getAIUsageSummaryAdmin()
  ])

  const envStatus = {
    ai_enabled: process.env.AI_ENABLED === 'true',
    ai_provider: process.env.AI_PROVIDER || 'openai',
    has_ai_key: !!process.env.AI_API_KEY,
    has_gemini_key: !!process.env.GEMINI_API_KEY,
    has_tavily_key: !!process.env.TAVILY_API_KEY,
    has_brave_key: !!process.env.BRAVE_SEARCH_API_KEY
  }

  return (
    <main className="page-container animate-in" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="page-header">
        <h1 className="page-title">{dict.ai_control.page_title}</h1>
        <p className="page-subtitle">{dict.ai_control.page_subtitle}</p>
      </header>

      <AIControlCenter 
        configs={configs}
        runs={runs}
        summary={summary}
        envStatus={envStatus}
        dict={dict}
        isRTL={isRTL}
      />
    </main>
  )
}
