import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HRReviewClient from '@/components/staff/HRReviewClient'

export const metadata = {
  title: 'Contributors Review — FINDORA HR',
}

export default async function HRContributorsPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch pending applications
  // For the sake of this UI demonstration, if there are no real pending rows, 
  // we'll inject a mock one so the HR flow is visible.
  const { data: pendingApps } = await (supabase
    .from('contributors') as any)
    .select('id, full_name, role, status, created_at, phone, city')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  let displayApps: any[] = pendingApps || []

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

      <HRReviewClient pendingApplications={displayApps} locale={locale} />
    </div>
  )
}
