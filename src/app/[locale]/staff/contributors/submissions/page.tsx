import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QualityReviewClient from '@/components/staff/QualityReviewClient'

export const metadata = {
  title: 'Quality Review — FINDORA HR',
}

export default async function QualityReviewPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch pending submissions along with contributor details
  const { data: pendingSubmissions } = await (supabase
    .from('contributor_submissions') as any)
    .select(`
      id, 
      submission_type, 
      price_reported, 
      details, 
      created_at,
      contributor:contributors(full_name, role)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(30)

  // Fallback mock data if empty (for UI development visibility)
  let displaySubs = pendingSubmissions || []
  if (displaySubs.length === 0) {
    displaySubs = [
      {
        id: 'mock-sub-1',
        submission_type: 'price_report',
        price_reported: 25000,
        details: {
          product_name: 'Samsung TV 55 Inch Smart',
          notes: 'Seen at Carrefour Maadi branch',
          ai_analysis: { confidence_score: 92, flags: [] }
        },
        created_at: new Date().toISOString(),
        contributor: { full_name: 'Ahmed Y.', role: 'field_scout' }
      },
      {
        id: 'mock-sub-2',
        submission_type: 'vendor_offer',
        price_reported: 120,
        details: {
          product_name: 'Wireless Mouse Logitech',
          notes: 'Special offer till Friday',
          ai_analysis: { confidence_score: 40, flags: ['Suspiciously extreme price'] }
        },
        created_at: new Date().toISOString(),
        contributor: { full_name: 'Sara M.', role: 'store_insider' }
      }
    ]
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {locale === 'ar' ? 'مراجعة بيانات السوق' : 'Market Data Quality Review'}
        </h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' 
            ? 'قم بمراجعة الأسعار والعروض المرفوعة من المساهمين للموافقة عليها وصرف النقاط بناءً على توصيات الـ AI.' 
            : 'Review prices and offers submitted by contributors to approve and disburse points based on AI recommendations.'}
        </p>
      </div>

      <QualityReviewClient pendingSubmissions={displaySubs} locale={locale} />
    </div>
  )
}
