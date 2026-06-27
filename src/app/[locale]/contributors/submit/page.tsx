import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupplySubmissionClient from '@/components/contributors/SupplySubmissionClient'

export const metadata = {
  title: 'Submit Market Data — FINDORA',
}

export default async function SupplySubmissionPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Fetch contributor profile
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('id, role, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!contributor || contributor.status !== 'active') {
    redirect(`/${locale}/contributors/apply`)
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,12%)] px-4 py-20">
      <div className="mx-auto max-w-xl text-center mb-10">
        <h1 className="text-3xl font-extrabold text-white">
          {locale === 'ar' ? 'إضافة بيانات للسوق' : 'Contribute to the Market'}
        </h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' 
            ? 'ارفع أسعار، عروض، أو روابط منتجات ليتم مراجعتها وصرف النقاط بناءً على دورك.' 
            : 'Submit prices, offers, or product links to be reviewed for points based on your role.'}
        </p>
      </div>

      <SupplySubmissionClient locale={locale} role={contributor.role} />
    </div>
  )
}
