import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HRReviewClient from '@/components/staff/HRReviewClient'

export const metadata = {
  title: 'Contributors Review — FINDORA HR',
}

export default async function HRContributorsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch pending applications
  const { data: pendingApps } = await (supabase
    .from('contributors') as any)
    .select('id, full_name, role, status, created_at, phone_number, governorate')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  let displayApps: any[] = (pendingApps || []).map((app: any) => ({
    id: app.id,
    full_name: app.full_name,
    role: app.role,
    status: app.status,
    created_at: app.created_at,
    phone: app.phone_number,
    city: app.governorate
  }))

  // Insert mock data if empty (for preview purposes during development)
  if (displayApps.length === 0) {
    displayApps = [
      {
        id: 'mock-uuid-1',
        full_name: 'Ahmed Youssef',
        role: 'field_scout',
        status: 'pending',
        created_at: new Date().toISOString(),
        phone: '01012345678',
        city: 'Cairo'
      },
      {
        id: 'mock-uuid-2',
        full_name: 'Sara Mahmoud',
        role: 'store_insider',
        status: 'pending',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        phone: '01198765432',
        city: 'Alexandria'
      }
    ]
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            {locale === 'ar' ? 'مراجعة المتقدمين (HR)' : 'Applicant Review (HR)'}
          </h1>
          <p className="mt-2 text-[hsl(220,10%,60%)]">
            {locale === 'ar' 
              ? 'قم بمراجعة طلبات الانضمام بناءً على تحليل الذكاء الاصطناعي والمستندات المرفقة.' 
              : 'Review join requests based on AI analysis and uploaded documents.'}
          </p>
        </div>
        <Link 
          href={`/${locale}/staff/contributors/economy`} 
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 transition shadow-[0_4px_16px_rgba(99,102,241,0.25)]"
        >
          {locale === 'ar' ? '⚙️ إعدادات الحملة والاقتصاد' : '⚙️ Campaign & Economy Settings'}
        </Link>
      </div>

      <HRReviewClient pendingApplications={displayApps} locale={locale} />
    </div>
  )
}
